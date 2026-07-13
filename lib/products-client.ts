"use client";

import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";

const CATALOG_URL_ACTIVE = "/api/products";
const CATALOG_URL_ALL = "/api/products?all=1";
const CATALOG_STRUCTURE_URL_ACTIVE = "/api/catalog/structure";
const CATALOG_STRUCTURE_URL_ALL = "/api/catalog/structure?all=1";
const HOME_PAGE_STRUCTURE_URL = "/api/home/structure";
const CATEGORIES_PAGE_STRUCTURE_URL = "/api/categories/structure";
const PRODUCTS_PAGE_STRUCTURE_URL = "/api/products/structure";
const PAGE_STRUCTURE_CACHE_PREFIX = "catalog-page-structure:";
export const PRODUCTS_CATALOG_UPDATED_EVENT = "products-catalog-updated";

export type ProductRecord = {
  id?: number | string;
  showcaseId?: string;
  showcaseIds?: string[] | unknown;
  title: string;
  description: string;
  slug?: string;
  price: string;
  originalPrice?: string;
  discountPrice?: string;
  discountPercent?: number | string;
  imageUrl?: string;
  images?: string[] | unknown;
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
  categoryIds?: string[] | unknown;
  manufactureYear?: number | string | null;
  brand?: string;
  vendor?: string;
  sku?: string;
  barcode?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  placement?: number | string;
  publishedAt?: string | null;
  deletedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  colorStock?: unknown;
  sortOrder: number;
};

export type ShowcaseRecord = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  active?: boolean;
  mode?: "manual" | "auto" | string;
  autoSort?: string;
  limit?: number | string;
  categoryId?: string | null;
  manualProductIds?: Array<number | string> | unknown;
  sortOrder?: number;
  placement?: number | string;
  products?: ProductRecord[];
};

export type CategoryRecord = {
  id: string;
  groupId?: string | null;
  title: string;
  slug?: string;
  imageUrl?: string | null;
  active?: boolean;
  sortOrder?: number | string;
  pageSortOrder?: number | string;
};

export type BrandRecord = {
  id: string;
  groupId?: string | null;
  title: string;
  slug?: string;
  imageUrl?: string | null;
  active?: boolean;
  sortOrder?: number | string;
  homeSortOrder?: number | string;
};

export type CatalogLinkGroupRecord = {
  id: string;
  title: string;
  active?: boolean;
  sortOrder?: number | string;
};

export type BannerRecord = {
  id: string;
  title?: string;
  showcaseId?: string | null;
  imageUrls?: string[];
  images?: unknown;
  active?: boolean;
  showOnHome?: boolean;
  showOnShowcase?: boolean;
  showOnCategories?: boolean;
  showOnProducts?: boolean;
  intervalSeconds?: number | string;
  heightPercent?: number | string;
  homeSortOrder?: number | string;
  showcaseSortOrder?: number | string;
  categorySortOrder?: number | string;
  productSortOrder?: number | string;
  sortOrder?: number;
  placement?: number | string;
};

export type CatalogTreeSection =
  | {
      type: "banner";
      sortOrder: number;
      item: BannerRecord;
    }
  | {
      type: "showcase";
      sortOrder: number;
      item: ShowcaseRecord;
      products: ProductRecord[];
    };

export type CatalogTree = {
  sections: CatalogTreeSection[];
};

export type CatalogObject = {
  placement?: number;
  showcases: Array<ShowcaseRecord & { products: ProductRecord[] }>;
  categoryGroups: CatalogLinkGroupRecord[];
  categories: CategoryRecord[];
  brandGroups: CatalogLinkGroupRecord[];
  brands: BrandRecord[];
  banners: BannerRecord[];
};

type CatalogApiTree = {
  type?: "root";
  placement?: number | string;
  categories?: CategoryRecord[];
  categoryGroups?: CatalogLinkGroupRecord[];
  brands?: BrandRecord[];
  brandGroups?: CatalogLinkGroupRecord[];
  banners?: BannerRecord[];
  children?: Array<
    | (BannerRecord & { type: "banner" })
    | (ShowcaseRecord & { type: "showcase"; products?: ProductRecord[] })
  >;
};

export type ProductsCache = {
  products: ProductRecord[];
  showcases: ShowcaseRecord[];
  categories: CategoryRecord[];
  categoryGroups: CatalogLinkGroupRecord[];
  brands: BrandRecord[];
  brandGroups: CatalogLinkGroupRecord[];
  banners: BannerRecord[];
  tree: CatalogTree;
  catalog: CatalogObject;
};

export type ProductPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductPageResult = {
  products: ProductRecord[];
  pagination: ProductPagination;
};

export type SectionProductsResult<TSection> = ProductPageResult & {
  section: TSection | null;
};

