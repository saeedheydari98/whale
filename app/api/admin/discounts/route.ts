import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { readWithRetry } from "@/lib/api/read-retry";
import { DISCOUNT_AUDIENCES, issueDiscountCode, runDiscountRules } from "@/lib/api/discount-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return { ok: false as const, response: limited };
  return requireAdmin(request);
}

function validateRule(value: Record<string, unknown>) {
  const name = String(value.name ?? "").trim();
  const audienceType = DISCOUNT_AUDIENCES.includes(value.audienceType as (typeof DISCOUNT_AUDIENCES)[number])
    ? value.audienceType as (typeof DISCOUNT_AUDIENCES)[number]
    : null;
  const minimumValue = Math.round(Number(value.minimumValue));
  const lookbackDays = Math.round(Number(value.lookbackDays));
  const discountType = value.discountType === "free_shipping" ? "free_shipping" : "percentage";
  const percent = Math.round(Number(value.percent));
  const validDays = Math.round(Number(value.validDays));
  if (!name) return { ok: false as const, message: "نام کد تخفیف الزامی است." };
  if (!audienceType) return { ok: false as const, message: "گروه هدف نامعتبر است." };
  if (!Number.isFinite(lookbackDays) || lookbackDays < 1 || lookbackDays > 3650) return { ok: false as const, message: "بازه بررسی باید بین ۱ تا ۳۶۵۰ روز باشد." };
  if (audienceType !== "new_users" && (!Number.isFinite(minimumValue) || minimumValue < 1)) return { ok: false as const, message: "حداقل خرید باید بزرگ‌تر از صفر باشد." };
  if (!Number.isFinite(validDays) || validDays < 1 || validDays > 3650) return { ok: false as const, message: "اعتبار کد باید بین ۱ تا ۳۶۵۰ روز باشد." };
  if (discountType === "percentage" && (!Number.isFinite(percent) || percent < 1 || percent > 100)) return { ok: false as const, message: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد." };
  return {
    ok: true as const,
    data: { name, audienceType, minimumValue: audienceType === "new_users" ? 1 : minimumValue, lookbackDays, discountType, percent: discountType === "percentage" ? percent : null, validDays },
  };
}

export async function GET(request: Request) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  try {
    const [settings, rules, users] = await Promise.all([
      readWithRetry(() => prisma.commerceSetting.findUnique({ where: { id: 1 } })),
      readWithRetry(() => prisma.discountRule.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { discountCodes: true } } } })),
      readWithRetry(() => prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, username: true, email: true, walletBalance: true, profiles: { take: 1, select: { firstName: true, lastName: true, phone: true } } },
      })),
    ]);
    return apiOk({ settings: settings ?? { cashbackPercent: 0, postalShippingFee: 30000 }, rules, users });
  } catch (error) {
    console.error("Admin discounts GET error:", error);
    return apiServerError("دریافت تنظیمات تخفیف انجام نشد.");
  }
}

export async function POST(request: Request) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
    if (body.action === "run_rules") return apiOk({ result: await runDiscountRules() });
    if (body.action === "issue_manual") {
      const name = String(body.name ?? "").trim();
      const userId = Math.round(Number(body.userId));
      const type = body.discountType === "free_shipping" ? "free_shipping" : "percentage";
      const percent = Math.round(Number(body.percent));
      const validDays = Math.round(Number(body.validDays));
      if (!name) return apiFail("نام کد تخفیف الزامی است.", 400);
      if (!Number.isInteger(userId) || userId <= 0) return apiFail("کاربر نامعتبر است.", 400);
      if (!Number.isFinite(validDays) || validDays < 1 || validDays > 3650) return apiFail("مدت اعتبار نامعتبر است.", 400);
      if (type === "percentage" && (!Number.isFinite(percent) || percent < 1 || percent > 100)) return apiFail("درصد تخفیف نامعتبر است.", 400);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) return apiFail("کاربر پیدا نشد.", 404);
      return apiOk(await issueDiscountCode({ userId, name, type, percent, validDays }));
    }
    const parsed = validateRule(body);
    if (!parsed.ok) return apiFail(parsed.message, 400);
    const rule = await prisma.discountRule.create({ data: parsed.data });
    return apiOk({ rule });
  } catch (error) {
    console.error("Admin discounts POST error:", error);
    return apiServerError("ثبت تخفیف انجام نشد.");
  }
}

export async function PATCH(request: Request) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
    if (body.action === "settings") {
      const cashbackPercent = Math.round(Number(body.cashbackPercent));
      if (!Number.isFinite(cashbackPercent) || cashbackPercent < 0 || cashbackPercent > 100) return apiFail("درصد بازگشت وجه نامعتبر است.", 400);
      const settings = await prisma.commerceSetting.upsert({ where: { id: 1 }, update: { cashbackPercent }, create: { id: 1, cashbackPercent, postalShippingFee: 30000 } });
      return apiOk({ settings });
    }
    const id = String(body.id ?? "").trim();
    if (!id) return apiFail("کد تخفیف نامعتبر است.", 400);
    if (body.action === "update_rule") {
      const parsed = validateRule(body);
      if (!parsed.ok) return apiFail(parsed.message, 400);
      const exists = await prisma.discountRule.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return apiFail("کد تخفیف پیدا نشد.", 404);
      const [rule] = await prisma.$transaction([
        prisma.discountRule.update({
          where: { id },
          data: parsed.data,
          include: { _count: { select: { discountCodes: true } } },
        }),
        prisma.discountCode.updateMany({
          where: { ruleId: id, usedAt: null },
          data: {
            name: parsed.data.name,
            type: parsed.data.discountType,
            percent: parsed.data.percent,
          },
        }),
      ]);
      return apiOk({ rule });
    }
    const rule = await prisma.discountRule.update({ where: { id }, data: { active: body.active === true } });
    return apiOk({ rule });
  } catch (error) {
    console.error("Admin discounts PATCH error:", error);
    return apiServerError("ویرایش تخفیف انجام نشد.");
  }
}

export async function DELETE(request: Request) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  if (!id) return apiFail("کد تخفیف نامعتبر است.", 400);
  try {
    await prisma.discountRule.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (error) {
    console.error("Admin discounts DELETE error:", error);
    return apiServerError("حذف کد تخفیف انجام نشد.");
  }
}
