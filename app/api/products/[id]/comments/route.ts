import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { adminListQuerySchema, commentSchema } from "@/lib/api/schemas";
import { pageMetadata } from "@/lib/api/admin-list-pages";
import { getAuthUser } from "@/lib/api/auth";
import { invalidateCatalogCache } from "@/lib/api/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

function commentAuthorName(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text || text.includes("@")) continue;
    const firstName = text.split(/\s+/).find(Boolean);
    if (firstName) return firstName;
  }

  return "مهمان";
}

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) return apiFail("محصول نامعتبر است.", 400);
    const params = new URL(request.url).searchParams;
    if (params.has("limit")) {
      const parsed = adminListQuerySchema.safeParse(Object.fromEntries(params));
      if (!parsed.success) return validationError(parsed.error);
      const where = { productId, active: true };
      const [comments, total] = await Promise.all([
        prisma.comment.findMany({ where, take: parsed.data.limit, skip: parsed.data.offset, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, author: true, content: true, rating: true, createdAt: true } }),
        prisma.comment.count({ where }),
      ]);
      return apiOk({ comments, ...pageMetadata(total, parsed.data.offset, comments.length) });
    }
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
            select: { id: true, rating: true },
          }),
        ])
      : [null, null];
    return apiOk({
      comments,
      isPurchased: Boolean(purchased),
      hasRated: Boolean(previousRating),
      userRating: previousRating?.rating ?? null,
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
    if (!product) return apiFail("محصول پیدا نشد.", 404);

    if (parsed.data.rating) {
      if (!authUser) return apiFail("برای ثبت امتیاز وارد حساب شوید.", 401);
      const purchased = await prisma.orderItem.findFirst({
        where: {
          productId: product.id,
          order: {
            userId: authUser.id,
            status: "paid",
          },
        },
      });
      if (!purchased) return apiFail("امتیاز ستاره‌ای فقط برای خریداران فعال است.", 403);

      const previousRating = await prisma.comment.findFirst({
        where: {
          productId: product.id,
          userId: authUser.id,
          rating: { not: null },
        },
      });
      if (previousRating) return apiFail("شما قبلا به این محصول امتیاز داده‌اید.", 409);
    }

    const comment = await prisma.comment.create({
      data: {
        productId: product.id,
        userId: authUser?.id ?? null,
        author: commentAuthorName(parsed.data.author, authUser?.name, authUser?.username),
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
