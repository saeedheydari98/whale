import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matchesSearchQuery } from "@/lib/product-search";

export function parseMoney(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function pagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 20)));
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
  const categoryIds = Array.isArray(data.categoryIds)
    ? data.categoryIds.map((item: unknown) => String(item).trim()).filter(Boolean)
    : categoryId
      ? [categoryId]
      : ["general"];
  const showcaseIds = Array.isArray(data.showcaseIds)
    ? data.showcaseIds.map((item: unknown) => String(item).trim()).filter(Boolean)
    : data.showcaseId
      ? [String(data.showcaseId).trim()]
      : [];

  return {
    showcaseId: data.showcaseId || null,
    showcaseIds: showcaseIds.length > 0 ? showcaseIds : Prisma.JsonNull,
    title: data.title,
    description: String(data.description ?? "").trim(),
    slug: data.slug || null,
    price: data.price,
    originalPrice: data.originalPrice || null,
    discountPrice: data.discountPrice || null,
    discountPercent: data.discountPercent ?? null,
    imageUrl: data.imageUrl || null,
    images: Array.isArray(data.images) && data.images.length > 0 ? data.images : Prisma.JsonNull,
    videoUrl: data.videoUrl || null,
    badge: data.badge || null,
    ctaLabel: data.ctaLabel || "مشاهده محصول",
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
    categoryId: categoryIds[0] || "general",
    categoryIds: categoryIds.length > 0 ? categoryIds : Prisma.JsonNull,
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

function hasOwn(data: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function nullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nullableDate(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? new Date(text) : null;
}

export function normalizeProductPatchData(data: Record<string, unknown>): Prisma.ProductUncheckedUpdateInput {
  const patch: Prisma.ProductUncheckedUpdateInput = {};

  if (hasOwn(data, "showcaseId")) patch.showcaseId = nullableText(data.showcaseId);
  if (hasOwn(data, "showcaseIds")) {
    const showcaseIds = Array.isArray(data.showcaseIds)
      ? data.showcaseIds.map((item) => String(item).trim()).filter(Boolean)
      : [];
    patch.showcaseIds = showcaseIds.length > 0 ? showcaseIds : Prisma.JsonNull;
  }
  if (hasOwn(data, "title")) patch.title = String(data.title ?? "").trim();
  if (hasOwn(data, "description")) patch.description = String(data.description ?? "").trim();
  if (hasOwn(data, "slug")) patch.slug = nullableText(data.slug);
  if (hasOwn(data, "price")) patch.price = String(data.price ?? "").trim();
  if (hasOwn(data, "originalPrice")) patch.originalPrice = nullableText(data.originalPrice);
  if (hasOwn(data, "discountPrice")) patch.discountPrice = nullableText(data.discountPrice);
  if (hasOwn(data, "discountPercent")) patch.discountPercent = data.discountPercent as number | null;
  if (hasOwn(data, "imageUrl")) patch.imageUrl = nullableText(data.imageUrl);
  if (hasOwn(data, "images")) {
    patch.images = Array.isArray(data.images) && data.images.length > 0 ? data.images : Prisma.JsonNull;
  }
  if (hasOwn(data, "videoUrl")) patch.videoUrl = nullableText(data.videoUrl);
  if (hasOwn(data, "badge")) patch.badge = nullableText(data.badge);
  if (hasOwn(data, "ctaLabel")) patch.ctaLabel = nullableText(data.ctaLabel);
  if (hasOwn(data, "ctaHref")) patch.ctaHref = nullableText(data.ctaHref);
  if (hasOwn(data, "active")) patch.active = Boolean(data.active);
  if (hasOwn(data, "isActive")) patch.isActive = Boolean(data.isActive);
  if (hasOwn(data, "active") && !hasOwn(data, "isActive")) patch.isActive = Boolean(data.active);
  if (hasOwn(data, "isActive") && !hasOwn(data, "active")) patch.active = Boolean(data.isActive);
  if (hasOwn(data, "isFeatured")) patch.isFeatured = Boolean(data.isFeatured);
  if (hasOwn(data, "isAvailable")) patch.isAvailable = Boolean(data.isAvailable);
  if (hasOwn(data, "stockQuantity")) patch.stockQuantity = Math.max(0, Math.round(Number(data.stockQuantity)));
  if (hasOwn(data, "stockStatus")) patch.stockStatus = String(data.stockStatus ?? "").trim();
  if (hasOwn(data, "minOrder")) patch.minOrder = Math.max(1, Math.round(Number(data.minOrder)));
  if (hasOwn(data, "maxOrder")) patch.maxOrder = data.maxOrder === null ? null : Math.max(1, Math.round(Number(data.maxOrder)));
  if (hasOwn(data, "weight")) patch.weight = data.weight === null ? null : Number(data.weight);
  if (hasOwn(data, "length")) patch.length = data.length === null ? null : Number(data.length);
  if (hasOwn(data, "width")) patch.width = data.width === null ? null : Number(data.width);
  if (hasOwn(data, "height")) patch.height = data.height === null ? null : Number(data.height);
  if (hasOwn(data, "salesCount")) patch.salesCount = Math.max(0, Math.round(Number(data.salesCount)));
  if (hasOwn(data, "views")) patch.views = Math.max(0, Math.round(Number(data.views)));
  if (hasOwn(data, "wishlistCount")) patch.wishlistCount = Math.max(0, Math.round(Number(data.wishlistCount)));
  if (hasOwn(data, "ratingAverage")) patch.ratingAverage = Math.max(0, Math.min(5, Number(data.ratingAverage)));
  if (hasOwn(data, "ratingCount")) patch.ratingCount = Math.max(0, Math.round(Number(data.ratingCount)));
  if (hasOwn(data, "discountStartAt")) patch.discountStartAt = nullableDate(data.discountStartAt);
  if (hasOwn(data, "discountEndAt")) patch.discountEndAt = nullableDate(data.discountEndAt);
  if (hasOwn(data, "categoryId")) patch.categoryId = String(data.categoryId ?? "").trim() || "general";
  if (hasOwn(data, "categoryIds")) {
    const categoryIds = Array.isArray(data.categoryIds)
      ? data.categoryIds.map((item) => String(item).trim()).filter(Boolean)
      : [];
    patch.categoryIds = categoryIds.length > 0 ? categoryIds : Prisma.JsonNull;
    if (!hasOwn(data, "categoryId") && categoryIds[0]) patch.categoryId = categoryIds[0];
  }
  if (hasOwn(data, "manufactureYear")) patch.manufactureYear = data.manufactureYear === null ? null : Math.round(Number(data.manufactureYear));
  if (hasOwn(data, "brand")) patch.brand = nullableText(data.brand);
  if (hasOwn(data, "vendor")) patch.vendor = nullableText(data.vendor);
  if (hasOwn(data, "sku")) patch.sku = nullableText(data.sku);
  if (hasOwn(data, "barcode")) patch.barcode = nullableText(data.barcode);
  if (hasOwn(data, "metaTitle")) patch.metaTitle = nullableText(data.metaTitle);
  if (hasOwn(data, "metaDescription")) patch.metaDescription = nullableText(data.metaDescription);
  if (hasOwn(data, "metaKeywords")) patch.metaKeywords = nullableText(data.metaKeywords);
  if (hasOwn(data, "placement")) patch.placement = nullableText(data.placement);
  if (hasOwn(data, "publishedAt")) patch.publishedAt = nullableDate(data.publishedAt);
  if (hasOwn(data, "deletedAt")) patch.deletedAt = nullableDate(data.deletedAt);
  if (hasOwn(data, "colorStock")) patch.colorStock = data.colorStock === undefined ? Prisma.JsonNull : data.colorStock as Prisma.InputJsonValue;
  if (hasOwn(data, "sortOrder")) patch.sortOrder = Math.round(Number(data.sortOrder));

  return patch;
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
    ...(categoryId ? { OR: [{ categoryId }, { categoryIds: { array_contains: categoryId } }] } : {}),
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
  const { page, limit } = pagination(searchParams);
  const where = productWhere(searchParams, extra);
  const q = String(searchParams.get("q") ?? "").trim();
  const rawItems = await prisma.product.findMany({
    where: where as any,
    orderBy: productOrderBy(searchParams),
  });

  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const minPrice = minPriceParam === null || minPriceParam === "" ? NaN : Number(minPriceParam);
  const maxPrice = maxPriceParam === null || maxPriceParam === "" ? NaN : Number(maxPriceParam);
  const filtered = rawItems.filter((item: { discountPrice: string | null; price: string }) => {
    if (q && !matchesSearchQuery(item, q)) return false;
    const price = parseMoney(item.discountPrice || item.price);
    if (Number.isFinite(minPrice) && price < minPrice) return false;
    if (Number.isFinite(maxPrice) && price > maxPrice) return false;
    return true;
  });
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return pageResult(paged, page, limit, filtered.length);
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

const CART_COLOR_SELECTION_PREFIX = "colors:";

function readCartItemColorSelection(value: unknown, quantity: number) {
  const text = String(value ?? "").trim();
  if (!text) return {};

  if (text.startsWith(CART_COLOR_SELECTION_PREFIX)) {
    try {
      const parsed = JSON.parse(text.slice(CART_COLOR_SELECTION_PREFIX.length));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>)
          .map(([color, count]) => [
            color.trim(),
            Math.max(0, Math.round(Number(count))),
          ] as const)
          .filter(([color, count]) => color && Number.isFinite(count) && count > 0)
      );
    } catch {
      return {};
    }
  }

  return { [text]: Math.max(1, Math.round(Number(quantity) || 1)) };
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
    selectedColors: readCartItemColorSelection(item.selectedColor, item.quantity),
    quantity: item.quantity,
  };
}
