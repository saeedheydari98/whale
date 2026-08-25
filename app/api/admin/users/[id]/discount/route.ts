import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { issueDiscountCode } from "@/lib/api/discount-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const userId = Number((await context.params).id);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const type = body.type === "free_shipping" ? "free_shipping" : "percentage";
  const percent = Math.round(Number(body.percent));
  const durationDays = Math.round(Number(body.durationDays));
  if (!name) return apiFail("نام کد تخفیف الزامی است.", 400);
  if (!Number.isInteger(userId) || userId <= 0) return apiFail("کاربر نامعتبر است.", 400);
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3650) {
    return apiFail("مدت اعتبار باید بین ۱ تا ۳۶۵۰ روز باشد.", 400);
  }
  if (type === "percentage" && (!Number.isFinite(percent) || percent < 1 || percent > 100)) {
    return apiFail("درصد تخفیف باید بین ۱ تا ۱۰۰ باشد.", 400);
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return apiFail("کاربر پیدا نشد.", 404);
    const result = await issueDiscountCode({ userId, name, type, percent, validDays: durationDays });
    return apiOk({ discountCode: result.discountCode });
  } catch (error) {
    console.error("Admin discount code create error:", error);
    return apiServerError("ساخت کد تخفیف انجام نشد.");
  }
}
