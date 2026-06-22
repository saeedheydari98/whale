import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import { commentSchema } from "@/lib/api/schemas";
import { requireUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const comments = await prisma.comment.findMany({
      where: { productId: Number(id), active: true },
      orderBy: { createdAt: "desc" },
    });
    return apiOk({ comments });
  } catch (error) {
    console.error("Comments GET error:", error);
    return apiServerError();
  }
}

export async function POST(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, commentSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { id } = await context.params;
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) return apiFail("not found", 404);

    if (parsed.data.rating) {
      const purchased = await prisma.orderItem.findFirst({
        where: {
          productId: product.id,
          order: {
            userId: auth.user.id,
            status: "paid",
          },
        },
      });
      if (!purchased) return apiFail("purchase required before rating", 403);
    }

    const comment = await prisma.comment.create({
      data: {
        productId: product.id,
        userId: auth.user.id,
        author: parsed.data.author || auth.user.name || auth.user.email,
        content: parsed.data.content,
        rating: parsed.data.rating ?? null,
        active: parsed.data.active ?? true,
      },
    });
    if (parsed.data.rating) {
      const stats = await prisma.comment.aggregate({
        where: { productId: product.id, active: true, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await prisma.product.update({
        where: { id: product.id },
        data: {
          ratingAverage: stats._avg.rating ?? 0,
          ratingCount: stats._count.rating,
        },
      });
    }
    return apiOk({ comment }, { status: 201 });
  } catch (error) {
    console.error("Comment POST error:", error);
    return apiServerError();
  }
}
