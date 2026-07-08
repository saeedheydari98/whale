import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matchesSearchQuery } from "@/lib/product-search";
import { pageResult, pagination, parseMoney } from "@/lib/api/catalog-service";
import { withCatalogCache } from "@/lib/api/catalog-cache";

const STRUCTURE_TTL_SECONDS = 60;
const DETAILS_TTL_SECONDS = 45;
const LIST_TTL_SECONDS = 30;
const ADMIN_TTL_SECONDS = 10;

type ProductRecord = Prisma.ProductGetPayload<Record<string, never>>;

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

const productSummarySelect = {
  id: true,
  showcaseId: true,
  showcaseIds: true,
  title: true,
  description: true,
  slug: true,
  price: true,
  originalPrice: true,
  discountPrice: true,
  discountPercent: true,
  imageUrl: true,
  badge: true,
  ctaLabel: true,
  ctaHref: true,
  active: true,
  isActive: true,
  isFeatured: true,
  isAvailable: true,
  stockQuantity: true,
  stockStatus: true,
  salesCount: true,
  views: true,
  wishlistCount: true,
  ratingAverage: true,
  ratingCount: true,
  categoryId: true,
  categoryIds: true,
  brand: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type ProductSummaryRecord = Prisma.ProductGetPayload<{ select: typeof productSummarySelect }>;

export function slugifyCatalogValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampWholeNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeStringList(value: unknown, fallback: string[] = []) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;
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

function getPlacement(item: { placement?: number | string | null; sortOrder?: number | string | null } | undefined, fallback = 0) {
  if (Number.isFinite(Number(item?.placement))) return Number(item?.placement);
  if (Number.isFinite(Number(item?.sortOrder))) return Number(item?.sortOrder);
  return fallback;
}

function getBannerImageData(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as {
      urls?: unknown;
      imageUrls?: unknown;
      showcaseId?: unknown;
      showOnHome?: unknown;
      showOnShowcase?: unknown;
      showOnCategories?: unknown;
      showOnProducts?: unknown;
      homeSortOrder?: unknown;
      showcaseSortOrder?: unknown;
      categorySortOrder?: unknown;
      productSortOrder?: unknown;
    };
    const urls = Array.isArray(record.urls) ? record.urls : record.imageUrls;

    return {
      imageUrls: Array.isArray(urls) ? urls.map((item) => String(item)).filter(Boolean) : [],
      showcaseId: typeof record.showcaseId === "string" ? record.showcaseId : "",
      showOnHome: typeof record.showOnHome === "boolean" ? record.showOnHome : undefined,
      showOnShowcase: typeof record.showOnShowcase === "boolean" ? record.showOnShowcase : undefined,
      showOnCategories: typeof record.showOnCategories === "boolean" ? record.showOnCategories : undefined,
      showOnProducts: typeof record.showOnProducts === "boolean" ? record.showOnProducts : undefined,
      homeSortOrder: Number.isFinite(Number(record.homeSortOrder)) ? Number(record.homeSortOrder) : undefined,
      showcaseSortOrder: Number.isFinite(Number(record.showcaseSortOrder)) ? Number(record.showcaseSortOrder) : undefined,
      categorySortOrder: Number.isFinite(Number(record.categorySortOrder)) ? Number(record.categorySortOrder) : undefined,
      productSortOrder: Number.isFinite(Number(record.productSortOrder)) ? Number(record.productSortOrder) : undefined,
    };
  }

  return {
    imageUrls: Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [],
    showcaseId: "",
    showOnHome: undefined,
    showOnShowcase: undefined,
    showOnCategories: undefined,
    showOnProducts: undefined,
    homeSortOrder: undefined,
    showcaseSortOrder: undefined,
    categorySortOrder: undefined,
    productSortOrder: undefined,
  };
}

