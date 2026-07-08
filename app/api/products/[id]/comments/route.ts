import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import { commentSchema } from "@/lib/api/schemas";
import { getAuthUser } from "@/lib/api/auth";
import { invalidateCatalogCache } from "@/lib/api/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const productId = Number(id);
    const authUser = await getAuthUser(request);
    const comments = await prisma.comment.findMany({
      where: { productId, active: true },
      orderBy: { createdAt: "desc" },
    });
    const [purchased, previousRating] = authUser
      ? await Promise.all([
          prisma.orderItem.findFirst({
            where: {
              productId,
              order: {
                userId: authUser.id,
                status: "paid",
              },
            },
            select: { id: true },
          }),
          prisma.comment.findFirst({
            where: {
              productId,
              userId: authUser.id,
              rating: { not: null },
            },
            select: { id: true },
          }),
        ])
      : [null, null];
    return apiOk({
      comments,
      isPurchased: Boolean(purchased),
      hasRated: Boolean(previousRating),
    });
  } catch (error) {
    console.error("Comments GET error:", error);
    return apiServerError();
  }
}

export async function POST(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, commentSchema);
  if (!parsed.ok) return parsed.response;
  const authUser = await getAuthUser(request);

  try {
    const { id } = await context.params;
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) return apiFail("not found", 404);

    if (parsed.data.rating) {
      if (!authUser) return apiFail("login required before rating", 401);
      const purchased = await prisma.orderItem.findFirst({
        where: {
          productId: product.id,
          order: {
            userId: authUser.id,
            status: "paid",
          },
        },
      });
      if (!purchased) return apiFail("purchase required before rating", 403);

      const previousRating = await prisma.comment.findFirst({
        where: {
          productId: product.id,
          userId: authUser.id,
          rating: { not: null },
        },
      });
      if (previousRating) return apiFail("rating already submitted", 409);
    }

    const comment = await prisma.comment.create({
      data: {
        productId: product.id,
        userId: authUser?.id ?? null,
        author: parsed.data.author || authUser?.name || authUser?.email || "Guest",
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
      await invalidateCatalogCache("comments.rating");
    }
    await invalidateCatalogCache("comments.create");
    return apiOk({ comment }, { status: 201 });
  } catch (error) {
    console.error("Comment POST error:", error);
    return apiServerError();
  }
}
