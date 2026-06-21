import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import { commentSchema } from "@/lib/api/schemas";
import { requireUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

async function canEdit(request: Request, commentId: string) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return { ok: false as const, response: apiFail("not found", 404) };
  if (auth.user.role !== "admin" && comment.userId !== auth.user.id) {
    return { ok: false as const, response: apiFail("forbidden", 403) };
  }
  return { ok: true as const, user: auth.user, comment };
}

export async function PUT(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const { id } = await context.params;
  const auth = await canEdit(request, id);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, commentSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const comment = await prisma.comment.update({ where: { id }, data: parsed.data });
    return apiOk({ comment });
  } catch (error) {
    console.error("Comment PUT error:", error);
    return apiServerError();
  }
}

export async function DELETE(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const { id } = await context.params;
  const auth = await canEdit(request, id);
  if (!auth.ok) return auth.response;

  try {
    await prisma.comment.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (error) {
    console.error("Comment DELETE error:", error);
    return apiServerError();
  }
}
