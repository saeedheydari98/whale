import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matchesSearchQuery } from "@/lib/product-search";
import { rateLimit } from "@/lib/api/rate-limit";
import { normalizeProductData } from "@/lib/api/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type ProductPayload = {
  id?: number | string;
  showcaseId?: string;
  showcaseIds?: string[];
  title: string;
  description: string;
  slug?: string;
  price: string;
  originalPrice?: string;
  discountPrice?: string;
  discountPercent?: number | string;
  imageUrl?: string;
  images?: unknown;
  videoUrl?: string;
  badge?: string;
  ctaLabel?: string;
  ctaHref?: string;
  active: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  isAvailable?: boolean;
  stockQuantity?: number | string;
  stockStatus?: string;
  minOrder?: number | string;
  maxOrder?: number | string | null;
  weight?: number | string | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  salesCount?: number | string;
  views?: number | string;
  wishlistCount?: number | string;
  ratingAverage?: number | string;
  ratingCount?: number | string;
  discountStartAt?: string | null;
  discountEndAt?: string | null;
  categoryId?: string;
  categoryIds?: string[];
  manufactureYear?: number | string | null;
  brand?: string;
  vendor?: string;
  sku?: string;
  barcode?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  placement?: string | number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  publishedAt?: string | null;
  deletedAt?: string | null;
  colorStock?: unknown;
  sortOrder: number;
};

type ShowcasePayload = {
  type?: "showcase";
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  active?: boolean;
  mode?: "manual" | "auto";
  autoSort?: string;
  limit?: number | string;
  categoryId?: string;
  manualProductIds?: unknown;
  sortOrder?: number | string;
  placement?: number | string;
  products?: Partial<ProductPayload>[];
};

type BannerPayload = {
  type?: "banner";
  id: string;
  title?: string;
  showcaseId?: string;
  imageUrls?: string[];
  images?: unknown;
  active?: boolean;
  intervalSeconds?: number | string;
  heightPercent?: number | string;
  sortOrder?: number | string;
  placement?: number | string;
};

type CatalogTreePayload = {
  type?: string;
  placement?: number | string;
  children?: Array<ShowcasePayload | BannerPayload>;
  showcases?: ShowcasePayload[];
  categories?: CategoryPayload[];
  banners?: BannerPayload[];
};

type CategoryPayload = {
  id?: string;
  title?: string;
  slug?: string;
  active?: boolean;
  sortOrder?: number | string;
};

type BannerRecord = {
  id: string;
  title: string | null;
  showcaseId: string | null;
  active: boolean;
  sortOrder: number;
  intervalSeconds: number;
  heightPercent: number;
  images: Prisma.JsonValue | null;
};

const hasProductModel =
  prisma.product && typeof prisma.product.findMany === "function";

const hasShowcaseModel =
  prisma.showcase && typeof prisma.showcase.findMany === "function";

function slugifyCatalogValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeProduct(value: Partial<ProductPayload>, index: number): ProductPayload {
  const placement = Number.isFinite(Number(value.placement))
    ? Number(value.placement)
    : Number.isFinite(Number(value.sortOrder))
      ? Number(value.sortOrder)
      : index + 1;

  const categoryIds = Array.isArray(value.categoryIds)
    ? value.categoryIds.map((item) => String(item).trim()).filter(Boolean)
    : [String(value.categoryId ?? "general").trim() || "general"];
  const showcaseIds = Array.isArray(value.showcaseIds)
    ? value.showcaseIds.map((item) => String(item).trim()).filter(Boolean)
    : String(value.showcaseId ?? "").trim()
      ? [String(value.showcaseId ?? "").trim()]
      : [];

  return {
    id: value.id,
    showcaseId: showcaseIds[0] ?? "",
    showcaseIds,
    title: String(value.title ?? "").trim(),
    description: String(value.description ?? "").trim(),
    slug: String(value.slug ?? "").trim(),
    price: String(value.price ?? "").trim(),
    originalPrice: String(value.originalPrice ?? "").trim(),
    discountPrice: String(value.discountPrice ?? "").trim(),
    discountPercent: Number.isFinite(Number(value.discountPercent)) ? Math.max(0, Math.round(Number(value.discountPercent))) : 0,
    imageUrl: String(value.imageUrl ?? "").trim(),
    images: Array.isArray(value.images) ? value.images.map((item) => String(item)).filter(Boolean) : [],
    videoUrl: String(value.videoUrl ?? "").trim(),
    badge: String(value.badge ?? "").trim(),
    ctaLabel: String(value.ctaLabel ?? "").trim(),
    ctaHref: String(value.ctaHref ?? "").trim(),
    active: value.active !== false && value.isActive !== false,
    isActive: value.isActive !== false && value.active !== false,
    isFeatured: value.isFeatured === true,
    isAvailable: value.isAvailable !== false,
    stockQuantity: Number.isFinite(Number(value.stockQuantity)) ? Math.max(0, Math.round(Number(value.stockQuantity))) : 0,
    stockStatus: String(value.stockStatus ?? "").trim(),
    minOrder: Number.isFinite(Number(value.minOrder)) ? Math.max(1, Math.round(Number(value.minOrder))) : 1,
    maxOrder: Number.isFinite(Number(value.maxOrder)) ? Math.max(1, Math.round(Number(value.maxOrder))) : null,
    weight: Number.isFinite(Number(value.weight)) ? Number(value.weight) : null,
    length: Number.isFinite(Number(value.length)) ? Number(value.length) : null,
    width: Number.isFinite(Number(value.width)) ? Number(value.width) : null,
    height: Number.isFinite(Number(value.height)) ? Number(value.height) : null,
    salesCount: Number.isFinite(Number(value.salesCount)) ? Math.max(0, Math.round(Number(value.salesCount))) : 0,
    views: Number.isFinite(Number(value.views)) ? Math.max(0, Math.round(Number(value.views))) : 0,
    wishlistCount: Number.isFinite(Number(value.wishlistCount)) ? Math.max(0, Math.round(Number(value.wishlistCount))) : 0,
    ratingAverage: Number.isFinite(Number(value.ratingAverage)) ? Math.max(0, Math.min(5, Number(value.ratingAverage))) : 0,
    ratingCount: Number.isFinite(Number(value.ratingCount)) ? Math.max(0, Math.round(Number(value.ratingCount))) : 0,
    discountStartAt: String(value.discountStartAt ?? "").trim() || null,
    discountEndAt: String(value.discountEndAt ?? "").trim() || null,
    categoryId: categoryIds[0] || "general",
    categoryIds,
    manufactureYear: Number.isFinite(Number(value.manufactureYear)) ? Math.round(Number(value.manufactureYear)) : null,
    brand: String(value.brand ?? "").trim(),
    vendor: String(value.vendor ?? "").trim(),
    sku: String(value.sku ?? "").trim(),
    barcode: String(value.barcode ?? "").trim(),
    metaTitle: String(value.metaTitle ?? "").trim(),
    metaDescription: String(value.metaDescription ?? "").trim(),
    metaKeywords: String(value.metaKeywords ?? "").trim(),
    placement: String(value.placement ?? "").trim(),
    publishedAt: String(value.publishedAt ?? "").trim() || null,
    deletedAt: String(value.deletedAt ?? "").trim() || null,
    colorStock: normalizeColorStock(value.colorStock),
    sortOrder: placement,
  };
}

function normalizeColorStock(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([color, count]) => [
        color.trim(),
        Math.max(0, Math.round(Number(count))),
      ] as const)
      .filter(([color, count]) => color && Number.isFinite(count))
  );
}

function sortProducts(products: ProductPayload[]) {
  return [...products].sort((a, b) => a.sortOrder - b.sortOrder);
}

function sortByOrder<T extends { sortOrder?: number | string; placement?: number | string }>(items: T[]) {
  return [...items].sort((a, b) => getPlacement(a) - getPlacement(b));
}