function toClientBanner(banner: BannerRecord) {
  const meta = getBannerImageData(banner.images);
  const imageUrls = meta.imageUrls;
  const showcaseId = String(banner.showcaseId ?? meta.showcaseId ?? "").trim();
  const hasExplicitTargets = typeof meta.showOnHome === "boolean"
    || typeof meta.showOnShowcase === "boolean"
    || typeof meta.showOnCategories === "boolean"
    || typeof meta.showOnProducts === "boolean";
  const showOnHome = hasExplicitTargets ? meta.showOnHome !== false : !showcaseId;
  const showOnShowcase = hasExplicitTargets ? meta.showOnShowcase === true : Boolean(showcaseId);
  const showOnCategories = meta.showOnCategories === true;
  const showOnProducts = typeof meta.showOnProducts === "boolean" ? meta.showOnProducts : showOnShowcase;
  const homeSortOrder = Number.isFinite(Number(meta.homeSortOrder)) ? Number(meta.homeSortOrder) : banner.sortOrder;
  const showcaseSortOrder = Number.isFinite(Number(meta.showcaseSortOrder)) ? Number(meta.showcaseSortOrder) : banner.sortOrder;
  const categorySortOrder = Number.isFinite(Number(meta.categorySortOrder)) ? Number(meta.categorySortOrder) : homeSortOrder;
  const productSortOrder = Number.isFinite(Number(meta.productSortOrder)) ? Number(meta.productSortOrder) : showcaseSortOrder;

  return {
    type: "banner" as const,
    id: banner.id,
    title: banner.title ?? "",
    showcaseId,
    images: imageUrls.map((url, index) => ({ url, placement: index + 1 })),
    imageUrls,
    active: banner.active,
    showOnHome,
    showOnShowcase,
    showOnCategories,
    showOnProducts,
    intervalSeconds: clampWholeNumber(banner.intervalSeconds, 1, 60, 5),
    heightPercent: clampWholeNumber(banner.heightPercent, 10, 100, 28),
    homeSortOrder,
    showcaseSortOrder,
    categorySortOrder,
    productSortOrder,
    sortOrder: homeSortOrder,
    placement: homeSortOrder,
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
    sortOrder: showcase.sortOrder,
    placement: showcase.sortOrder,
  };
}

function toClientCategory(category: {
  id: string;
  groupId?: string | null;
  title: string;
  slug: string;
  imageUrl?: string | null;
  active: boolean;
  sortOrder: number;
  pageSortOrder?: number;
}) {
  return {
    id: category.id,
    groupId: category.groupId ?? "default-categories",
    title: category.title,
    slug: category.slug,
    imageUrl: category.imageUrl ?? "",
    active: category.active,
    sortOrder: category.sortOrder,
    pageSortOrder: category.pageSortOrder ?? 1,
  };
}

function toClientBrand(brand: {
  id: string;
  groupId?: string | null;
  title: string;
  slug: string;
  imageUrl?: string | null;
  active: boolean;
  sortOrder: number;
  homeSortOrder?: number;
}) {
  return {
    id: brand.id,
    groupId: brand.groupId ?? "default-brands",
    title: brand.title,
    slug: brand.slug,
    imageUrl: brand.imageUrl ?? "",
    active: brand.active,
    sortOrder: brand.sortOrder,
    homeSortOrder: brand.homeSortOrder ?? 1,
  };
}

function toClientLinkGroup(group: {
  id: string;
  title: string;
  active: boolean;
  sortOrder: number;
}) {
  return {
    id: group.id,
    title: group.title,
    active: group.active,
    sortOrder: group.sortOrder,
  };
}

function toProductSummary(product: Partial<ProductRecord>) {
  const categoryIds = normalizeStringList(product.categoryIds, [String(product.categoryId ?? "general").trim() || "general"]);
  const showcaseIds = normalizeStringList(product.showcaseIds, product.showcaseId ? [String(product.showcaseId)] : []);
  const stockQuantity = Number.isFinite(Number(product.stockQuantity)) ? Math.max(0, Math.round(Number(product.stockQuantity))) : 0;
  const description = String(product.description ?? "");

  return {
    id: product.id,
    showcaseId: showcaseIds[0] ?? product.showcaseId ?? "",
    showcaseIds,
    title: String(product.title ?? ""),
    description: description.length > 180 ? `${description.slice(0, 180)}...` : description,
    slug: String(product.slug ?? ""),
    price: String(product.price ?? ""),
    originalPrice: product.originalPrice ?? "",
    discountPrice: product.discountPrice ?? "",
    discountPercent: product.discountPercent ?? 0,
    imageUrl: product.imageUrl ?? "",
    images: [],
    badge: product.badge ?? "",
    ctaLabel: product.ctaLabel ?? "مشاهده محصول",
    ctaHref: product.ctaHref ?? "",
    active: product.active !== false,
    isActive: product.isActive !== false,
    isFeatured: product.isFeatured === true,
    isAvailable: product.isAvailable !== false && stockQuantity > 0,
    stockQuantity,
    stockStatus: product.stockStatus ?? (stockQuantity > 0 ? "in_stock" : "out_of_stock"),
    salesCount: product.salesCount ?? 0,
    views: product.views ?? 0,
    wishlistCount: product.wishlistCount ?? 0,
    ratingAverage: product.ratingAverage ?? 0,
    ratingCount: product.ratingCount ?? 0,
    categoryId: categoryIds[0] || "general",
    categoryIds,
    brand: product.brand ?? "",
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    sortOrder: Number(product.sortOrder ?? 0),
    placement: Number(product.sortOrder ?? 0),
  };
}

