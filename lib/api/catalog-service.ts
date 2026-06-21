import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function parseMoney(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function pagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageResult<T>(items: T[], page: number, limit: number, total: number) {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function normalizeProductData(data: any) {
  const stockQuantity = Number.isFinite(Number(data.stockQuantity)) ? Math.max(0, Math.round(Number(data.stockQuantity))) : 0;
  const categoryId = String(data.categoryId ?? "").trim();

  return {
    showcaseId: data.showcaseId || null,
    title: data.title,
    description: data.description,
    slug: data.slug || null,
    price: data.price,
    originalPrice: data.originalPrice || null,
    discountPrice: data.discountPrice || null,
    discountPercent: data.discountPercent ?? null,
    imageUrl: data.imageUrl || null,
    images: Array.isArray(data.images) && data.images.length > 0 ? data.images : Prisma.JsonNull,
    videoUrl: data.videoUrl || null,
    badge: data.badge || null,
    ctaLabel: data.ctaLabel || null,
    ctaHref: data.ctaHref || null,
    active: data.active ?? data.isActive ?? true,
    isActive: data.isActive ?? data.active ?? true,
    isFeatured: data.isFeatured ?? false,
    isAvailable: data.isAvailable ?? stockQuantity > 0,
    stockQuantity,
    stockStatus: data.stockStatus || (stockQuantity > 0 ? "in_stock" : "out_of_stock"),
    minOrder: data.minOrder ?? 1,
    maxOrder: data.maxOrder ?? null,
    weight: data.weight ?? null,
    length: data.length ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    salesCount: data.salesCount ?? 0,
    views: data.views ?? 0,
    wishlistCount: data.wishlistCount ?? 0,
    ratingAverage: data.ratingAverage ?? 0,
    ratingCount: data.ratingCount ?? 0,
    discountStartAt: data.discountStartAt ? new Date(data.discountStartAt) : null,
    discountEndAt: data.discountEndAt ? new Date(data.discountEndAt) : null,
    categoryId: categoryId || "general",
    manufactureYear: Number.isFinite(Number(data.manufactureYear)) ? Math.round(Number(data.manufactureYear)) : null,
    brand: data.brand || null,
    vendor: data.vendor || null,
    sku: data.sku || null,
    barcode: data.barcode || null,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    metaKeywords: data.metaKeywords || null,
    placement: data.placement || null,
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
    colorStock: data.colorStock === undefined ? Prisma.JsonNull : data.colorStock,
    sortOrder: data.sortOrder ?? 0,
  };
}

function dateRange(field: "createdAt" | "updatedAt", searchParams: URLSearchParams) {
  const exact = searchParams.get(field);
  const from = searchParams.get(`${field.replace("At", "")}From`);
  const to = searchParams.get(`${field.replace("At", "")}To`);
  const range: Record<string, Date> = {};

  if (exact) {
    const start = new Date(exact);
    const end = new Date(exact);
    if (Number.isFinite(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
  }

  if (from) {
    const parsed = new Date(from);
    if (Number.isFinite(parsed.getTime())) range.gte = parsed;
  }
  if (to) {
    const parsed = new Date(to);
    if (Number.isFinite(parsed.getTime())) range.lte = parsed;
  }

  return Object.keys(range).length > 0 ? { [field]: range } : {};
}

export function productWhere(searchParams: URLSearchParams, extra: Record<string, unknown> = {}) {
  const q = String(searchParams.get("q") ?? "").trim();
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const minPrice = minPriceParam === null || minPriceParam === "" ? NaN : Number(minPriceParam);
  const maxPrice = maxPriceParam === null || maxPriceParam === "" ? NaN : Number(maxPriceParam);
  const hasDiscount = searchParams.get("hasDiscount");
  const inStock = searchParams.get("inStock");
  const minRatingParam = searchParams.get("minRating");
  const minRating = minRatingParam === null || minRatingParam === "" ? NaN : Number(minRatingParam);
  const badge = String(searchParams.get("badge") ?? "").trim();
  const categoryId = String(searchParams.get("categoryId") ?? "").trim();
  const isActiveParam = searchParams.get("isActive");
  const isFeaturedParam = searchParams.get("isFeatured");
  const and: unknown[] = [];
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { badge: { contains: q, mode: "insensitive" as const } },
      ],
    });
  }
  if (hasDiscount === "true") {
    and.push({ OR: [{ discountPercent: { gt: 0 } }, { discountPrice: { not: null } }] });
  }
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    and.push({ price: { not: "" } });
  }

  return {
    ...extra,
    active: true,
    isActive: isActiveParam === null ? true : isActiveParam === "true",
    deletedAt: null,
    ...(inStock === "true" ? { stockQuantity: { gt: 0 } } : {}),
    ...(Number.isFinite(minRating) ? { ratingAverage: { gte: minRating } } : {}),
    ...(badge ? { badge } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(isFeaturedParam !== null ? { isFeatured: isFeaturedParam === "true" } : {}),
    ...dateRange("createdAt", searchParams),
    ...dateRange("updatedAt", searchParams),
    ...(and.length ? { AND: and } : {}),
  };
}