function getSortComparer(sort: string) {
  const numeric = (field: keyof ProductPayload, direction: "asc" | "desc") =>
    (a: ProductPayload, b: ProductPayload) => {
      const result = Number(a[field] ?? 0) - Number(b[field] ?? 0);
      return direction === "asc" ? result : -result;
    };
  const date = (field: "createdAt" | "updatedAt", direction: "asc" | "desc") =>
    (a: ProductPayload, b: ProductPayload) => {
      const result = new Date(String(a[field] ?? 0)).getTime() - new Date(String(b[field] ?? 0)).getTime();
      return direction === "asc" ? result : -result;
    };

  switch (sort) {
    case "cheapest":
      return (a: ProductPayload, b: ProductPayload) => parsePriceValue(a.discountPrice || a.price) - parsePriceValue(b.discountPrice || b.price);
    case "expensive":
      return (a: ProductPayload, b: ProductPayload) => parsePriceValue(b.discountPrice || b.price) - parsePriceValue(a.discountPrice || a.price);
    case "newest":
      return date("createdAt", "desc");
    case "oldest":
      return date("createdAt", "asc");
    case "bestseller":
      return numeric("salesCount", "desc");
    case "mostDiscounted":
    case "biggestDiscount":
      return numeric("discountPercent", "desc");
    case "topRated":
      return numeric("ratingAverage", "desc");
    case "mostViewed":
      return numeric("views", "desc");
    case "mostWished":
      return numeric("wishlistCount", "desc");
    default:
      return (a: ProductPayload, b: ProductPayload) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
  }
}