function toProductDetail(product: ProductRecord) {
  const summary = toProductSummary(product);

  return {
    ...summary,
    description: product.description,
    images: Array.isArray(product.images) ? product.images.map((item) => String(item)).filter(Boolean) : [],
    videoUrl: product.videoUrl ?? "",
    minOrder: product.minOrder,
    maxOrder: product.maxOrder,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    manufactureYear: product.manufactureYear,
    vendor: product.vendor ?? "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    metaKeywords: product.metaKeywords ?? "",
    publishedAt: product.publishedAt,
    deletedAt: product.deletedAt,
    colorStock: normalizeColorStock(product.colorStock),
  };
}

function sortProductsBy(products: Array<Partial<ProductRecord>>, sort: string) {
  const time = (value: unknown) => {
    const parsed = new Date(String(value ?? "")).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return [...products].sort((a, b) => {
    switch (sort) {
      case "cheapest":
        return parseMoney(a.discountPrice || a.price) - parseMoney(b.discountPrice || b.price);
      case "expensive":
        return parseMoney(b.discountPrice || b.price) - parseMoney(a.discountPrice || a.price);
      case "oldest":
        return time(a.createdAt) - time(b.createdAt);
      case "bestseller":
        return Number(b.salesCount ?? 0) - Number(a.salesCount ?? 0);
      case "mostDiscounted":
      case "biggestDiscount":
        return Number(b.discountPercent ?? 0) - Number(a.discountPercent ?? 0);
      case "topRated":
        return Number(b.ratingAverage ?? 0) - Number(a.ratingAverage ?? 0);
      case "mostViewed":
        return Number(b.views ?? 0) - Number(a.views ?? 0);
      case "mostWished":
        return Number(b.wishlistCount ?? 0) - Number(a.wishlistCount ?? 0);
      case "newest":
        return time(b.createdAt) - time(a.createdAt);
      case "sortOrder":
      default:
        return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
    }
  });
}

function filterProducts(products: Array<Partial<ProductRecord>>, searchParams: URLSearchParams) {
  const query = String(searchParams.get("q") ?? searchParams.get("search") ?? "").trim();
  const badge = String(searchParams.get("badge") ?? "").trim();
  const onlyDiscounted = searchParams.get("discounted") === "1" || searchParams.get("hasDiscount") === "true";
  const inStock = searchParams.get("inStock") === "true";
  const minRatingParam = searchParams.get("minRating");
  const minRating = minRatingParam ? Number(minRatingParam) : NaN;
  const isActiveParam = searchParams.get("isActive");
  const isFeaturedParam = searchParams.get("isFeatured");
  const priceMinParam = searchParams.get("priceMin") ?? searchParams.get("minPrice");
  const priceMaxParam = searchParams.get("priceMax") ?? searchParams.get("maxPrice");
  const priceMin = priceMinParam ? Number(priceMinParam) : NaN;
  const priceMax = priceMaxParam ? Number(priceMaxParam) : NaN;

  return products.filter((product) => {
    if (query && !matchesSearchQuery(product, query)) return false;
    if (badge && String(product.badge ?? "") !== badge) return false;
    if (inStock && Number(product.stockQuantity ?? 0) <= 0) return false;
    if (Number.isFinite(minRating) && Number(product.ratingAverage ?? 0) < minRating) return false;
    if (isActiveParam !== null && (product.active !== false && product.isActive !== false) !== (isActiveParam === "true")) return false;
    if (isFeaturedParam !== null && Boolean(product.isFeatured) !== (isFeaturedParam === "true")) return false;
    if (onlyDiscounted) {
      const percent = Number(product.discountPercent || 0);
      if (!(percent > 0 || String(product.discountPrice || "").trim())) return false;
    }

    const price = parseMoney(product.discountPrice || product.price);
    if (Number.isFinite(priceMin) && price < priceMin) return false;
    if (Number.isFinite(priceMax) && price > priceMax) return false;
    return true;
  });
}

function paginateProducts<T>(items: T[], searchParams: URLSearchParams) {
  const { page, limit, skip } = pagination(searchParams);
  return pageResult(items.slice(skip, skip + limit), page, limit, items.length);
}

function getIncludeInactive(searchParams: URLSearchParams) {
  return searchParams.get("all") === "1";
}

function getTtl(searchParams: URLSearchParams, fallback = LIST_TTL_SECONDS) {
  return getIncludeInactive(searchParams) ? ADMIN_TTL_SECONDS : fallback;
}

async function getStructureData(includeInactive: boolean) {
  const [
    showcases,
    categories,
    categoryGroups,
    brands,
    brandGroups,
    banners,
  ] = await Promise.all([
    prisma.showcase.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    (prisma as any).category?.findMany
      ? (prisma as any).category.findMany({
          where: includeInactive ? undefined : { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    (prisma as any).categoryGroup?.findMany
      ? (prisma as any).categoryGroup.findMany({
          where: includeInactive ? undefined : { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    (prisma as any).brand?.findMany
      ? (prisma as any).brand.findMany({
          where: includeInactive ? undefined : { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    (prisma as any).brandGroup?.findMany
      ? (prisma as any).brandGroup.findMany({
          where: includeInactive ? undefined : { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    (prisma as any).banner?.findMany
      ? (prisma as any).banner.findMany({
          where: includeInactive ? undefined : { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const clientBanners = (banners as BannerRecord[]).map(toClientBanner);
  const clientShowcases = showcases.map(toClientShowcase);
  const clientCategories = categories.map(toClientCategory).sort((a: any, b: any) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const clientBrands = brands.map(toClientBrand).sort((a: any, b: any) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const clientCategoryGroups = categoryGroups.map(toClientLinkGroup).sort((a: any, b: any) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const clientBrandGroups = brandGroups.map(toClientLinkGroup).sort((a: any, b: any) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

  return {
    type: "root" as const,
    placement: 0,
    products: [],
    showcases: clientShowcases,
    categoryGroups: clientCategoryGroups,
    categories: clientCategories,
    brandGroups: clientBrandGroups,
    brands: clientBrands,
    banners: clientBanners,
    children: [
      ...clientBanners.filter((banner) => banner.showOnHome !== false),
      ...clientShowcases,
    ].sort((a, b) => Number(a.placement ?? 0) - Number(b.placement ?? 0)),
  };
}

export async function getCatalogStructure(searchParams: URLSearchParams) {
  const includeInactive = getIncludeInactive(searchParams);
  return withCatalogCache(
    "structure",
    [includeInactive ? "all" : "active"],
    getTtl(searchParams, STRUCTURE_TTL_SECONDS),
    () => getStructureData(includeInactive)
  );
}

export async function getProductList(searchParams: URLSearchParams, extra?: { where?: Prisma.ProductWhereInput; includeFull?: boolean }) {
  const includeInactive = getIncludeInactive(searchParams);
  const sort = String(searchParams.get("sort") ?? "sortOrder").trim();

  return withCatalogCache(
    "products",
    [searchParams, extra?.where ?? {}, extra?.includeFull ? "full" : "summary"],
    getTtl(searchParams),
    async () => {
      const products = await prisma.product.findMany({
        where: {
          ...(includeInactive ? {} : { active: true, isActive: true, deletedAt: null }),
          ...(extra?.where ?? {}),
        },
        ...(extra?.includeFull ? {} : { select: productSummarySelect }),
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      });
      const filtered = filterProducts(products as Array<Partial<ProductRecord>>, searchParams);
      const sorted = sortProductsBy(filtered, sort);
      const paged = paginateProducts(
        sorted.map((product) => extra?.includeFull ? toProductDetail(product as ProductRecord) : toProductSummary(product)),
        searchParams
      );

      return {
        products: paged,
      };
    }
  );
}

async function findCategory(identifier: string) {
  const decoded = decodeURIComponent(identifier);
  const slug = slugifyCatalogValue(decoded);
  if (!(prisma as any).category?.findMany) return null;

  const categories = await (prisma as any).category.findMany({
    where: {
      OR: [
        { id: decoded },
        { slug: decoded },
        { slug },
        { title: decoded },
      ],
    },
  });

  return categories[0] ?? null;
}

async function findBrand(identifier: string) {
  const decoded = decodeURIComponent(identifier);
  const slug = slugifyCatalogValue(decoded);
  if (!(prisma as any).brand?.findMany) return null;

  const brands = await (prisma as any).brand.findMany({
    where: {
      OR: [
        { id: decoded },
        { slug: decoded },
        { slug },
        { title: decoded },
      ],
    },
  });

  return brands[0] ?? null;
}

async function findShowcase(identifier: string) {
  const decoded = decodeURIComponent(identifier);
  const slug = slugifyCatalogValue(decoded);
  const showcases = await prisma.showcase.findMany({
    where: {
      OR: [
        { id: decoded },
        { title: decoded },
      ],
    },
  });

  return showcases.find((showcase: { id: string; title: string | null }) =>
    showcase.id === decoded
    || slugifyCatalogValue(showcase.title ?? showcase.id) === slug
  ) ?? null;
}

function productMatchesCategory(product: Partial<ProductRecord>, categoryId: string) {
  const categoryIds = normalizeStringList(product.categoryIds, [String(product.categoryId ?? "")]);
  return categoryIds.includes(categoryId);
}

function productMatchesBrand(product: Partial<ProductRecord>, brand: { id: string; title: string; slug?: string | null } | string) {
  const productBrand = String(product.brand ?? "");
  if (typeof brand === "string") return slugifyCatalogValue(productBrand) === slugifyCatalogValue(brand);

  return productBrand === brand.id
    || productBrand === brand.title
    || slugifyCatalogValue(productBrand) === slugifyCatalogValue(brand.slug || brand.title || brand.id);
}

function productMatchesShowcase(product: Partial<ProductRecord>, showcaseId: string) {
  const showcaseIds = normalizeStringList(product.showcaseIds, product.showcaseId ? [String(product.showcaseId)] : []);
  return showcaseIds.includes(showcaseId);
}

export async function getCategoryProducts(identifier: string, searchParams: URLSearchParams) {
  return withCatalogCache("category-products", [identifier, searchParams], getTtl(searchParams), async () => {
    const category = await findCategory(identifier);
    const categoryId = String(category?.id ?? decodeURIComponent(identifier));
    const products = await prisma.product.findMany({
      where: getIncludeInactive(searchParams) ? {} : { active: true, isActive: true, deletedAt: null },
      select: productSummarySelect,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const filtered = filterProducts(products.filter((product: ProductSummaryRecord) => productMatchesCategory(product, categoryId)), searchParams);
    const sorted = sortProductsBy(filtered, String(searchParams.get("sort") ?? "sortOrder"));

    return {
      category: category ? toClientCategory(category) : null,
      products: paginateProducts(sorted.map(toProductSummary), searchParams),
    };
  });
}

export async function getBrandProducts(identifier: string, searchParams: URLSearchParams) {
  return withCatalogCache("brand-products", [identifier, searchParams], getTtl(searchParams), async () => {
    const brand = await findBrand(identifier);
    const brandKey = brand ?? decodeURIComponent(identifier);
    const products = await prisma.product.findMany({
      where: getIncludeInactive(searchParams) ? {} : { active: true, isActive: true, deletedAt: null },
      select: productSummarySelect,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const filtered = filterProducts(products.filter((product: ProductSummaryRecord) => productMatchesBrand(product, brandKey)), searchParams);
    const sorted = sortProductsBy(filtered, String(searchParams.get("sort") ?? "sortOrder"));

    return {
      brand: brand ? toClientBrand(brand) : null,
      products: paginateProducts(sorted.map(toProductSummary), searchParams),
    };
  });
}

export async function getShowcaseProducts(identifier: string, searchParams: URLSearchParams) {
  return withCatalogCache("showcase-products", [identifier, searchParams], getTtl(searchParams), async () => {
    const showcase = await findShowcase(identifier);
    const showcaseId = String(showcase?.id ?? decodeURIComponent(identifier));
    const includeInactive = getIncludeInactive(searchParams);
    const products = await prisma.product.findMany({
      where: includeInactive ? {} : { active: true, isActive: true, deletedAt: null },
      select: productSummarySelect,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const mode = showcase?.mode === "auto" ? "auto" : "manual";
    const manualIds = Array.isArray(showcase?.manualProductIds)
      ? showcase.manualProductIds.map((item: unknown) => String(item))
      : [];
    const categoryId = String(showcase?.categoryId ?? "");
    const limit = Number.isFinite(Number(showcase?.limit)) ? Math.max(1, Number(showcase?.limit)) : 8;
    const baseProducts = mode === "auto"
      ? sortProductsBy(
          products.filter((product: ProductSummaryRecord) => !categoryId || productMatchesCategory(product, categoryId)),
          showcase?.autoSort ?? "newest"
        ).slice(0, limit)
      : manualIds.length > 0
        ? manualIds
            .map((id: string) => products.find((product: ProductSummaryRecord) => String(product.id) === id))
            .filter(Boolean) as typeof products
        : products.filter((product: ProductSummaryRecord) => productMatchesShowcase(product, showcaseId));
    const filtered = filterProducts(baseProducts, searchParams);
    const sorted = sortProductsBy(filtered, String(searchParams.get("sort") ?? "sortOrder"));
    const clientShowcase = showcase ? toClientShowcase(showcase) : {
      type: "showcase" as const,
      id: showcaseId,
      title: "",
      description: "",
      imageUrl: "",
      active: true,
      mode: "manual",
      autoSort: "newest",
      limit: 8,
      categoryId: "",
      manualProductIds: [],
      sortOrder: 0,
      placement: 0,
    };

    return {
      ...clientShowcase,
      products: paginateProducts(sorted.map(toProductSummary), searchParams),
    };
  });
}

async function findProductByIdentifier(identifier: string, includeInactive = false) {
  const decoded = decodeURIComponent(identifier);
  const maybeId = Number(decoded);
  const activeWhere = includeInactive ? {} : { active: true, isActive: true, deletedAt: null };

  if (Number.isInteger(maybeId) && maybeId > 0) {
    const product = await prisma.product.findFirst({
      where: { id: maybeId, ...activeWhere },
    });
    if (product) return product;
  }

  const slug = slugifyCatalogValue(decoded);
  const direct = await prisma.product.findFirst({
    where: {
      ...activeWhere,
      OR: [
        { slug: decoded },
        { slug },
        { title: decoded },
      ],
    },
  });
  if (direct) return direct;

  const candidates = await prisma.product.findMany({
    where: activeWhere,
  });

  return candidates.find((product: ProductRecord) =>
    slugifyCatalogValue(product.slug || "") === slug
    || slugifyCatalogValue(product.title || "") === slug
  ) ?? null;
}

export async function getRecommendationProducts(product: ProductRecord | null, searchParams: URLSearchParams) {
  const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit") ?? 8)));

  return withCatalogCache("recommendations", [product?.id ?? "global", searchParams], getTtl(searchParams, DETAILS_TTL_SECONDS), async () => {
    const categoryIds = product ? normalizeStringList(product.categoryIds, [product.categoryId]) : [];
    const related = await prisma.product.findMany({
      where: {
        active: true,
        isActive: true,
        deletedAt: null,
        ...(product?.id ? { id: { not: product.id } } : {}),
      },
      select: productSummarySelect,
      orderBy: [{ isFeatured: "desc" }, { ratingAverage: "desc" }, { createdAt: "desc" }],
      take: 80,
    });
    const sorted = related.filter((item: ProductSummaryRecord) => {
      if (!product) return true;
      if (product.brand && item.brand === product.brand) return true;
      return categoryIds.some((categoryId) => productMatchesCategory(item, categoryId));
    });
    const fallback = sorted.length > 0 ? sorted : related;

    return {
      products: fallback.slice(0, limit).map(toProductSummary),
    };
  });
}

export async function getProductDetail(identifier: string, searchParams: URLSearchParams, request?: Request) {
  const includeInactive = getIncludeInactive(searchParams);

  return withCatalogCache("product-detail", [identifier, includeInactive ? "all" : "active"], getTtl(searchParams, DETAILS_TTL_SECONDS), async () => {
    const product = await findProductByIdentifier(identifier, includeInactive);
    if (!product) return null;

    const commentsPromise = prisma.comment.findMany({
      where: { productId: product.id, active: true },
      orderBy: { createdAt: "desc" },
    });
    const recommendationsPromise = getRecommendationProducts(product, new URLSearchParams({ limit: String(searchParams.get("recommendationsLimit") ?? 8) }));
    const [comments, recommendations] = await Promise.all([commentsPromise, recommendationsPromise]);

    return {
      product: toProductDetail(product),
      comments,
      recommendations: recommendations.products,
      isPurchased: false,
      hasRated: false,
      requestScoped: Boolean(request),
    };
  });
}
