"use client";

import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";

const CATALOG_URL_ACTIVE = "/api/products";
const CATALOG_URL_ALL = "/api/products?all=1";

export type ProductRecord = {
  id?: number | string;
  showcaseId?: string;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  discountPrice?: string;
  discountPercent?: number | string;
  imageUrl?: string;
  badge?: string;
  ctaLabel?: string;
  ctaHref?: string;
  active: boolean;
  sortOrder: number;
};

export type ShowcaseRecord = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  active?: boolean;
  sortOrder?: number;
  products?: ProductRecord[];
};

export type BannerRecord = {
  id: string;
  title?: string;
  showcaseId?: string | null;
  imageUrls?: string[];
  images?: unknown;
  active?: boolean;
  sortOrder?: number;
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

export type ProductsCache = {
  products: ProductRecord[];
  showcases: ShowcaseRecord[];
  banners: BannerRecord[];
  tree: CatalogTree;
};

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

function parseApiPayload(payload: unknown): ProductsCache {
  if (Array.isArray(payload)) {
    return { products: dedupeProducts(payload as ProductRecord[]), showcases: [], banners: [], tree: { sections: [] } };
  }

  if (!payload || typeof payload !== "object") {
    return { products: [], showcases: [], banners: [], tree: { sections: [] } };
  }

  const record = payload as {
    products?: ProductRecord[];
    showcases?: ShowcaseRecord[];
    banners?: BannerRecord[];
    tree?: CatalogTree;
  };
  return {
    products: Array.isArray(record.products) ? dedupeProducts(record.products) : [],
    showcases: Array.isArray(record.showcases) ? record.showcases : [],
    banners: Array.isArray(record.banners) ? record.banners : [],
    tree:
      record.tree && Array.isArray(record.tree.sections)
        ? record.tree
        : { sections: [] },
  };
}

function resolveTree(apiData: ProductsCache): CatalogTree {
  const tree =
    apiData.tree.sections.length > 0
      ? apiData.tree
      : {
          sections: [
            ...apiData.banners.map((banner) => ({
              type: "banner" as const,
              sortOrder: Number(banner.sortOrder ?? 0),
              item: banner,
            })),
            ...apiData.showcases.map((showcase) => ({
              type: "showcase" as const,
              sortOrder: Number(showcase.sortOrder ?? 0),
              item: showcase,
              products: apiData.products.filter(
                (product) => String(product.showcaseId ?? "") === String(showcase.id)
              ),
            })),
          ].sort((a, b) => a.sortOrder - b.sortOrder),
        };

  return tree;
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
    return { products: [], showcases: [], banners: [], tree: { sections: [] } };
  }
}

export function findProductById(
  products: ProductRecord[],
  id: string | number
): ProductRecord | null {
  return products.find((product) => String(product.id) === String(id)) ?? null;
}

export function findShowcaseById(
  products: ProductRecord[],
  showcases: ShowcaseRecord[],
  id: string | number
): ShowcaseRecord | null {
  const showcase = showcases.find((item) => String(item.id) === String(id));
  if (!showcase) return null;

  const showcaseProducts = products.filter(
    (product) => String(product.showcaseId ?? "") === String(id) && product.active !== false
  );

  return {
    ...showcase,
    products: showcaseProducts,
  };
}

export function clearProductsCache() {
  invalidateFetchCache("/api/products");
}

export default { getProducts, findProductById, findShowcaseById, clearProductsCache };
