import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser, hashPassword, verifyPassword } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/api/validation";
import { changePasswordSchema } from "@/lib/api/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonBody(request, changePasswordSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!verifyPassword(parsed.data.currentPassword, user?.passwordHash)) {
      return apiFail("invalid current password", 403);
    }
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { passwordHash: hashPassword(parsed.data.password), refreshTokenHash: null },
    });
    return apiOk({ changed: true });
  } catch (error) {
    console.error("Change password error:", error);
    return apiServerError();
  }
}
