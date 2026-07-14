import { apiFail } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/api/auth";
import { SUPERADMIN_PHONE } from "@/lib/auth-constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireSuperadmin(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;
  if (auth.user.username !== SUPERADMIN_PHONE || auth.user.role !== "superadmin") {
    return { ok: false as const, response: apiFail("فقط مدیر ارشد به این بخش دسترسی دارد.", 403) };
  }
  return auth;
}

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireSuperadmin(request);
  if (!auth.ok) return auth.response;

  return apiFail("کد امنیتی مدیریت غیرفعال شده است. دسترسی ادمین فقط با درخواست کاربر و تایید مدیر ارشد انجام می شود.", 410);
}
