import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/api/auth";
import { toAdminSecurityData, upsertAdminSecurityLock } from "@/lib/api/admin-security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const SUPERADMIN_USERNAME = "09176991556";

async function requireSuperadmin(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;
  if (auth.user.username !== SUPERADMIN_USERNAME || auth.user.role !== "superadmin") {
    return { ok: false as const, response: apiFail("superadmin required", 403) };
  }
  return auth;
}

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireSuperadmin(request);
  if (!auth.ok) return auth.response;

  try {
    const security = await upsertAdminSecurityLock(true);
    return apiOk(toAdminSecurityData(security));
  } catch (error) {
    console.error("Admin security lock error:", error);
    return apiServerError();
  }
}
