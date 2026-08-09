export type PlacementLike = {
  placement?: number | string | null;
  sortOrder?: number | string | null;
};

export type BannerImageData = {
  imageUrls: string[];
  showcaseId: string;
  showOnHome?: boolean;
  showOnShowcase?: boolean;
  showOnCategories?: boolean;
  showOnProducts?: boolean;
  homeSortOrder?: number;
  showcaseSortOrder?: number;
  categorySortOrder?: number;
  productSortOrder?: number;
};

export type ProductIdentityLike = {
  id?: number | string | null;
  showcaseId?: string | number | null;
  title?: string | null;
  description?: string | null;
  price?: string | number | null;
  originalPrice?: string | number | null;
  discountPrice?: string | number | null;
  imageUrl?: string | null;
};

export function getPlacement(value?: PlacementLike, fallback = 0) {
  if (Number.isFinite(Number(value?.placement))) return Number(value?.placement);
  if (Number.isFinite(Number(value?.sortOrder))) return Number(value?.sortOrder);
  return fallback;
}

export function readImageMetaRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function optionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed) : undefined;
}

export function getBannerImageData(value: unknown): BannerImageData {
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
      homeSortOrder: optionalNumber(record.homeSortOrder),
      showcaseSortOrder: optionalNumber(record.showcaseSortOrder),
      categorySortOrder: optionalNumber(record.categorySortOrder),
      productSortOrder: optionalNumber(record.productSortOrder),
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

export function readStoredImageUrls(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  const meta = readImageMetaRecord(value);
  const urls = Array.isArray(meta.urls) ? meta.urls : meta.imageUrls;
  return Array.isArray(urls) ? urls.map((item) => String(item)).filter(Boolean) : [];
}

export function getProductIdentityKey(product: ProductIdentityLike, options?: { includeShowcaseId?: boolean }) {
  const id = String(product.id ?? "").trim();
  if (id && /^\d+$/.test(id)) return `id:${id}`;

  return [
    options?.includeShowcaseId ? String(product.showcaseId ?? "").trim().toLowerCase() : undefined,
    product.title,
    product.description,
    product.price,
    product.originalPrice,
    product.discountPrice,
    product.imageUrl,
  ]
    .filter((value) => value !== undefined)
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}
