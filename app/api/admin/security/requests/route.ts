import { z } from "zod";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reviewSchema = z.object({
  id: z.string().min(1),
  approved: z.boolean(),
});

async function requireSuperadmin(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;
  if (auth.user.username !== "09176991556" || auth.user.role !== "superadmin") {
    return { ok: false as const, response: apiFail("superadmin required", 403) };
  }
  return auth;
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireSuperadmin(request);
  if (!auth.ok) return auth.response;

  try {
    const requests = await prisma.adminAccessRequest.findMany({
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { id: true, email: true, username: true, name: true, role: true } } },
    });
    return apiOk({ requests });
  } catch (error) {
    console.error("Admin access requests GET error:", error);
    return apiServerError();
  }
}

export async function PATCH(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireSuperadmin(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, reviewSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const status = parsed.data.approved ? "approved" : "rejected";
    const requestRecord = await prisma.adminAccessRequest.update({
      where: { id: parsed.data.id },
      data: { status },
    });
    await prisma.user.update({
      where: { id: requestRecord.userId },
      data: { role: parsed.data.approved ? "admin" : "user" },
    });
    return apiOk({ request: requestRecord });
  } catch (error) {
    console.error("Admin access requests PATCH error:", error);
    return apiServerError();
  }
}