function parsePriceValue(value: unknown) {
  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampWholeNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function getProductKey(product: Partial<ProductPayload>) {
  return [
    String(product.showcaseId ?? "").trim().toLowerCase(),
    product.title,
    product.description,
    product.price,
    product.originalPrice,
    product.discountPrice,
    product.imageUrl,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function dedupeProducts(products: ProductPayload[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = getProductKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toClientBanner(banner: BannerRecord) {
  const imageUrls = Array.isArray(banner.images)
    ? banner.images.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    type: "banner" as const,
    id: banner.id,
    title: banner.title ?? "",
    showcaseId: banner.showcaseId,
    images: imageUrls.map((url, index) => ({ url, placement: index + 1 })),
    imageUrls,
    active: banner.active,
    intervalSeconds: clampWholeNumber(banner.intervalSeconds, 1, 60, 5),
    heightPercent: clampWholeNumber(banner.heightPercent, 10, 100, 28),
    sortOrder: banner.sortOrder,
    placement: banner.sortOrder,
  };
}

function toClientProduct(product: ProductPayload) {
  return {
    id: product.id,
    showcaseId: product.showcaseId,
    showcaseIds: Array.isArray(product.showcaseIds) ? product.showcaseIds : product.showcaseId ? [product.showcaseId] : [],
    title: product.title,
    description: product.description,
    slug: product.slug,
    price: product.price,
    originalPrice: product.originalPrice,
    discountPrice: product.discountPrice,
    discountPercent: product.discountPercent,
    imageUrl: product.imageUrl,
    images: Array.isArray(product.images) ? product.images : [],
    videoUrl: product.videoUrl,
    badge: product.badge,
    ctaLabel: product.ctaLabel,
    ctaHref: product.ctaHref,
    active: product.active,
    isActive: product.isActive ?? product.active,
    isFeatured: product.isFeatured,
    isAvailable: product.isAvailable,
    stockQuantity: Number(product.stockQuantity ?? 0),
    stockStatus: product.stockStatus,
    minOrder: product.minOrder,
    maxOrder: product.maxOrder,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    salesCount: product.salesCount,
    views: product.views,
    wishlistCount: product.wishlistCount,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
    discountStartAt: product.discountStartAt,
    discountEndAt: product.discountEndAt,
    categoryId: product.categoryId,
    categoryIds: Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId],
    manufactureYear: product.manufactureYear,
    brand: product.brand,
    vendor: product.vendor,
    sku: product.sku,
    barcode: product.barcode,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    publishedAt: product.publishedAt,
    deletedAt: product.deletedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    colorStock: normalizeColorStock(product.colorStock),
    placement: Number(product.sortOrder ?? product.placement ?? 0),
    sortOrder: Number(product.sortOrder ?? product.placement ?? 0),
  };
}

function toClientShowcase(showcase: {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  mode?: string;
  autoSort?: string;
  limit?: number;
  categoryId?: string | null;
  manualProductIds?: Prisma.JsonValue | null;
  sortOrder: number;
}) {
  const manualProductIds = Array.isArray(showcase.manualProductIds)
    ? showcase.manualProductIds.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    type: "showcase" as const,
    id: showcase.id,
    title: showcase.title ?? "",
    description: showcase.description ?? "",
    imageUrl: showcase.imageUrl ?? "",
    active: showcase.active,
    mode: showcase.mode === "auto" ? "auto" : "manual",
    autoSort: showcase.autoSort ?? "newest",
    limit: showcase.limit ?? 8,
    categoryId: showcase.categoryId ?? "",
    manualProductIds,
    placement: showcase.sortOrder,
  };
}

function normalizeCategory(value: Partial<CategoryPayload>, index: number) {
  const title = String(value.title ?? "").trim();
  const slug = slugifyCatalogValue(value.slug || title || value.id || `category-${index + 1}`);
  const id = String(value.id ?? slug).trim() || slug;

  return {
    id,
    title: title || id,
    slug,
    active: value.active !== false,
    sortOrder: Number.isFinite(Number(value.sortOrder)) ? Number(value.sortOrder) : index + 1,
  };
}

function toClientCategory(category: {
  id: string;
  title: string;
  slug: string;
  active: boolean;
  sortOrder: number;
}) {
  return {
    id: category.id,
    title: category.title,
    slug: category.slug,
    active: category.active,
    sortOrder: category.sortOrder,
  };
}

function buildCatalogTree(
  products: ProductPayload[],
  showcases: Array<{
    id: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    active: boolean;
    mode?: string;
    autoSort?: string;
    limit?: number;
    categoryId?: string | null;
    manualProductIds?: Prisma.JsonValue | null;
    sortOrder: number;
  }>,
  categories: Array<{
    id: string;
    title: string;
    slug: string;
    active: boolean;
    sortOrder: number;
  }>,
  banners: BannerRecord[],
  includeInactive: boolean
) {
  const visibleProducts = includeInactive
    ? products
    : products.filter((product) => product.active !== false);
  const visibleShowcases = includeInactive
    ? showcases
    : showcases.filter((showcase) => showcase.active !== false);
  const visibleBanners = includeInactive
    ? banners
    : banners.filter((banner) => banner.active !== false);

  const bannerSections = visibleBanners.map(toClientBanner);
  const visibleCategories = categories.filter((category) => includeInactive || category.active !== false);
  const fallbackCategories = visibleCategories.length > 0
    ? visibleCategories
    : Array.from(
        new Set(
          visibleProducts.flatMap((product) =>
            (Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId])
              .map((item) => String(item ?? "").trim())
              .filter(Boolean)
          )
        )
      ).map((categoryId, index) =>
        normalizeCategory({ id: categoryId, title: categoryId, slug: categoryId, active: true }, index)
      );

  const showcaseSections = visibleShowcases
    .map((showcase) => {
      const manualIds = Array.isArray(showcase.manualProductIds)
        ? showcase.manualProductIds.map((item) => String(item))
        : [];
      const categoryId = String(showcase.categoryId ?? "").trim();
      const mode = showcase.mode === "auto" ? "auto" : "manual";
      const limit = Number.isFinite(Number(showcase.limit)) ? Math.max(1, Number(showcase.limit)) : 8;
      const matchedProducts = mode === "auto"
        ? visibleProducts
            .filter((product) => {
              const productCategoryIds = Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId];
              return !categoryId || productCategoryIds.includes(categoryId);
            })
            .sort(getSortComparer(showcase.autoSort ?? "newest"))
            .slice(0, limit)
        : manualIds.length > 0
          ? manualIds
              .map((id) => visibleProducts.find((product) => String(product.id) === id))
              .filter(Boolean) as ProductPayload[]
          : visibleProducts.filter((product) => {
              const productShowcaseIds = Array.isArray(product.showcaseIds) ? product.showcaseIds : product.showcaseId ? [product.showcaseId] : [];
              return productShowcaseIds.includes(showcase.id);
            });

      return {
        ...toClientShowcase(showcase),
        products: matchedProducts.map(toClientProduct),
      };
    })
    .filter((section) => includeInactive || section.products.length > 0);

  return {
    type: "root" as const,
    placement: 0,
    products: visibleProducts.map(toClientProduct),
    showcases: visibleShowcases.map(toClientShowcase),
    categories: fallbackCategories
      .map(toClientCategory)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    children: [...bannerSections, ...showcaseSections].sort(
      (a, b) => Number(a.placement ?? 0) - Number(b.placement ?? 0)
    ),
  };
}