function productOrderBy(searchParams: URLSearchParams): Prisma.ProductOrderByWithRelationInput[] {
  const sort = searchParams.get("sort");
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const map: Record<string, Prisma.ProductOrderByWithRelationInput> = {
    cheapest: { price: "asc" },
    expensive: { price: "desc" },
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    bestseller: { salesCount: "desc" },
    mostDiscounted: { discountPercent: "desc" },
    topRated: { ratingAverage: "desc" },
    mostViewed: { views: "desc" },
    mostWished: { wishlistCount: "desc" },
    biggestDiscount: { discountPercent: "desc" },
  };

  if (sort && map[sort]) return [map[sort], { createdAt: "desc" }];
  if (sortBy) return [{ [sortBy]: sortOrder } as Prisma.ProductOrderByWithRelationInput, { createdAt: "desc" }];
  return [{ sortOrder: "asc" }, { createdAt: "desc" }];
}

export async function searchProducts(searchParams: URLSearchParams, extra: Record<string, unknown> = {}) {
  const { page, limit, skip } = pagination(searchParams);
  const where = productWhere(searchParams, extra);
  const [rawItems, rawTotal] = await Promise.all([
    prisma.product.findMany({
      where: where as any,
      orderBy: productOrderBy(searchParams),
      skip,
      take: limit,
    }),
    prisma.product.count({ where: where as any }),
  ]);

  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const minPrice = minPriceParam === null || minPriceParam === "" ? NaN : Number(minPriceParam);
  const maxPrice = maxPriceParam === null || maxPriceParam === "" ? NaN : Number(maxPriceParam);
  const filtered = rawItems.filter((item: { discountPrice: string | null; price: string }) => {
    const price = parseMoney(item.discountPrice || item.price);
    if (Number.isFinite(minPrice) && price < minPrice) return false;
    if (Number.isFinite(maxPrice) && price > maxPrice) return false;
    return true;
  });

  return pageResult(filtered, page, limit, rawTotal);
}

export async function getOrCreateActiveCart(userId: number) {
  let profile = await prisma.customerProfile.findFirst({ where: { userId } });
  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    profile = await prisma.customerProfile.create({
      data: {
        userId,
        firstName: user?.name || "User",
        lastName: "",
        nationalId: `user-${userId}`,
        phone: "",
      },
    });
  }

  return prisma.cart.upsert({
    where: { profileId_status: { profileId: profile.id, status: "active" } },
    update: {},
    create: { profileId: profile.id, status: "active" },
    include: { items: { orderBy: { createdAt: "asc" } }, profile: true },
  });
}

export function cartItemDto(item: any) {
  return {
    id: item.id,
    productId: item.productId,
    title: item.title,
    description: item.description,
    price: item.price,
    originalPrice: item.originalPrice,
    discountPrice: item.discountPrice,
    discountPercent: item.discountPercent,
    imageUrl: item.imageUrl,
    selectedColor: item.selectedColor,
    quantity: item.quantity,
  };
}
