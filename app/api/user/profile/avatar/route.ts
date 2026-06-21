import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/api/validation";
import { avatarSchema } from "@/lib/api/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonBody(request, avatarSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: { avatarUrl: parsed.data.avatarUrl },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });
    await prisma.customerProfile.updateMany({
      where: { userId: auth.user.id },
      data: { avatarUrl: parsed.data.avatarUrl },
    });
    return apiOk({ user });
  } catch (error) {
    console.error("Avatar update error:", error);
    return apiServerError();
  }
}
