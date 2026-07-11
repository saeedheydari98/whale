import { MIN_LOADING_MS } from "./constants";
import type { BannerForm, BrandForm, CatalogLinkGroupForm, CategoryForm, ProductForm, ShowcaseForm } from "./types";

export function waitForMinimumLoading(startedAt: number) {
  const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
  return remaining > 0
    ? new Promise((resolve) => window.setTimeout(resolve, remaining))
    : Promise.resolve();
}

export function imageListToText(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean).join(", ") : "";
}

export function textToImageList(value: string) {
  return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

export function toggleProductId(list: Array<number | string>, productId: number | string) {
  const id = String(productId);
  const ids = list.map((item) => String(item));
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function getProductKey(product: Partial<ProductForm>) {
  const id = String(product.id ?? "").trim();
  if (id && /^\d+$/.test(id)) return `id:${id}`;

  return [
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

export function dedupeProducts(products: ProductForm[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = getProductKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeProduct(item: Partial<ProductForm>, index: number): ProductForm {
  const finalPrice = String(item.discountPrice ?? item.price ?? "");
  const stockQuantity = Number.isFinite(Number(item.stockQuantity)) ? Math.max(0, Math.round(Number(item.stockQuantity))) : 0;
  const categoryIds = normalizeStringList(item.categoryIds, [String(item.categoryId ?? "general").trim() || "general"]);
  const showcaseIds = normalizeStringList(item.showcaseIds, item.showcaseId ? [String(item.showcaseId)] : []);

  return {
    id: item.id ?? `local-${Date.now()}-${index}`,
    showcaseId: showcaseIds[0] ?? "",
    showcaseIds,
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    slug: String(item.slug ?? ""),
    price: finalPrice,
    originalPrice: String(item.originalPrice ?? ""),
    discountPrice: finalPrice,
    discountPercent: String(item.discountPercent ?? ""),
    imageUrl: String(item.imageUrl ?? ""),
    images: Array.isArray(item.images) ? item.images.map((value) => String(value)).filter(Boolean) : [],
    videoUrl: String(item.videoUrl ?? ""),
    badge: String(item.badge ?? ""),
    ctaLabel: "مشاهده",
    ctaHref: String(item.ctaHref ?? "#"),
    active: item.active !== false && item.isActive !== false,
    isActive: item.isActive !== false && item.active !== false,
    isFeatured: item.isFeatured === true,
    isAvailable: item.isAvailable !== false,
    stockQuantity,
    stockStatus: String(item.stockStatus ?? (stockQuantity > 0 ? "in_stock" : "out_of_stock")),
    minOrder: Number.isFinite(Number(item.minOrder)) ? Math.max(1, Math.round(Number(item.minOrder))) : 1,
    maxOrder: Number.isFinite(Number(item.maxOrder)) ? Math.max(0, Math.round(Number(item.maxOrder))) : 0,
    weight: String(item.weight ?? ""),
    length: String(item.length ?? ""),
    width: String(item.width ?? ""),
    height: String(item.height ?? ""),
    salesCount: Number.isFinite(Number(item.salesCount)) ? Math.max(0, Math.round(Number(item.salesCount))) : 0,
    views: Number.isFinite(Number(item.views)) ? Math.max(0, Math.round(Number(item.views))) : 0,
    wishlistCount: Number.isFinite(Number(item.wishlistCount)) ? Math.max(0, Math.round(Number(item.wishlistCount))) : 0,
    ratingAverage: String(item.ratingAverage ?? ""),
    ratingCount: Number.isFinite(Number(item.ratingCount)) ? Math.max(0, Math.round(Number(item.ratingCount))) : 0,
    discountStartAt: String(item.discountStartAt ?? ""),
    discountEndAt: String(item.discountEndAt ?? ""),
    categoryId: categoryIds[0] || "general",
    categoryIds,
    manufactureYear: String(item.manufactureYear ?? ""),
    brand: String(item.brand ?? ""),
    vendor: String(item.vendor ?? ""),
    sku: String(item.sku ?? ""),
    barcode: String(item.barcode ?? ""),
    metaTitle: String(item.metaTitle ?? ""),
    metaDescription: String(item.metaDescription ?? ""),
    metaKeywords: String(item.metaKeywords ?? ""),
    placement: String(item.placement ?? ""),
    publishedAt: String(item.publishedAt ?? ""),
    deletedAt: String(item.deletedAt ?? ""),
    colorStock: normalizeColorStock(item.colorStock),
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

export function normalizeColorStock(value: unknown) {
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

export function getAssignedColorStock(value: unknown) {
  return Object.values(normalizeColorStock(value)).reduce((sum, count) => sum + Number(count), 0);
}

export function hasMatchingColorStock(product: Pick<ProductForm, "stockQuantity" | "colorStock">) {
  return getAssignedColorStock(product.colorStock) === Math.max(0, Math.round(Number(product.stockQuantity ?? 0)));
}

export function normalizeStringList(value: unknown, fallback: string[] = []) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;
}

export function normalizeShowcase(item: Partial<ShowcaseForm>, index: number): ShowcaseForm {
  return {
    id: String(item.id ?? `showcase-${Date.now()}-${index}`),
    title: String(item.title ?? `ویترین ${index + 1}`),
    active: item.active !== false,
    mode: item.mode === "auto" ? "auto" : "manual",
    autoSort: String(item.autoSort ?? "newest"),
    limit: Number.isFinite(Number(item.limit)) ? Math.max(1, Math.round(Number(item.limit))) : 8,
    categoryId: String(item.categoryId ?? ""),
    manualProductIds: Array.isArray(item.manualProductIds) ? item.manualProductIds.map((value) => String(value)) : [],
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

export function slugifyValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeCategory(item: Partial<CategoryForm>, index: number): CategoryForm {
  const title = String(item.title ?? `دسته‌بندی ${index + 1}`).trim();
  const slug = String(item.slug ?? slugifyValue(title)).trim() || slugifyValue(title);

  return {
    id: String(item.id ?? (slug || `category-${Date.now()}-${index}`)),
    groupId: String(item.groupId ?? "default-categories"),
    title,
    slug,
    imageUrl: String(item.imageUrl ?? "").trim(),
    active: item.active !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    pageSortOrder: Number.isFinite(Number(item.pageSortOrder)) ? Number(item.pageSortOrder) : 1,
  };
}

export function normalizeBrand(item: Partial<BrandForm>, index: number): BrandForm {
  const title = String(item.title ?? "").trim();
  const slug = slugifyValue(String(item.slug || title || item.id || `brand-${index + 1}`));
  const id = String(item.id ?? slug).trim() || slug;

  return {
    id,
    groupId: String(item.groupId ?? "default-brands"),
    title,
    slug,
    imageUrl: String(item.imageUrl ?? "").trim(),
    active: item.active !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    homeSortOrder: Number.isFinite(Number(item.homeSortOrder)) ? Number(item.homeSortOrder) : 1,
  };
}

export function normalizeCatalogLinkGroup(item: Partial<CatalogLinkGroupForm>, index: number, fallbackId: string, fallbackTitle: string): CatalogLinkGroupForm {
  const title = String(item.title ?? "").trim();
  const id = String(item.id ?? (slugifyValue(title) || `${fallbackId}-${index + 1}`)).trim();

  return {
    id: id || fallbackId,
    title: title || fallbackTitle,
    active: item.active !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

export function normalizeBanner(item: Partial<BannerForm> & { bannerUrl?: string; images?: unknown }, index: number): BannerForm {
  const legacyImage = typeof item.bannerUrl === "string" && item.bannerUrl ? [item.bannerUrl] : [];
  const imageMeta = item.images && typeof item.images === "object" && !Array.isArray(item.images)
    ? item.images as Partial<BannerForm> & { urls?: unknown; imageUrls?: unknown }
    : {};
  const objectImages = Array.isArray(imageMeta.urls)
    ? imageMeta.urls.map((value) => String(value)).filter(Boolean)
    : Array.isArray(imageMeta.imageUrls)
      ? imageMeta.imageUrls.map((value) => String(value)).filter(Boolean)
      : [];
  const dbImages = Array.isArray(item.images) ? item.images.map((value) => String(value)).filter(Boolean) : objectImages;
  const imageUrls = Array.isArray(item.imageUrls)
    ? item.imageUrls.map((value) => String(value)).filter(Boolean)
    : dbImages.length > 0
      ? dbImages
      : legacyImage;
  const showcaseId = String(item.showcaseId ?? imageMeta.showcaseId ?? "").trim();
  const hasExplicitTargets = typeof item.showOnHome === "boolean"
    || typeof item.showOnShowcase === "boolean"
    || typeof item.showOnCategories === "boolean"
    || typeof item.showOnProducts === "boolean"
    || typeof imageMeta.showOnHome === "boolean"
    || typeof imageMeta.showOnShowcase === "boolean"
    || typeof imageMeta.showOnCategories === "boolean"
    || typeof imageMeta.showOnProducts === "boolean";
  const showOnHome = hasExplicitTargets ? (item.showOnHome ?? imageMeta.showOnHome) !== false : !showcaseId;
  const showOnShowcase = hasExplicitTargets ? (item.showOnShowcase ?? imageMeta.showOnShowcase) === true : Boolean(showcaseId);
  const showOnCategories = (item.showOnCategories ?? imageMeta.showOnCategories) === true;
  const showOnProducts = typeof (item.showOnProducts ?? imageMeta.showOnProducts) === "boolean"
    ? (item.showOnProducts ?? imageMeta.showOnProducts) === true
    : showOnShowcase;
  const homeSortOrder = Number.isFinite(Number(item.homeSortOrder ?? imageMeta.homeSortOrder))
    ? Number(item.homeSortOrder ?? imageMeta.homeSortOrder)
    : Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1;
  const showcaseSortOrder = Number.isFinite(Number(item.showcaseSortOrder ?? imageMeta.showcaseSortOrder))
    ? Number(item.showcaseSortOrder ?? imageMeta.showcaseSortOrder)
    : Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1;
  const categorySortOrder = Number.isFinite(Number(item.categorySortOrder ?? imageMeta.categorySortOrder))
    ? Number(item.categorySortOrder ?? imageMeta.categorySortOrder)
    : homeSortOrder;
  const productSortOrder = Number.isFinite(Number(item.productSortOrder ?? imageMeta.productSortOrder))
    ? Number(item.productSortOrder ?? imageMeta.productSortOrder)
    : showcaseSortOrder;

  return {
    id: String(item.id ?? `banner-${Date.now()}-${index}`),
    title: String(item.title ?? `Banner ${index + 1}`),
    showcaseId,
    imageUrls,
    active: item.active !== false,
    showOnHome,
    showOnShowcase,
    showOnCategories,
    showOnProducts,
    intervalSeconds: Number.isFinite(Number(item.intervalSeconds)) ? Math.max(1, Math.round(Number(item.intervalSeconds))) : 5,
    heightPercent: Number.isFinite(Number(item.heightPercent)) ? Math.max(10, Math.min(100, Math.round(Number(item.heightPercent)))) : 28,
    homeSortOrder,
    showcaseSortOrder,
    categorySortOrder,
    productSortOrder,
    sortOrder: homeSortOrder,
  };
}

export function ensureShowcases(products: ProductForm[], savedShowcases: ShowcaseForm[]) {
  const normalized = savedShowcases.map(normalizeShowcase);
  const byId = new Map(normalized.map((showcase) => [showcase.id, showcase]));

  for (const product of products) {
    const showcaseId = product.showcaseId ?? "";
    if (!showcaseId || byId.has(showcaseId)) continue;
    byId.set(showcaseId, {
      id: showcaseId,
      title: "ویترین بدون عنوان",
      active: true,
      mode: "manual",
      autoSort: "newest",
      limit: 8,
      categoryId: "",
      manualProductIds: [],
      sortOrder: byId.size + 1,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function readPriceNumber(value?: string | number | null) {
  const normalized = String(value ?? "").replace(/[^0-9.]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function calculateDiscountPercent(originalPrice: string, discountPrice: string) {
  const original = readPriceNumber(originalPrice);
  const discounted = readPriceNumber(discountPrice);

  if (original <= 0 || discounted <= 0 || discounted >= original) {
    return "";
  }

  return String(Math.round(((original - discounted) / original) * 100));
}

export function formatPrice(value?: string | number | null) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || !normalized) {
    return String(value || "");
  }

  return `$${parsed.toLocaleString("en-US")}`;
}

export function sortAdminShowcaseProducts(products: ProductForm[], sort: string) {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "cheapest":
        return readPriceNumber(a.discountPrice || a.price) - readPriceNumber(b.discountPrice || b.price);
      case "expensive":
        return readPriceNumber(b.discountPrice || b.price) - readPriceNumber(a.discountPrice || a.price);
      case "oldest":
        return Number(a.id) - Number(b.id);
      case "bestseller":
        return b.salesCount - a.salesCount;
      case "mostDiscounted":
        return Number(b.discountPercent || 0) - Number(a.discountPercent || 0);
      case "newest":
      default:
        return Number(b.id) - Number(a.id);
    }
  });
}

export function getShowcaseProductsForAdmin(products: ProductForm[], showcase: ShowcaseForm) {
  const activeProducts = products.filter((product) => product.isActive !== false);

  if (showcase.mode === "auto") {
    const filtered = activeProducts.filter((product) => !showcase.categoryId || product.categoryId === showcase.categoryId);
    return sortAdminShowcaseProducts(filtered, showcase.autoSort).slice(0, Math.max(1, showcase.limit));
  }

  const manualIds = showcase.manualProductIds.map((item) => String(item));
  if (manualIds.length > 0) {
    return manualIds
      .map((id) => activeProducts.find((product) => String(product.id) === id))
      .filter(Boolean) as ProductForm[];
  }

  return activeProducts.filter((product) => {
    const showcaseIds = product.showcaseIds.length > 0 ? product.showcaseIds : product.showcaseId ? [product.showcaseId] : [];
    return showcaseIds.includes(showcase.id);
  });
}

export function clampWholeNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function normalizeBannerTiming(banner: BannerForm): BannerForm {
  const homeSortOrder = clampWholeNumber(banner.homeSortOrder || banner.sortOrder, 1, 999, 1);
  const showcaseSortOrder = clampWholeNumber(banner.showcaseSortOrder || banner.sortOrder, 1, 999, 1);
  const categorySortOrder = clampWholeNumber(banner.categorySortOrder || banner.sortOrder, 1, 999, homeSortOrder);
  const productSortOrder = clampWholeNumber(banner.productSortOrder || banner.sortOrder, 1, 999, showcaseSortOrder);
  return {
    ...banner,
    showOnShowcase: banner.showOnShowcase && Boolean(banner.showcaseId),
    showOnCategories: banner.showOnCategories,
    showOnProducts: banner.showOnProducts,
    homeSortOrder,
    showcaseSortOrder,
    categorySortOrder,
    productSortOrder,
    sortOrder: homeSortOrder,
    intervalSeconds: clampWholeNumber(banner.intervalSeconds, 1, 60, 5),
    heightPercent: clampWholeNumber(banner.heightPercent, 10, 100, 28),
  };
}

export function storefrontKey(entry: { type: "banner" | "showcase" | "categoryGroup" | "brandGroup"; item: { id: string } }) {
  return `${entry.type}:${entry.item.id}`;
}
