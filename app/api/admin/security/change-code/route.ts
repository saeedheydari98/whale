import { z } from "zod";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/api/auth";
import { changeAdminSecurityCode, isValidAdminCode, toAdminSecurityData } from "@/lib/api/admin-security-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const changeCodeSchema = z.object({
  currentCode: z.string().trim().min(1),
  code: z.string().trim().min(1),
  confirmCode: z.string().trim().min(1),
});
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

  const parsed = await parseJsonBody(request, changeCodeSchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.code !== parsed.data.confirmCode) {
    return apiFail("admin code confirmation does not match", 400);
  }

  if (!isValidAdminCode(parsed.data.code)) {
    return apiFail("admin code must be at least 8 characters and include letters and numbers", 422);
  }

  try {
    const security = await changeAdminSecurityCode(parsed.data.currentCode, parsed.data.code);
    return apiOk(toAdminSecurityData(security));
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-current-admin-code") {
      return apiFail("current admin code is not correct", 401);
    }

    console.error("Admin security change code error:", error);
    return apiServerError();
  }
}