export type ProductDetailResult = {
  product: ProductRecord | null;
  comments: unknown[];
  recommendations: ProductRecord[];
  isPurchased?: boolean;
  hasRated?: boolean;
};

export function slugifyCatalogValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function decodeCatalogSegment(value: string | number | null | undefined) {
  const text = String(value ?? "");
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function catalogMatchCandidates(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  const decoded = decodeCatalogSegment(raw);
  return new Set([
    raw,
    decoded,
    slugifyCatalogValue(raw),
    slugifyCatalogValue(decoded),
  ].filter(Boolean));
}

export function productSlug(product: Partial<ProductRecord>) {
  return slugifyCatalogValue(product.slug || product.title || product.id || "");
}

export function showcaseSlug(showcase: Partial<ShowcaseRecord>) {
  return slugifyCatalogValue(showcase.title || showcase.id || "");
}

export function isProductAvailable(product: Partial<ProductRecord>) {
  return product.isAvailable !== false && Number(product.stockQuantity ?? 0) > 0;
}

export function getStockStatusLabel(value?: string | null) {
  const status = String(value ?? "").trim();
  if (status === "in_stock") return "موجود";
  if (status === "out_of_stock") return "ناموجود";
  return status;
}

export type GetProductsOptions = {
  /** Include inactive products (admin). */
  all?: boolean;
  /** Include full product fields for admin edit forms. */
  full?: boolean;
  /** Bypass session cache and refetch. */
  force?: boolean;
};

function getProductKey(product: Partial<ProductRecord>) {
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

function dedupeProducts(products: ProductRecord[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = getProductKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function emptyProductsCache(): ProductsCache {
  return {
    products: [],
    showcases: [],
    categories: [],
    categoryGroups: [],
    brands: [],
    brandGroups: [],
    banners: [],
    tree: { sections: [] },
    catalog: { placement: 0, showcases: [], categoryGroups: [], categories: [], brandGroups: [], brands: [], banners: [] },
  };
}

function getPlacement(item: { placement?: number | string; sortOrder?: number | string } | undefined, fallback = 0) {
  if (Number.isFinite(Number(item?.placement))) return Number(item?.placement);
  if (Number.isFinite(Number(item?.sortOrder))) return Number(item?.sortOrder);
  return fallback;
}

function getBannerImageUrls(banner: BannerRecord) {
  if (Array.isArray(banner.imageUrls)) {
    return banner.imageUrls.map((item) => String(item)).filter(Boolean);
  }

  if (banner.images && typeof banner.images === "object" && !Array.isArray(banner.images)) {
    const images = banner.images as { urls?: unknown; imageUrls?: unknown };
    const urls = Array.isArray(images.urls) ? images.urls : images.imageUrls;
    return Array.isArray(urls) ? urls.map((item) => String(item)).filter(Boolean) : [];
  }

  if (!Array.isArray(banner.images)) return [];

  return banner.images
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item) {
        return String((item as { url?: unknown }).url ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

function getBannerMeta(banner: BannerRecord) {
  const images = banner.images && typeof banner.images === "object" && !Array.isArray(banner.images)
    ? banner.images as Partial<BannerRecord>
    : {};
  const showcaseId = String(banner.showcaseId ?? images.showcaseId ?? "").trim();
  const hasExplicitTargets = typeof banner.showOnHome === "boolean"
    || typeof banner.showOnShowcase === "boolean"
    || typeof banner.showOnCategories === "boolean"
    || typeof banner.showOnProducts === "boolean"
    || typeof images.showOnHome === "boolean"
    || typeof images.showOnShowcase === "boolean"
    || typeof images.showOnCategories === "boolean"
    || typeof images.showOnProducts === "boolean";
  const showOnHome = hasExplicitTargets
    ? (banner.showOnHome ?? images.showOnHome) !== false
    : !showcaseId;
  const showOnShowcase = hasExplicitTargets
    ? (banner.showOnShowcase ?? images.showOnShowcase) === true
    : Boolean(showcaseId);
  const showOnCategories = typeof banner.showOnCategories === "boolean"
    ? banner.showOnCategories
    : typeof images.showOnCategories === "boolean"
      ? images.showOnCategories
      : false;
  const showOnProducts = typeof banner.showOnProducts === "boolean"
    ? banner.showOnProducts
    : typeof images.showOnProducts === "boolean"
      ? images.showOnProducts
      : showOnShowcase;
  const homeSortOrder = Number.isFinite(Number(banner.homeSortOrder ?? images.homeSortOrder))
    ? Number(banner.homeSortOrder ?? images.homeSortOrder)
    : getPlacement(banner, 0);
  const showcaseSortOrder = Number.isFinite(Number(banner.showcaseSortOrder ?? images.showcaseSortOrder))
    ? Number(banner.showcaseSortOrder ?? images.showcaseSortOrder)
    : getPlacement(banner, 0);
  const categorySortOrder = Number.isFinite(Number(banner.categorySortOrder ?? images.categorySortOrder))
    ? Number(banner.categorySortOrder ?? images.categorySortOrder)
    : homeSortOrder;
  const productSortOrder = Number.isFinite(Number(banner.productSortOrder ?? images.productSortOrder))
    ? Number(banner.productSortOrder ?? images.productSortOrder)
    : showcaseSortOrder;

  return { showcaseId, showOnHome, showOnShowcase, showOnCategories, showOnProducts, homeSortOrder, showcaseSortOrder, categorySortOrder, productSortOrder };
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

export function normalizeStringList(value: unknown, fallback: string[] = []) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;
}

function normalizeProductRecord(product: ProductRecord, fallbackOrder: number): ProductRecord {
  const placement = getPlacement(product, fallbackOrder);
  const stockQuantity = Number.isFinite(Number(product.stockQuantity)) ? Math.max(0, Math.round(Number(product.stockQuantity))) : 0;
  const imageList = Array.isArray(product.images)
    ? product.images.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    ...product,
    slug: String(product.slug ?? productSlug(product)),
    ctaLabel: "مشاهده محصول",
    images: imageList,
    active: product.active !== false && product.isActive !== false,
    isActive: product.isActive !== false && product.active !== false,
    isFeatured: product.isFeatured === true,
    isAvailable: product.isAvailable !== false && stockQuantity > 0,
    stockQuantity,
    stockStatus: String(product.stockStatus ?? (stockQuantity > 0 ? "in_stock" : "out_of_stock")),
    minOrder: Number.isFinite(Number(product.minOrder)) ? Math.max(1, Math.round(Number(product.minOrder))) : 1,
    maxOrder: Number.isFinite(Number(product.maxOrder)) ? Math.max(1, Math.round(Number(product.maxOrder))) : null,
    salesCount: Number.isFinite(Number(product.salesCount)) ? Math.max(0, Math.round(Number(product.salesCount))) : 0,
    views: Number.isFinite(Number(product.views)) ? Math.max(0, Math.round(Number(product.views))) : 0,
    wishlistCount: Number.isFinite(Number(product.wishlistCount)) ? Math.max(0, Math.round(Number(product.wishlistCount))) : 0,
    ratingAverage: Number.isFinite(Number(product.ratingAverage)) ? Math.max(0, Math.min(5, Number(product.ratingAverage))) : 0,
    ratingCount: Number.isFinite(Number(product.ratingCount)) ? Math.max(0, Math.round(Number(product.ratingCount))) : 0,
    categoryId: normalizeStringList(product.categoryIds, [String(product.categoryId ?? "general").trim() || "general"])[0] || "general",
    categoryIds: normalizeStringList(product.categoryIds, [String(product.categoryId ?? "general").trim() || "general"]),
    showcaseIds: normalizeStringList(product.showcaseIds, product.showcaseId ? [String(product.showcaseId)] : []),
    manufactureYear: Number.isFinite(Number(product.manufactureYear)) ? Math.round(Number(product.manufactureYear)) : null,
    colorStock: normalizeColorStock(product.colorStock),
    sortOrder: placement,
    placement,
  };
}

function normalizeShowcaseRecord(showcase: ShowcaseRecord, fallbackOrder: number): ShowcaseRecord {
  const placement = getPlacement(showcase, fallbackOrder);
  const manualProductIds = Array.isArray(showcase.manualProductIds)
    ? showcase.manualProductIds.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    ...showcase,
    active: showcase.active !== false,
    mode: showcase.mode === "auto" ? "auto" : "manual",
    autoSort: String(showcase.autoSort ?? "newest"),
    limit: Number.isFinite(Number(showcase.limit)) ? Math.max(1, Math.round(Number(showcase.limit))) : 8,
    categoryId: String(showcase.categoryId ?? ""),
    manualProductIds,
    sortOrder: placement,
    placement,
  };
}

function normalizeCategoryRecord(category: CategoryRecord, fallbackOrder: number): CategoryRecord {
  const placement = getPlacement(category, fallbackOrder);
  const title = String(category.title ?? category.id ?? "").trim();
  const slug = slugifyCatalogValue((category.slug || title || category.id) ?? "");

  return {
    id: String(category.id ?? (slug || `category-${fallbackOrder}`)),
    groupId: String(category.groupId ?? "default-categories"),
    title: title || `Category ${fallbackOrder}`,
    slug,
    imageUrl: String(category.imageUrl ?? "").trim(),
    active: category.active !== false,
    sortOrder: placement,
    pageSortOrder: Number.isFinite(Number(category.pageSortOrder)) ? Number(category.pageSortOrder) : 1,
  };
}

function normalizeBrandRecord(brand: BrandRecord, fallbackOrder: number): BrandRecord {
  const placement = getPlacement(brand, fallbackOrder);
  const title = String(brand.title ?? brand.id ?? "").trim();
  const slug = slugifyCatalogValue((brand.slug || title || brand.id) ?? "");

  return {
    id: String(brand.id ?? (slug || `brand-${fallbackOrder}`)),
    groupId: String(brand.groupId ?? "default-brands"),
    title: title || `Brand ${fallbackOrder}`,
    slug,
    imageUrl: String(brand.imageUrl ?? "").trim(),
    active: brand.active !== false,
    sortOrder: placement,
    homeSortOrder: Number.isFinite(Number(brand.homeSortOrder)) ? Number(brand.homeSortOrder) : 1,
  };
}

function normalizeLinkGroupRecord(group: CatalogLinkGroupRecord, fallbackOrder: number): CatalogLinkGroupRecord {
  const title = String(group.title ?? group.id ?? "").trim();
  const slug = slugifyCatalogValue(group.id || title || `group-${fallbackOrder}`);

  return {
    id: String(group.id ?? slug),
    title: title || `Group ${fallbackOrder}`,
    active: group.active !== false,
    sortOrder: Number.isFinite(Number(group.sortOrder)) ? Number(group.sortOrder) : fallbackOrder,
  };
}

function normalizeBannerRecord(banner: BannerRecord, fallbackOrder: number): BannerRecord {
  const placement = getPlacement(banner, fallbackOrder);
  const imageUrls = getBannerImageUrls(banner);
  const meta = getBannerMeta(banner);

  return {
    ...banner,
    ...meta,
    imageUrls,
    active: banner.active !== false,
    intervalSeconds: Number.isFinite(Number(banner.intervalSeconds)) ? Math.max(1, Math.round(Number(banner.intervalSeconds))) : 5,
    heightPercent: Number.isFinite(Number(banner.heightPercent)) ? Math.max(10, Math.min(100, Math.round(Number(banner.heightPercent)))) : 28,
    sortOrder: meta.homeSortOrder || placement,
    placement: meta.homeSortOrder || placement,
  };
}

function readTreePayload(payload: unknown): CatalogObject | null {
  if (!payload || typeof payload !== "object") return null;

  const tree = payload as CatalogApiTree;
  const children = Array.isArray(tree.children) ? tree.children : [];
  const bannerSource = Array.isArray(tree.banners) ? tree.banners : children.filter((item) => item.type === "banner");
  if (!Array.isArray(tree.children) && !Array.isArray(tree.banners) && !Array.isArray(tree.categories) && !Array.isArray(tree.brands) && !Array.isArray(tree.categoryGroups) && !Array.isArray(tree.brandGroups)) return null;

  const showcases = children
    .filter((item) => item.type === "showcase")
    .map((showcase, showcaseIndex) => ({
      ...normalizeShowcaseRecord(showcase as ShowcaseRecord, showcaseIndex + 1),
      products: Array.isArray((showcase as ShowcaseRecord).products)
        ? ((showcase as ShowcaseRecord).products ?? []).map((product, productIndex) =>
            normalizeProductRecord(
              {
                ...product,
                showcaseId: String(product.showcaseId ?? showcase.id),
              },
              productIndex + 1
            )
          )
        : [],
    }));

  const banners = bannerSource
    .map((banner, bannerIndex) => normalizeBannerRecord(banner as BannerRecord, bannerIndex + 1));

  return {
    placement: getPlacement(tree, 0),
    showcases,
    categoryGroups: Array.isArray(tree.categoryGroups) ? tree.categoryGroups.map(normalizeLinkGroupRecord) : [],
    categories: Array.isArray(tree.categories) ? tree.categories.map(normalizeCategoryRecord) : [],
    brandGroups: Array.isArray(tree.brandGroups) ? tree.brandGroups.map(normalizeLinkGroupRecord) : [],
    brands: Array.isArray(tree.brands) ? tree.brands.map(normalizeBrandRecord) : [],
    banners,
  };
}

function parseApiPayload(payload: unknown): ProductsCache {
  if (Array.isArray(payload)) {
    return {
      ...emptyProductsCache(),
      products: dedupeProducts((payload as ProductRecord[]).map(normalizeProductRecord)),
    };
  }

  if (!payload || typeof payload !== "object") {
    return emptyProductsCache();
  }

  const record = payload as {
    products?: ProductRecord[];
    showcases?: ShowcaseRecord[];
    categoryGroups?: CatalogLinkGroupRecord[];
    categories?: CategoryRecord[];
    brandGroups?: CatalogLinkGroupRecord[];
    brands?: BrandRecord[];
    banners?: BannerRecord[];
    children?: Array<
      | (BannerRecord & { type: "banner" })
      | (ShowcaseRecord & { type: "showcase"; products?: ProductRecord[] })
    >;
    tree?: CatalogTree;
    catalog?: Partial<CatalogObject>;
  };
  const treeCatalog = readTreePayload(payload);

  const catalogShowcases = treeCatalog
    ? treeCatalog.showcases
    : Array.isArray(record.catalog?.showcases)
      ? record.catalog.showcases.map((showcase, showcaseIndex) => ({
        ...normalizeShowcaseRecord(showcase, showcaseIndex + 1),
        products: Array.isArray(showcase.products)
          ? showcase.products.map((product, productIndex) =>
              normalizeProductRecord(
                {
                  ...product,
                  showcaseId: String(product.showcaseId ?? showcase.id),
                },
                productIndex + 1
              )
            )
          : [],
      }))
      : [];
  const catalogBanners = treeCatalog
    ? treeCatalog.banners
    : Array.isArray(record.catalog?.banners)
      ? record.catalog.banners.map(normalizeBannerRecord)
      : [];
  const fallbackProducts = Array.isArray(record.products)
    ? record.products.map(normalizeProductRecord)
    : [];
  const products = fallbackProducts.length > 0
    ? fallbackProducts
    : catalogShowcases.flatMap((showcase) => showcase.products);
  const showcases = catalogShowcases.length > 0
    ? catalogShowcases.map(({ products: _products, ...showcase }) => showcase)
    : Array.isArray(record.showcases)
      ? record.showcases.map(normalizeShowcaseRecord)
      : [];
  const banners = catalogBanners.length > 0
    ? catalogBanners
    : Array.isArray(record.banners)
      ? record.banners.map(normalizeBannerRecord)
      : [];
  const categories = treeCatalog?.categories && treeCatalog.categories.length > 0
    ? treeCatalog.categories
    : Array.isArray(record.categories)
      ? record.categories.map(normalizeCategoryRecord)
      : Array.isArray(record.catalog?.categories)
        ? record.catalog.categories.map(normalizeCategoryRecord)
        : [];
  const brands = treeCatalog?.brands && treeCatalog.brands.length > 0
    ? treeCatalog.brands
    : Array.isArray(record.brands)
      ? record.brands.map(normalizeBrandRecord)
      : Array.isArray(record.catalog?.brands)
        ? record.catalog.brands.map(normalizeBrandRecord)
        : [];
  const fallbackCategories = categories.length > 0
    ? categories
    : Array.from(new Set(products.flatMap((product) => normalizeStringList(product.categoryIds, [String(product.categoryId ?? "")]))))
        .filter(Boolean)
        .map((categoryId, index) => normalizeCategoryRecord({ id: categoryId, title: categoryId, slug: categoryId }, index + 1));
  const categoryGroups = treeCatalog?.categoryGroups && treeCatalog.categoryGroups.length > 0
    ? treeCatalog.categoryGroups
    : Array.isArray(record.categoryGroups)
      ? record.categoryGroups.map(normalizeLinkGroupRecord)
      : Array.isArray(record.catalog?.categoryGroups)
        ? record.catalog.categoryGroups.map(normalizeLinkGroupRecord)
        : [{ id: "default-categories", title: "دسته بندی ها", active: true, sortOrder: Number(fallbackCategories[0]?.pageSortOrder ?? 1) }];
  const brandGroups = treeCatalog?.brandGroups && treeCatalog.brandGroups.length > 0
    ? treeCatalog.brandGroups
    : Array.isArray(record.brandGroups)
      ? record.brandGroups.map(normalizeLinkGroupRecord)
      : Array.isArray(record.catalog?.brandGroups)
        ? record.catalog.brandGroups.map(normalizeLinkGroupRecord)
        : [{ id: "default-brands", title: "برندها", active: true, sortOrder: Number(brands[0]?.homeSortOrder ?? 1) }];
  const categoriesWithGroups = fallbackCategories.map((category) => ({
    ...category,
    groupId: category.groupId || categoryGroups[0]?.id || "default-categories",
  }));
  const brandsWithGroups = brands.map((brand) => ({
    ...brand,
    groupId: brand.groupId || brandGroups[0]?.id || "default-brands",
  }));

  return {
    products: dedupeProducts(products),
    showcases,
    categoryGroups,
    categories: categoriesWithGroups,
    brandGroups,
    brands: brandsWithGroups,
    banners,
    tree:
      record.tree && Array.isArray(record.tree.sections)
        ? record.tree
        : { sections: [] },
    catalog: {
      placement: Number(treeCatalog?.placement ?? record.catalog?.placement ?? 0),
      showcases: catalogShowcases,
      categoryGroups,
      categories: categoriesWithGroups,
      brandGroups,
      brands: brandsWithGroups,
      banners: catalogBanners,
    },
  };
}

function resolveTree(apiData: ProductsCache): CatalogTree {
  const tree =
    apiData.tree.sections.length > 0
      ? apiData.tree
      : {
          sections: [
            ...apiData.banners.map((banner, index) => ({
              type: "banner" as const,
              sortOrder: Number(banner.homeSortOrder ?? getPlacement(banner, index + 1)),
              item: banner,
            })).filter((section) => section.item.showOnHome !== false),
            ...apiData.showcases.map((showcase, index) => ({
              type: "showcase" as const,
              sortOrder: getPlacement(showcase, index + 1),
              item: showcase,
              products: resolveShowcaseProducts(apiData.products, showcase, true),
            })),
          ].sort((a, b) => a.sortOrder - b.sortOrder),
        };

  return tree;
}

export function sortProductsBy(products: ProductRecord[], sort: string) {
  const price = (product: ProductRecord) => {
    const parsed = Number(String(product.discountPrice || product.price || "").replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const time = (value: unknown) => {
    const parsed = new Date(String(value ?? "")).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return [...products].sort((a, b) => {
    switch (sort) {
      case "cheapest":
        return price(a) - price(b);
      case "expensive":
        return price(b) - price(a);
      case "oldest":
        return time((a as { createdAt?: unknown }).createdAt) - time((b as { createdAt?: unknown }).createdAt);
      case "bestseller":
        return Number(b.salesCount ?? 0) - Number(a.salesCount ?? 0);
      case "mostDiscounted":
      case "biggestDiscount":
        return Number(b.discountPercent ?? 0) - Number(a.discountPercent ?? 0);
      case "newest":
      default:
        return time((b as { createdAt?: unknown }).createdAt) - time((a as { createdAt?: unknown }).createdAt);
    }
  });
}

export function resolveShowcaseProducts(
  products: ProductRecord[],
  showcase: ShowcaseRecord,
  applyLimit: boolean
) {
  const activeProducts = products.filter((product) => product.active !== false && product.isActive !== false);
  const mode = showcase.mode === "auto" ? "auto" : "manual";
  const limit = Number.isFinite(Number(showcase.limit)) ? Math.max(1, Math.round(Number(showcase.limit))) : 8;
  const categoryId = String(showcase.categoryId ?? "").trim();

  if (mode === "auto") {
    const filtered = activeProducts.filter((product) => {
      const categoryIds = normalizeStringList(product.categoryIds, [String(product.categoryId ?? "")]);
      return !categoryId || categoryIds.includes(categoryId);
    });
    const sorted = sortProductsBy(filtered, String(showcase.autoSort ?? "newest"));
    return applyLimit ? sorted.slice(0, limit) : sorted;
  }

  const manualIds = Array.isArray(showcase.manualProductIds)
    ? showcase.manualProductIds.map((item) => String(item))
    : [];

  if (manualIds.length > 0) {
    const byId = new Map(activeProducts.map((product) => [String(product.id), product]));
    return manualIds.map((id) => byId.get(id)).filter(Boolean) as ProductRecord[];
  }

  return activeProducts.filter((product) => {
    const showcaseIds = normalizeStringList(product.showcaseIds, product.showcaseId ? [String(product.showcaseId)] : []);
    return showcaseIds.includes(String(showcase.id));
  });
}

function withResolvedTree(apiData: ProductsCache): ProductsCache {
  return { ...apiData, tree: resolveTree(apiData) };
}

function resolveOptions(options?: boolean | GetProductsOptions): GetProductsOptions {
  if (typeof options === "boolean") return { force: options };
  return options ?? {};
}

function withQuery(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === false || value === "") continue;
    searchParams.set(key, value === true ? "1" : String(value));
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function parsePagination(value: unknown, fallbackCount: number): ProductPagination {
  const record = value && typeof value === "object" ? value as Partial<ProductPagination> : {};
  const page = Number.isFinite(Number(record.page)) ? Number(record.page) : 1;
  const limit = Number.isFinite(Number(record.limit)) ? Number(record.limit) : fallbackCount || 1;
  const total = Number.isFinite(Number(record.total)) ? Number(record.total) : fallbackCount;
  const totalPages = Number.isFinite(Number(record.totalPages)) ? Number(record.totalPages) : Math.max(1, Math.ceil(total / limit));

  return { page, limit, total, totalPages };
}

function parseProductPage(data: unknown): ProductPageResult {
  const record = data && typeof data === "object" ? data as {
    products?: ProductRecord[] | { items?: ProductRecord[]; page?: number; limit?: number; total?: number; totalPages?: number };
    pagination?: ProductPagination;
  } : {};
  const productContainer = record.products;
  const products = Array.isArray(productContainer)
    ? productContainer
    : Array.isArray(productContainer?.items)
      ? productContainer.items
      : [];
  const pagination = Array.isArray(productContainer)
    ? parsePagination(record.pagination, products.length)
    : parsePagination(productContainer, products.length);

  return {
    products: products.map(normalizeProductRecord),
    pagination,
  };
}

export async function getCatalogStructure(options?: boolean | GetProductsOptions): Promise<ProductsCache> {
  const { all = false, force = false } = resolveOptions(options);
  const url = all ? CATALOG_STRUCTURE_URL_ALL : CATALOG_STRUCTURE_URL_ACTIVE;

  try {
    const json = await fetchJsonDeduped<{ data?: unknown }>(url, { force });
    return withResolvedTree(parseApiPayload(json?.data));
  } catch {
    return emptyProductsCache();
  }
}

async function getPageStructure(url: string, options?: Pick<GetProductsOptions, "force">): Promise<ProductsCache> {
  try {
    const json = await fetchJsonDeduped<{ data?: unknown }>(url, { force: options?.force });
    const page = withResolvedTree(parseApiPayload(json?.data));
    writeCachedPageStructure(url, page);
    return page;
  } catch {
    return readCachedPageStructure(url) ?? emptyProductsCache();
  }
}

function pageStructureCacheKey(url: string) {
  return `${PAGE_STRUCTURE_CACHE_PREFIX}${url}`;
}

function readCachedPageStructure(url: string): ProductsCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(pageStructureCacheKey(url));
    if (!raw) return null;
    return withResolvedTree(parseApiPayload(JSON.parse(raw)));
  } catch {
    return null;
  }
}

function writeCachedPageStructure(url: string, page: ProductsCache) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(pageStructureCacheKey(url), JSON.stringify(page));
  } catch {
  }
}

export function getHomePageStructure(options?: Pick<GetProductsOptions, "force">) {
  return getPageStructure(HOME_PAGE_STRUCTURE_URL, options);
}

export function readCachedHomePageStructure() {
  return readCachedPageStructure(HOME_PAGE_STRUCTURE_URL);
}

export function getCategoriesPageStructure(options?: Pick<GetProductsOptions, "force">) {
  return getPageStructure(CATEGORIES_PAGE_STRUCTURE_URL, options);
}

export function readCachedCategoriesPageStructure() {
  return readCachedPageStructure(CATEGORIES_PAGE_STRUCTURE_URL);
}

export function getProductsPageStructure(options?: Pick<GetProductsOptions, "force">) {
  return getPageStructure(PRODUCTS_PAGE_STRUCTURE_URL, options);
}

export function readCachedProductsPageStructure() {
  return readCachedPageStructure(PRODUCTS_PAGE_STRUCTURE_URL);
}

export function getCategoryPageStructure(id: string | number, options?: Pick<GetProductsOptions, "force">) {
  return getPageStructure(`/api/category/${encodeURIComponent(String(id))}/structure`, options);
}

export function getBrandPageStructure(id: string | number, options?: Pick<GetProductsOptions, "force">) {
  return getPageStructure(`/api/brand/${encodeURIComponent(String(id))}/structure`, options);
}

export function getShowcasePageStructure(id: string | number, options?: Pick<GetProductsOptions, "force">) {
  return getPageStructure(`/api/showcase/${encodeURIComponent(String(id))}/structure`, options);
}

export function getProductDetailPageStructure(id: string | number, options?: Pick<GetProductsOptions, "force">) {
  return getPageStructure(`/api/products/${encodeURIComponent(String(id))}/structure`, options);
}

export async function getProductPage(
  params?: Record<string, string | number | boolean | null | undefined>,
  options?: GetProductsOptions
): Promise<ProductPageResult> {
  const { all = false, full = false, force = false } = options ?? {};
  const url = withQuery(CATALOG_URL_ACTIVE, {
    ...params,
    all,
    ...(full ? { fields: "full" } : {}),
  });

  try {
    const json = await fetchJsonDeduped<{ data?: unknown }>(url, { force });
    return parseProductPage(json?.data);
  } catch {
    return {
      products: [],
      pagination: parsePagination(null, 0),
    };
  }
}

async function getSectionProducts<TSection>(
  url: string,
  sectionKey: "showcase" | "category" | "brand",
  force = false
): Promise<SectionProductsResult<TSection>> {
  try {
    const json = await fetchJsonDeduped<{ data?: unknown }>(url, { force });
    const data = json?.data && typeof json.data === "object" ? json.data as Record<string, unknown> : {};
    const page = parseProductPage(data);
    const section = sectionKey === "showcase" ? data : data[sectionKey] ?? null;

    return {
      ...page,
      section: section as TSection | null,
    };
  } catch {
    return {
      products: [],
      pagination: parsePagination(null, 0),
      section: null,
    };
  }
}

export function getShowcaseProducts(
  id: string | number,
  params?: Record<string, string | number | boolean | null | undefined>,
  options?: Pick<GetProductsOptions, "force">
) {
  return getSectionProducts<ShowcaseRecord>(
    withQuery(`/api/showcase/${encodeURIComponent(String(id))}/products`, params),
    "showcase",
    options?.force
  );
}

export function getCategoryProducts(
  id: string | number,
  params?: Record<string, string | number | boolean | null | undefined>,
  options?: Pick<GetProductsOptions, "force">
) {
  return getSectionProducts<CategoryRecord>(
    withQuery(`/api/category/${encodeURIComponent(String(id))}/products`, params),
    "category",
    options?.force
  );
}

export function getBrandProducts(
  id: string | number,
  params?: Record<string, string | number | boolean | null | undefined>,
  options?: Pick<GetProductsOptions, "force">
) {
  return getSectionProducts<BrandRecord>(
    withQuery(`/api/brand/${encodeURIComponent(String(id))}/products`, params),
    "brand",
    options?.force
  );
}

export async function getProductDetail(
  id: string | number,
  options?: Pick<GetProductsOptions, "force">
): Promise<ProductDetailResult> {
  try {
    const json = await fetchJsonDeduped<{ data?: any }>(
      `/api/products/${encodeURIComponent(String(id))}`,
      { force: options?.force }
    );
    const product = json?.data?.product
      ? normalizeProductRecord(json.data.product, 1)
      : null;
    const recommendations = Array.isArray(json?.data?.recommendations)
      ? json.data.recommendations.map(normalizeProductRecord)
      : [];

    return {
      product,
      comments: Array.isArray(json?.data?.comments) ? json.data.comments : [],
      recommendations,
      isPurchased: Boolean(json?.data?.isPurchased),
      hasRated: Boolean(json?.data?.hasRated),
    };
  } catch {
    return {
      product: null,
      comments: [],
      recommendations: [],
    };
  }
}

export async function getRecommendations(
  params?: Record<string, string | number | boolean | null | undefined>,
  options?: Pick<GetProductsOptions, "force">
) {
  try {
    const json = await fetchJsonDeduped<{ data?: { products?: ProductRecord[] } }>(
      withQuery("/api/products/recommendations", params),
      { force: options?.force }
    );

    return Array.isArray(json?.data?.products)
      ? json.data.products.map(normalizeProductRecord)
      : [];
  } catch {
    return [];
  }
}

/** Single catalog fetch per URL — deduped in-flight, cached for the session. */
export async function getProducts(options?: boolean | GetProductsOptions): Promise<ProductsCache> {
  const { all = false, full = false, force = false } = resolveOptions(options);

  try {
    const [structure, productPage] = await Promise.all([
      getCatalogStructure({ all, force }),
      getProductPage({ limit: all ? 500 : 100 }, { all, full, force }),
    ]);
    const products = productPage.products;
    const catalogShowcases = structure.showcases.map((showcase) => ({
      ...showcase,
      products: resolveShowcaseProducts(products, showcase, true),
    }));

    return withResolvedTree({
      ...structure,
      products,
      catalog: {
        ...structure.catalog,
        showcases: catalogShowcases,
      },
    });
  } catch {
    return emptyProductsCache();
  }
}

export function findProductById(
  products: ProductRecord[],
  id: string | number
): ProductRecord | null {
  const candidates = catalogMatchCandidates(id);
  return products.find((product) =>
    candidates.has(String(product.id))
    || candidates.has(productSlug(product))
    || candidates.has(slugifyCatalogValue(product.slug || ""))
    || candidates.has(slugifyCatalogValue(product.title || ""))
  ) ?? null;
}

export function findShowcaseById(
  products: ProductRecord[],
  showcases: ShowcaseRecord[],
  id: string | number
): ShowcaseRecord | null {
  const candidates = catalogMatchCandidates(id);
  const showcase = showcases.find((item) =>
    candidates.has(String(item.id))
    || candidates.has(showcaseSlug(item))
    || candidates.has(slugifyCatalogValue(item.title || ""))
  );
  if (!showcase) return null;

  const showcaseProducts = resolveShowcaseProducts(products, showcase, false);

  return {
    ...showcase,
    products: showcaseProducts,
  };
}

export function clearProductsCache() {
  invalidateFetchCache("/api/products");
  invalidateFetchCache("/api/catalog");
  invalidateFetchCache("/api/home");
  invalidateFetchCache("/api/categories");
  invalidateFetchCache("/api/showcase");
  invalidateFetchCache("/api/showcases");
  invalidateFetchCache("/api/category");
  invalidateFetchCache("/api/brand");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PRODUCTS_CATALOG_UPDATED_EVENT));
  }
}

export default { getProducts, getCatalogStructure, getHomePageStructure, getCategoriesPageStructure, getProductsPageStructure, getCategoryPageStructure, getBrandPageStructure, getShowcasePageStructure, getProductDetailPageStructure, getProductPage, getShowcaseProducts, getCategoryProducts, getBrandProducts, getProductDetail, findProductById, findShowcaseById, clearProductsCache };