function getPlacement(value: { placement?: number | string; sortOrder?: number | string } | undefined, fallback = 0) {
  if (Number.isFinite(Number(value?.placement))) return Number(value?.placement);
  if (Number.isFinite(Number(value?.sortOrder))) return Number(value?.sortOrder);
  return fallback;
}

function getImageUrls(value: BannerPayload) {
  if (Array.isArray(value.imageUrls)) {
    return value.imageUrls.map((item) => String(item)).filter(Boolean);
  }

  if (!Array.isArray(value.images)) return [];

  return value.images
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item) {
        return String((item as { url?: unknown }).url ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

function splitTreePayload(tree: CatalogTreePayload | null) {
  const children = Array.isArray(tree?.children) ? tree.children : [];
  const showcaseChildren = children.filter((item) => item.type === "showcase") as ShowcasePayload[];
  const bannerChildren = children.filter((item) => item.type === "banner") as BannerPayload[];

  return {
    showcases: Array.isArray(tree?.showcases) ? tree.showcases : showcaseChildren,
    banners: Array.isArray(tree?.banners) ? tree.banners : bannerChildren,
  };
}

function buildShowcaseProductsNode(
  showcase: {
    id: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    active: boolean;
    sortOrder: number;
  } | null,
  showcaseId: string,
  products: ProductPayload[]
) {
  return {
    type: "showcase" as const,
    id: showcase?.id ?? showcaseId,
    title: showcase?.title ?? "",
    description: showcase?.description ?? "",
    imageUrl: showcase?.imageUrl ?? "",
    active: showcase?.active ?? true,
    placement: showcase?.sortOrder ?? 0,
    products: products
      .map(toClientProduct)
      .sort((a, b) => Number(a.placement ?? 0) - Number(b.placement ?? 0)),
  };
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("all") === "1";
  const id = url.searchParams.get("id") ?? null;
  const query = String(url.searchParams.get("q") ?? url.searchParams.get("search") ?? "").trim();
  const showcaseId = String(url.searchParams.get("showcaseId") ?? "").trim();
  const categoryId = String(url.searchParams.get("categoryId") ?? "").trim();
  const badge = String(url.searchParams.get("badge") ?? "").trim();
  const sort = String(url.searchParams.get("sort") ?? "sortOrder").trim();
  const limitParam = url.searchParams.get("limit");
  const limit = Number.isFinite(Number(limitParam)) ? Math.max(1, Math.min(100, Number(limitParam))) : null;
  const onlyDiscounted = url.searchParams.get("discounted") === "1" || url.searchParams.get("hasDiscount") === "true";
  const inStock = url.searchParams.get("inStock") === "true";
  const minRatingParam = url.searchParams.get("minRating");
  const minRating = minRatingParam ? Number(minRatingParam) : NaN;
  const isActiveParam = url.searchParams.get("isActive");
  const isFeaturedParam = url.searchParams.get("isFeatured");
  const priceMinParam = url.searchParams.get("priceMin") ?? url.searchParams.get("minPrice");
  const priceMaxParam = url.searchParams.get("priceMax") ?? url.searchParams.get("maxPrice");
  const priceMin = priceMinParam ? Number(priceMinParam) : NaN;
  const priceMax = priceMaxParam ? Number(priceMaxParam) : NaN;

  const parsePrice = (value: unknown) => {
    const normalized = String(value || "").replace(/[^\d.]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  if (!hasProductModel) {
    return NextResponse.json({ ok: true, data: { type: "root", placement: 0, children: [] } });
  }

  try {
    if (id) {
      const maybeIdNum = Number(id);
      const where =
        Number.isFinite(maybeIdNum) && !Number.isNaN(maybeIdNum)
          ? { id: maybeIdNum }
          : { id: String(id) };
      const item = await prisma.product.findFirst({ where });
      if (!item) {
        return NextResponse.json({ ok: false, data: { product: null } }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: { product: toClientProduct(item as ProductPayload) } });
    }

    const productsData = await prisma.product.findMany({
      where: {
        ...(includeInactive ? {} : { active: true }),
        ...(showcaseId ? { showcaseId } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const products = dedupeProducts(productsData as ProductPayload[]).filter((product) => {
      if (query && !matchesSearchQuery(product, query)) return false;
      if (categoryId) {
        const productCategoryIds = Array.isArray(product.categoryIds) ? product.categoryIds : [String(product.categoryId ?? "")];
        if (!productCategoryIds.includes(categoryId)) return false;
      }
      if (badge && String(product.badge ?? "") !== badge) return false;
      if (inStock && Number(product.stockQuantity ?? 0) <= 0) return false;
      if (Number.isFinite(minRating) && Number(product.ratingAverage ?? 0) < minRating) return false;
      if (isActiveParam !== null && (product.active !== false && product.isActive !== false) !== (isActiveParam === "true")) return false;
      if (isFeaturedParam !== null && Boolean(product.isFeatured) !== (isFeaturedParam === "true")) return false;
      if (onlyDiscounted) {
        const percent = Number(product.discountPercent || 0);
        if (!(percent > 0 || String(product.discountPrice || "").trim())) return false;
      }
      const productPrice = Number.isFinite(parsePrice(product.discountPrice))
        ? parsePrice(product.discountPrice)
        : parsePrice(product.price);
      if (Number.isFinite(priceMin) && Number.isFinite(productPrice) && productPrice < priceMin) return false;
      if (Number.isFinite(priceMax) && Number.isFinite(productPrice) && productPrice > priceMax) return false;
      return true;
    }).sort(getSortComparer(sort));
    const limitedProducts = limit ? products.slice(0, limit) : products;

    if (showcaseId) {
      const showcase = hasShowcaseModel
        ? await prisma.showcase.findUnique({ where: { id: showcaseId } })
        : null;

      return NextResponse.json({
        ok: true,
        data: buildShowcaseProductsNode(showcase, showcaseId, limitedProducts),
      });
    }

    const showcases = hasShowcaseModel
      ? await prisma.showcase.findMany({
          include: { products: true, banners: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : [];
    const categories =
      "category" in prisma && typeof (prisma as any).category?.findMany === "function"
        ? await (prisma as any).category.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          })
        : [];

    const banners =
      "banner" in prisma && typeof prisma.banner?.findMany === "function"
        ? await prisma.banner.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          })
        : [];
    const tree = buildCatalogTree(
      limitedProducts,
      showcases,
      categories,
      banners as BannerRecord[],
      includeInactive
    );

    return NextResponse.json({
      ok: true,
      data: tree,
    });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json(
      { ok: false, error: "server error", data: { type: "root", placement: 0, children: [] } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const treePayload =
    body.tree && typeof body.tree === "object"
      ? (body.tree as CatalogTreePayload)
      : body.catalog && typeof body.catalog === "object"
        ? (body.catalog as CatalogTreePayload)
        : body.type === "root" || Array.isArray(body.children)
          ? (body as CatalogTreePayload)
          : null;
  const treeParts = splitTreePayload(treePayload);
  const catalogShowcases = treeParts.showcases;
  const catalogBanners = treeParts.banners;
  const bodyProducts = Array.isArray(body.products) ? body.products : [];
  const products = catalogShowcases.length > 0
    ? catalogShowcases.flatMap((showcase) =>
        Array.isArray(showcase.products)
          ? showcase.products.map((product, productIndex) => ({
              ...product,
              showcaseId: String(product.showcaseId ?? showcase.id ?? "").trim(),
              sortOrder: getPlacement(product, productIndex + 1),
              placement: getPlacement(product, productIndex + 1),
            }))
          : []
      )
    : bodyProducts;
  const showcases = catalogShowcases.length > 0
    ? catalogShowcases
    : Array.isArray(body.showcases)
      ? (body.showcases as ShowcasePayload[])
      : [];
  const categories = Array.isArray(body.categories)
    ? (body.categories as CategoryPayload[]).map(normalizeCategory)
    : Array.isArray(treePayload?.categories)
      ? treePayload.categories.map(normalizeCategory)
      : [];
  const banners = catalogBanners.length > 0
    ? catalogBanners
    : Array.isArray(body.banners)
      ? (body.banners as BannerPayload[])
      : [];
  const normalized = dedupeProducts(
    products
      .map((item: Partial<ProductPayload>, index: number) => normalizeProduct(item, index))
      .filter((item: ProductPayload) => item.title && item.description && item.price)
  );

  const missingCategory = normalized.some((p) => !String(p.categoryId ?? "").trim());
  if (missingCategory) {
    return NextResponse.json({ ok: false, error: "categoryId is required for every product" }, { status: 400 });
  }

  if (!hasProductModel) {
    return NextResponse.json({ ok: false, error: "product model is unavailable" }, { status: 500 });
  }

  try {
    const productCategoryIds = normalized.flatMap((item) =>
      (Array.isArray(item.categoryIds) ? item.categoryIds : [item.categoryId]).map((value) => String(value ?? "").trim()).filter(Boolean)
    );
    const normalizedCategories = categories.length > 0
      ? categories
      : [...new Set(productCategoryIds)].map((categoryId, index) =>
          normalizeCategory({ id: categoryId, title: categoryId, slug: categoryId }, index)
        );
    const categoryIds = new Set(normalizedCategories.map((category) => category.id));
    for (const categoryId of productCategoryIds) {
      if (!categoryIds.has(categoryId)) {
        normalizedCategories.push(normalizeCategory({ id: categoryId, title: categoryId, slug: categoryId }, normalizedCategories.length));
        categoryIds.add(categoryId);
      }
    }

    const showcaseIds = [
      ...new Set([
        ...showcases.map((item) => String(item.id ?? "").trim()).filter(Boolean),
      ]),
    ];

    const showcaseById = new Map(
      showcases
        .map((item) => [String(item.id ?? "").trim(), item] as const)
        .filter(([id]) => Boolean(id))
    );

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if ("banner" in tx && typeof tx.banner?.deleteMany === "function") {
        await tx.banner.deleteMany();
      }

      await tx.product.deleteMany();

      if (hasShowcaseModel) {
        await tx.showcase.deleteMany({
          where: {
            id: { notIn: showcaseIds },
          },
        });
      }

      if ("category" in tx && typeof (tx as any).category?.deleteMany === "function") {
        await (tx as any).category.deleteMany({
          where: {
            id: { notIn: normalizedCategories.map((category) => category.id) },
          },
        });

        for (const category of normalizedCategories) {
          await (tx as any).category.upsert({
            where: { id: category.id },
            update: {
              title: category.title,
              slug: category.slug,
              active: category.active,
              sortOrder: category.sortOrder,
            },
            create: category,
          });
        }
      }

      for (const showcaseId of showcaseIds) {
        if (!hasShowcaseModel) continue;
        const meta = showcaseById.get(showcaseId);
        await (tx as any).showcase.upsert({
          where: { id: showcaseId },
          update: {
            title: meta?.title ?? undefined,
            description: meta?.description ?? undefined,
            imageUrl: meta?.imageUrl ?? undefined,
            active: meta?.active ?? undefined,
            mode: meta?.mode ?? undefined,
            autoSort: meta?.autoSort ?? undefined,
            limit: Number.isFinite(Number(meta?.limit)) ? Number(meta?.limit) : undefined,
            categoryId: meta?.categoryId ?? undefined,
            manualProductIds: Array.isArray(meta?.manualProductIds) ? meta.manualProductIds : undefined,
            sortOrder: Number.isFinite(Number(getPlacement(meta, NaN))) ? getPlacement(meta) : undefined,
          },
          create: {
            id: showcaseId,
            title: meta?.title ?? null,
            description: meta?.description ?? null,
            imageUrl: meta?.imageUrl ?? null,
            active: meta?.active ?? true,
            mode: meta?.mode ?? "manual",
            autoSort: meta?.autoSort ?? "newest",
            limit: Number.isFinite(Number(meta?.limit)) ? Number(meta?.limit) : 8,
            categoryId: meta?.categoryId ? String(meta.categoryId) : null,
            manualProductIds: Array.isArray(meta?.manualProductIds) ? meta.manualProductIds : Prisma.JsonNull,
            sortOrder: getPlacement(meta, 0),
          },
        });
      }

      for (const item of sortProducts(normalized)) {
        await tx.product.create({
          data: {
            ...normalizeProductData({
              ...item,
              colorStock: Object.keys(normalizeColorStock(item.colorStock)).length > 0
                ? normalizeColorStock(item.colorStock)
                : Prisma.JsonNull,
              stockStatus: item.stockStatus || (Number(item.stockQuantity) > 0 ? "in_stock" : "out_of_stock"),
            }),
              showcaseId: String(item.showcaseId ?? "").trim(),
              showcaseIds: item.showcaseIds,
              categoryIds: item.categoryIds,
          },
        });
      }

      if ("banner" in tx && typeof tx.banner?.create === "function") {
        for (const item of sortByOrder(banners)) {
          const bannerId = String(item.id ?? "").trim();
          const imageUrls = getImageUrls(item);
          await (tx as any).banner.create({
            data: {
              id: bannerId || undefined,
              title: item.title ?? null,
              showcaseId: item.showcaseId ? String(item.showcaseId) : null,
              images: imageUrls.length > 0 ? imageUrls : Prisma.JsonNull,
              active: item.active ?? true,
              intervalSeconds: clampWholeNumber(item.intervalSeconds, 1, 60, 5),
              heightPercent: clampWholeNumber(item.heightPercent, 10, 100, 28),
              sortOrder: getPlacement(item, 0),
            },
          });
        }
      }
    });

    const data = await prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const savedShowcases = hasShowcaseModel
      ? await prisma.showcase.findMany({
          include: { products: true, banners: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : [];
    const savedCategories =
      "category" in prisma && typeof (prisma as any).category?.findMany === "function"
        ? await (prisma as any).category.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          })
        : [];
    const savedBanners =
      "banner" in prisma && typeof prisma.banner?.findMany === "function"
        ? await prisma.banner.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          })
        : [];
    const tree = buildCatalogTree(
      data as ProductPayload[],
      savedShowcases,
      savedCategories,
      savedBanners as BannerRecord[],
      true
    );

    return NextResponse.json({
      ok: true,
      data: tree,
    });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
