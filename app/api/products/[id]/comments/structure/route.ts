import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { positiveIdSchema } from "@/lib/api/schemas";
import { validationError } from "@/lib/api/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const parsed = positiveIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return validationError(parsed.error);
  const productId = parsed.data;
  try {
    const groups = await prisma.comment.groupBy({ by: ["rating"], where: { productId, active: true }, _count: { _all: true } });
    return apiOk({ structure: {
      count: groups.reduce((total, group) => total + group._count._all, 0),
      ratings: groups.filter((group) => group.rating !== null).map((group) => ({ stars: group.rating, count: group._count._all })),
    } });
  } catch (error) {
    console.error("Comment structure error:", error);
    return apiServerError("دریافت ساختار دیدگاه‌ها انجام نشد.");
  }
}
