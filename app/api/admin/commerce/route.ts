import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { readWithRetry } from "@/lib/api/read-retry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return { ok: false as const, response: limited };
  return requireAdmin(request);
}

export async function GET(request: Request) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  try {
    const settings = await readWithRetry(() => prisma.commerceSetting.findUnique({ where: { id: 1 } }));
    return apiOk({ settings: settings ?? { cashbackPercent: 0, postalShippingFee: 30000 } });
  } catch (error) {
    console.error("Commerce settings GET error:", error);
    return apiServerError();
  }
}

export async function PATCH(request: Request) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const cashbackPercent = Math.round(Number(body.cashbackPercent));
  if (!Number.isFinite(cashbackPercent) || cashbackPercent < 0 || cashbackPercent > 100) {
    return apiFail("درصد بازگشت وجه باید بین صفر تا صد باشد.", 400);
  }

  try {
    const settings = await prisma.commerceSetting.upsert({
      where: { id: 1 },
      update: { cashbackPercent },
      create: { id: 1, cashbackPercent, postalShippingFee: 30000 },
    });
    return apiOk({ settings });
  } catch (error) {
    console.error("Commerce settings PATCH error:", error);
    return apiServerError("ذخیره تنظیمات انجام نشد.");
  }
}
