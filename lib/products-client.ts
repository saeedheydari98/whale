"use client";

import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";

const CATALOG_URL_ACTIVE = "/api/products";
const CATALOG_URL_ALL = "/api/products?all=1";

export type ProductRecord = {
  id?: number | string;
  showcaseId?: string;
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
  title: string;
  slug?: string;
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
  intervalSeconds?: number | string;
  heightPercent?: number | string;
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
  categories: CategoryRecord[];
  banners: BannerRecord[];
};

type CatalogApiTree = {
  type?: "root";
  placement?: number | string;
  categories?: CategoryRecord[];
  children?: Array<
    | (BannerRecord & { type: "banner" })
    | (ShowcaseRecord & { type: "showcase"; products?: ProductRecord[] })
  >;
};

export type ProductsCache = {
  products: ProductRecord[];
  showcases: ShowcaseRecord[];
  categories: CategoryRecord[];
  banners: BannerRecord[];
  tree: CatalogTree;
  catalog: CatalogObject;
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

export function productSlug(product: Partial<ProductRecord>) {
  return slugifyCatalogValue(product.slug || product.title || product.id || "");
}

export function showcaseSlug(showcase: Partial<ShowcaseRecord>) {
  return slugifyCatalogValue(showcase.title || showcase.id || "");
}

export type GetProductsOptions = {
  /** Include inactive products (admin). */
  all?: boolean;
  /** Bypass session cache and refetch. */
  force?: boolean;
};

function getProductKey(product: Partial<ProductRecord>) {
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
    banners: [],
    tree: { sections: [] },
    catalog: { placement: 0, showcases: [], categories: [], banners: [] },
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

function normalizeProductRecord(product: ProductRecord, fallbackOrder: number): ProductRecord {
  const placement = getPlacement(product, fallbackOrder);
  const stockQuantity = Number.isFinite(Number(product.stockQuantity)) ? Math.max(0, Math.round(Number(product.stockQuantity))) : 0;
  const imageList = Array.isArray(product.images)
    ? product.images.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    ...product,
    slug: String(product.slug ?? productSlug(product)),
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
    categoryId: String(product.categoryId ?? "general").trim() || "general",
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
    title: title || `Category ${fallbackOrder}`,
    slug,
    active: category.active !== false,
    sortOrder: placement,
  };
}

function normalizeBannerRecord(banner: BannerRecord, fallbackOrder: number): BannerRecord {
  const placement = getPlacement(banner, fallbackOrder);
  const imageUrls = getBannerImageUrls(banner);

  return {
    ...banner,
    imageUrls,
    active: banner.active !== false,
    intervalSeconds: Number.isFinite(Number(banner.intervalSeconds)) ? Math.max(1, Math.round(Number(banner.intervalSeconds))) : 5,
    heightPercent: Number.isFinite(Number(banner.heightPercent)) ? Math.max(10, Math.min(100, Math.round(Number(banner.heightPercent)))) : 28,
    sortOrder: placement,
    placement,
  };
}

function readTreePayload(payload: unknown): CatalogObject | null {
  if (!payload || typeof payload !== "object") return null;

  const tree = payload as CatalogApiTree;
  if (!Array.isArray(tree.children)) return null;

  const showcases = tree.children
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

  const banners = tree.children
    .filter((item) => item.type === "banner")
    .map((banner, bannerIndex) => normalizeBannerRecord(banner as BannerRecord, bannerIndex + 1));

  return {
    placement: getPlacement(tree, 0),
    showcases,
    categories: Array.isArray(tree.categories) ? tree.categories.map(normalizeCategoryRecord) : [],
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
    categories?: CategoryRecord[];
    banners?: BannerRecord[];
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

  return {
    products: dedupeProducts(products),
    showcases,
    categories,
    banners,
    tree:
      record.tree && Array.isArray(record.tree.sections)
        ? record.tree
        : { sections: [] },
    catalog: {
      placement: Number(treeCatalog?.placement ?? record.catalog?.placement ?? 0),
      showcases: catalogShowcases,
      categories,
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
              sortOrder: getPlacement(banner, index + 1),
              item: banner,
            })),
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
    const filtered = activeProducts.filter((product) => !categoryId || product.categoryId === categoryId);
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

  return activeProducts.filter((product) => String(product.showcaseId ?? "") === String(showcase.id));
}

function withResolvedTree(apiData: ProductsCache): ProductsCache {
  return { ...apiData, tree: resolveTree(apiData) };
}

function resolveOptions(options?: boolean | GetProductsOptions): GetProductsOptions {
  if (typeof options === "boolean") return { force: options };
  return options ?? {};
}

/** Single catalog fetch per URL — deduped in-flight, cached for the session. */
export async function getProducts(options?: boolean | GetProductsOptions): Promise<ProductsCache> {
  const { all = false, force = false } = resolveOptions(options);
  const url = all ? CATALOG_URL_ALL : CATALOG_URL_ACTIVE;

  try {
    const json = await fetchJsonDeduped<{ data?: unknown }>(url, { force });
    return withResolvedTree(parseApiPayload(json?.data));
  } catch {
    return emptyProductsCache();
  }
}

export function findProductById(
  products: ProductRecord[],
  id: string | number
): ProductRecord | null {
  const target = String(id);
  const targetSlug = slugifyCatalogValue(id);
  return products.find((product) =>
    String(product.id) === target || productSlug(product) === targetSlug
  ) ?? null;
}

export function findShowcaseById(
  products: ProductRecord[],
  showcases: ShowcaseRecord[],
  id: string | number
): ShowcaseRecord | null {
  const target = String(id);
  const targetSlug = slugifyCatalogValue(id);
  const showcase = showcases.find((item) =>
    String(item.id) === target || showcaseSlug(item) === targetSlug
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
}

export default { getProducts, findProductById, findShowcaseById, clearProductsCache };
