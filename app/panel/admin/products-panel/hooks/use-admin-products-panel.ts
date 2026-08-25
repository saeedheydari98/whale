"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clearProductsCache, getCatalogStructure, getProducts, type ProductsCache } from "@/lib/products-client";
import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import { useFileDataUrl } from "@/hooks/useFileDataUrl";
import { isAllowedWebpImageValue, WEBP_ONLY_ERROR } from "@/lib/image-upload";
import { createBanner, createBrand, createCatalogLinkGroup, createCategory, createProduct, createShowcase } from "../factories";
import type {
  BannerForm,
  BrandForm,
  AdminCatalogSection,
  CatalogLinkGroupForm,
  CategoryForm,
  ProductForm,
  StorefrontDisplayEntry,
  StorefrontLayoutTab,
  ShowcaseForm,
} from "../types";
import {
  calculateDiscountPercent,
  dedupeProducts,
  ensureShowcases,
  formatPrice,
  formatAmount,
  getProductImageUrls,
  getProductKey,
  getShowcaseProductsForAdmin,
  hasMatchingColorStock,
  normalizeBanner,
  normalizeBannerTiming,
  normalizeBrand,
  normalizeCatalogLinkGroup,
  normalizeCategory,
  normalizeProduct,
  normalizeShowcase,
  productImagePatch,
  slugifyValue,
  storefrontKey,
  waitForMinimumLoading,
} from "../utils";

type AdminCatalogSnapshot = {
  products: ProductForm[];
  showcases: ShowcaseForm[];
  categories: CategoryForm[];
  categoryGroups: CatalogLinkGroupForm[];
  brands: BrandForm[];
  brandGroups: CatalogLinkGroupForm[];
  banners: BannerForm[];
};

export type AdminSkeletonHints = {
  products?: number;
  banners?: number;
  showcases?: number;
  categories?: number;
  brands?: number;
  storefront?: Partial<Record<StorefrontLayoutTab, number>>;
  categoryGroups?: number;
  categoryItemsByGroupId?: Record<string, number>;
  brandGroups?: number;
  brandItemsByGroupId?: Record<string, number>;
  showcaseProductsById?: Record<string, number>;
};

type AdminCatalogLoadSection = AdminCatalogSection | "all" | "product-form";
type LoadedAdminCatalogSections = Record<AdminCatalogSection, boolean>;
type StorefrontLayoutItemType = "banner" | "showcase" | "categoryGroup" | "brandGroup";
type StorefrontLayoutItem = {
  type: StorefrontLayoutItemType;
  id: string;
  title: string;
  sortOrder: number;
};
type StorefrontLayoutResponse = Record<StorefrontLayoutTab, StorefrontLayoutItem[]>;

const ADMIN_CATALOG_SECTION_URL = "/api/admin/catalog";
const ADMIN_SKELETON_HINTS_KEY = "admin-catalog-skeleton-hints:v1";
const ADMIN_CATALOG_SECTIONS: AdminCatalogSection[] = ["products", "banners", "showcases", "categories", "brands", "storefront"];
const STOREFRONT_HINT_TABS: StorefrontLayoutTab[] = ["home", "categories", "products"];

function visibleStatusMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message || /[A-Za-z]/.test(message)) return fallback;
  return message;
}
const EMPTY_CATALOG: ProductsCache = {
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

const initialLoadedSections: LoadedAdminCatalogSections = {
  products: false,
  banners: false,
  showcases: false,
  categories: false,
  brands: false,
  storefront: false,
};

function hasCatalogData(catalog: ProductsCache) {
  return (
    catalog.products.length > 0 ||
    catalog.showcases.length > 0 ||
    catalog.categories.length > 0 ||
    catalog.categoryGroups.length > 0 ||
    catalog.brands.length > 0 ||
    catalog.brandGroups.length > 0 ||
    catalog.banners.length > 0
  );
}

function toProductsCache(value: unknown): ProductsCache {
  const record = value && typeof value === "object" ? value as Partial<ProductsCache> : {};

  return {
    ...EMPTY_CATALOG,
    products: Array.isArray(record.products) ? record.products : [],
    showcases: Array.isArray(record.showcases) ? record.showcases : [],
    categories: Array.isArray(record.categories) ? record.categories : [],
    categoryGroups: Array.isArray(record.categoryGroups) ? record.categoryGroups : [],
    brands: Array.isArray(record.brands) ? record.brands : [],
    brandGroups: Array.isArray(record.brandGroups) ? record.brandGroups : [],
    banners: Array.isArray(record.banners) ? record.banners : [],
  };
}

async function getAdminCatalogSection(section: AdminCatalogLoadSection, options?: { force?: boolean }) {
  const json = await fetchJsonDeduped<{
    ok?: boolean;
    data?: { catalog?: unknown };
    message?: string;
    error?: string;
  }>(`${ADMIN_CATALOG_SECTION_URL}/${section}`, { force: options?.force });

  if (json?.ok === false) throw new Error(json.message || json.error || "دریافت اطلاعات فروشگاه ممکن نشد.");
  return toProductsCache(json?.data?.catalog);
}

function normalizeStorefrontLayoutItem(value: unknown): StorefrontLayoutItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const type = String(record.type ?? "").trim() as StorefrontLayoutItemType;
  const id = String(record.id ?? "").trim();
  const sortOrder = normalizedCount(record.sortOrder);

  if (!id || sortOrder === undefined) return null;
  if (type !== "banner" && type !== "showcase" && type !== "categoryGroup" && type !== "brandGroup") return null;

  return {
    type,
    id,
    title: String(record.title ?? ""),
    sortOrder,
  };
}

function normalizeStorefrontLayout(value: unknown): StorefrontLayoutResponse {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const productsValue = Array.isArray(record.products) ? record.products : record.showcases;
  const normalizeItems = (items: unknown) => Array.isArray(items)
    ? items.map(normalizeStorefrontLayoutItem).filter((item): item is StorefrontLayoutItem => Boolean(item))
    : [];

  return {
    home: normalizeItems(record.home),
    categories: normalizeItems(record.categories),
    products: normalizeItems(productsValue),
  };
}

async function getAdminStorefrontLayout(options?: { force?: boolean }) {
  const json = await fetchJsonDeduped<{
    ok?: boolean;
    data?: { storefront?: unknown };
    message?: string;
    error?: string;
  }>(`${ADMIN_CATALOG_SECTION_URL}/storefront`, { force: options?.force });

  if (json?.ok === false) throw new Error(json.message || json.error || "دریافت چیدمان فروشگاه ممکن نشد.");
  return normalizeStorefrontLayout(json?.data?.storefront);
}

function normalizeHintRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, count]) => [key, normalizedCount(count)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== undefined);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeStorefrontHints(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const next: Partial<Record<StorefrontLayoutTab, number>> = {};

  for (const tab of STOREFRONT_HINT_TABS) {
    const count = normalizedCount(record[tab]);
    if (count !== undefined) next[tab] = count;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeSkeletonHints(value: unknown): AdminSkeletonHints {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    products: normalizedCount(record.products),
    banners: normalizedCount(record.banners),
    showcases: normalizedCount(record.showcases),
    categories: normalizedCount(record.categories),
    brands: normalizedCount(record.brands),
    storefront: normalizeStorefrontHints(record.storefront),
    categoryGroups: normalizedCount(record.categoryGroups),
    categoryItemsByGroupId: normalizeHintRecord(record.categoryItemsByGroupId),
    brandGroups: normalizedCount(record.brandGroups),
    brandItemsByGroupId: normalizeHintRecord(record.brandItemsByGroupId),
    showcaseProductsById: normalizeHintRecord(record.showcaseProductsById),
  };
}

function markCatalogSectionsLoaded(current: LoadedAdminCatalogSections, sections: AdminCatalogSection[]) {
  const next = { ...current };
  for (const section of sections) next[section] = true;
  return next;
}

function normalizedCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : undefined;
}

function countByGroup<TItem extends { groupId?: string }>(items: TItem[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const groupId = String(item.groupId ?? "").trim();
    if (!groupId) return counts;
    counts[groupId] = (counts[groupId] ?? 0) + 1;
    return counts;
  }, {});
}

function hasSkeletonHints(hints: AdminSkeletonHints) {
  return Object.keys(hints).some((key) => {
    const value = hints[key as keyof AdminSkeletonHints];
    return value !== undefined && value !== null && (!(typeof value === "object") || Object.keys(value).length > 0);
  });
}

function mergeSkeletonHints(current: AdminSkeletonHints, next: AdminSkeletonHints): AdminSkeletonHints {
  return {
    ...current,
    ...next,
    storefront: {
      ...(current.storefront ?? {}),
      ...(next.storefront ?? {}),
    },
    categoryItemsByGroupId: {
      ...(current.categoryItemsByGroupId ?? {}),
      ...(next.categoryItemsByGroupId ?? {}),
    },
    brandItemsByGroupId: {
      ...(current.brandItemsByGroupId ?? {}),
      ...(next.brandItemsByGroupId ?? {}),
    },
    showcaseProductsById: {
      ...(current.showcaseProductsById ?? {}),
      ...(next.showcaseProductsById ?? {}),
    },
  };
}

function sameSkeletonHints(first: AdminSkeletonHints, second: AdminSkeletonHints) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function readSkeletonHints(): AdminSkeletonHints {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ADMIN_SKELETON_HINTS_KEY) || "null");
    return normalizeSkeletonHints(parsed);
  } catch {
    return {};
  }
}

function writeSkeletonHints(hints: AdminSkeletonHints) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ADMIN_SKELETON_HINTS_KEY, JSON.stringify(hints));
  } catch {
  }
}

function normalizeAdminCatalog(
  catalog: ProductsCache,
  includeProducts: boolean,
  options?: { preserveEmptyCatalogLinks?: boolean }
): AdminCatalogSnapshot {
  const preserveEmptyCatalogLinks = options?.preserveEmptyCatalogLinks === true;
  const apiProducts = includeProducts
    ? dedupeProducts(catalog.products.map((item, index) => normalizeProduct(item as Partial<ProductForm>, index)))
    : [];
  const nextShowcases = ensureShowcases(
    apiProducts,
    catalog.showcases.map((item, index) => normalizeShowcase({
      id: String(item.id),
      title: String(item.title ?? `ویترین ${index + 1}`),
      active: item.active !== false,
      mode: item.mode === "auto" ? "auto" : "manual",
      autoSort: String(item.autoSort ?? "newest"),
      limit: Number.isFinite(Number(item.limit)) ? Math.max(1, Math.round(Number(item.limit))) : 8,
      categoryId: String(item.categoryId ?? ""),
      manualProductIds: Array.isArray(item.manualProductIds) ? item.manualProductIds.map((value) => String(value)) : [],
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
      productCount: Number(item.productCount),
    }, index))
  );
  const nextBanners = catalog.banners.map((item, index) =>
    normalizeBanner({
      ...item,
      showcaseId: String(item.showcaseId ?? ""),
      homeSortOrder: Number(item.homeSortOrder ?? item.sortOrder),
      showcaseSortOrder: Number(item.showcaseSortOrder ?? item.sortOrder),
      categorySortOrder: Number(item.categorySortOrder ?? item.homeSortOrder ?? item.sortOrder),
      productSortOrder: Number(item.productSortOrder ?? item.showcaseSortOrder ?? item.sortOrder),
      intervalSeconds: Number(item.intervalSeconds),
      heightPercent: Number(item.heightPercent),
    }, index)
  );
  const nextCategories = catalog.categories.length > 0
    ? catalog.categories.map((item, index) => normalizeCategory({
      id: item.id,
      groupId: item.groupId ?? "default-categories",
      title: item.title,
      slug: item.slug,
      imageUrl: item.imageUrl ?? "",
      active: item.active,
      sortOrder: Number(item.sortOrder),
      pageSortOrder: Number(item.pageSortOrder ?? 1),
      productCount: Number(item.productCount),
    }, index))
    : preserveEmptyCatalogLinks
      ? []
      : [
      normalizeCategory({
        id: "general",
        groupId: "default-categories",
        title: "عمومی",
        slug: "general",
        imageUrl: "",
        active: true,
        sortOrder: 1,
        pageSortOrder: 1,
      }, 0),
    ];
  const nextBrands = Array.isArray(catalog.brands)
    ? catalog.brands.map((item, index) => normalizeBrand({
      id: String(item.id),
      groupId: String(item.groupId ?? "default-brands"),
      title: String(item.title ?? ""),
      slug: String(item.slug ?? ""),
      imageUrl: String(item.imageUrl ?? ""),
      active: item.active !== false,
      sortOrder: Number(item.sortOrder),
      homeSortOrder: Number(item.homeSortOrder ?? 1),
      productCount: Number(item.productCount),
    }, index))
    : [];
  const nextCategoryGroups = Array.isArray(catalog.categoryGroups) && catalog.categoryGroups.length > 0
    ? catalog.categoryGroups.map((item, index) => normalizeCatalogLinkGroup({
      id: String(item.id),
      title: String(item.title ?? ""),
      active: item.active !== false,
      sortOrder: Number(item.sortOrder),
    }, index, "default-categories", "دسته بندی ها"))
    : [normalizeCatalogLinkGroup({ id: "default-categories", title: "دسته بندی ها", active: true, sortOrder: Number(nextCategories[0]?.pageSortOrder ?? 1) }, 0, "default-categories", "دسته بندی ها")];
  const nextBrandGroups = Array.isArray(catalog.brandGroups) && catalog.brandGroups.length > 0
    ? catalog.brandGroups.map((item, index) => normalizeCatalogLinkGroup({
      id: String(item.id),
      title: String(item.title ?? ""),
      active: item.active !== false,
      sortOrder: Number(item.sortOrder),
    }, index, "default-brands", "برندها"))
    : [normalizeCatalogLinkGroup({ id: "default-brands", title: "برندها", active: true, sortOrder: Number(nextBrands[0]?.homeSortOrder ?? 1) }, 0, "default-brands", "برندها")];

  const finalCategoryGroups = preserveEmptyCatalogLinks && catalog.categoryGroups.length === 0 ? [] : nextCategoryGroups;
  const finalBrandGroups = preserveEmptyCatalogLinks && catalog.brandGroups.length === 0 ? [] : nextBrandGroups;

  return {
    products: apiProducts,
    showcases: nextShowcases,
    categoryGroups: finalCategoryGroups,
    categories: nextCategories.map((category) => ({ ...category, groupId: category.groupId || finalCategoryGroups[0]?.id || "default-categories" })),
    brandGroups: finalBrandGroups,
    brands: nextBrands.map((brand) => ({ ...brand, groupId: brand.groupId || finalBrandGroups[0]?.id || "default-brands" })),
    banners: nextBanners,
  };
}

function mergeStorefrontBanners(current: BannerForm[], layoutBanners: BannerForm[]) {
  if (current.length === 0) return layoutBanners;
  const layoutById = new Map(layoutBanners.map((banner) => [banner.id, banner]));
  const currentIds = new Set(current.map((banner) => banner.id));
  const merged = current.map((banner) => {
    const layout = layoutById.get(banner.id);
    return layout
      ? {
          ...banner,
          showcaseId: layout.showcaseId,
          active: layout.active,
          showOnHome: layout.showOnHome,
          showOnShowcase: layout.showOnShowcase,
          showOnCategories: layout.showOnCategories,
          showOnProducts: layout.showOnProducts,
          intervalSeconds: layout.intervalSeconds,
          heightPercent: layout.heightPercent,
          homeSortOrder: layout.homeSortOrder,
          showcaseSortOrder: layout.showcaseSortOrder,
          categorySortOrder: layout.categorySortOrder,
          productSortOrder: layout.productSortOrder,
          sortOrder: layout.sortOrder,
        }
      : banner;
  });

  return [...merged, ...layoutBanners.filter((banner) => !currentIds.has(banner.id))];
}

function mergeStorefrontShowcases(current: ShowcaseForm[], layoutShowcases: ShowcaseForm[]) {
  if (current.length === 0) return layoutShowcases;
  const layoutById = new Map(layoutShowcases.map((showcase) => [showcase.id, showcase]));
  const currentIds = new Set(current.map((showcase) => showcase.id));
  const merged = current.map((showcase) => {
    const layout = layoutById.get(showcase.id);
    return layout
      ? {
          ...showcase,
          title: layout.title || showcase.title,
          active: layout.active,
          productCount: layout.productCount,
          sortOrder: layout.sortOrder,
        }
      : showcase;
  });

  return [...merged, ...layoutShowcases.filter((showcase) => !currentIds.has(showcase.id))];
}

function mergeStorefrontGroups(current: CatalogLinkGroupForm[], layoutGroups: CatalogLinkGroupForm[]) {
  if (current.length === 0) return layoutGroups;
  const layoutById = new Map(layoutGroups.map((group) => [group.id, group]));
  const currentIds = new Set(current.map((group) => group.id));
  const merged = current.map((group) => {
    const layout = layoutById.get(group.id);
    return layout
      ? {
          ...group,
          title: layout.title || group.title,
          active: layout.active,
          sortOrder: layout.sortOrder,
        }
      : group;
  });

  return [...merged, ...layoutGroups.filter((group) => !currentIds.has(group.id))];
}

function sortStorefrontLayoutItems(items: StorefrontLayoutItem[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function toStorefrontLayoutItem(type: StorefrontLayoutItemType, id: string, title: string, sortOrder: number): StorefrontLayoutItem {
  return { type, id, title, sortOrder };
}

function storefrontLayoutToCatalog(layout: StorefrontLayoutResponse): ProductsCache {
  const bannersById = new Map<string, Partial<BannerForm>>();
  const addBanner = (item: StorefrontLayoutItem, tab: StorefrontLayoutTab) => {
    const current = bannersById.get(item.id) ?? {
      id: item.id,
      title: item.title,
      showcaseId: "",
      imageUrls: [],
      active: true,
      showOnHome: false,
      showOnShowcase: false,
      showOnCategories: false,
      showOnProducts: false,
      intervalSeconds: 5,
      heightPercent: 28,
      homeSortOrder: item.sortOrder,
      showcaseSortOrder: item.sortOrder,
      categorySortOrder: item.sortOrder,
      productSortOrder: item.sortOrder,
      sortOrder: item.sortOrder,
    };

    if (tab === "home") {
      current.showOnHome = true;
      current.homeSortOrder = item.sortOrder;
      current.sortOrder = item.sortOrder;
    } else if (tab === "categories") {
      current.showOnCategories = true;
      current.categorySortOrder = item.sortOrder;
    } else {
      current.showOnProducts = true;
      current.productSortOrder = item.sortOrder;
      current.showcaseSortOrder = item.sortOrder;
    }

    bannersById.set(item.id, current);
  };

  for (const item of layout.home) if (item.type === "banner") addBanner(item, "home");
  for (const item of layout.categories) if (item.type === "banner") addBanner(item, "categories");
  for (const item of layout.products) if (item.type === "banner") addBanner(item, "products");

  return {
    ...EMPTY_CATALOG,
    banners: Array.from(bannersById.values()) as ProductsCache["banners"],
    showcases: layout.products
      .filter((item) => item.type === "showcase")
      .map((item) => ({
        id: item.id,
        title: item.title,
        active: true,
        sortOrder: item.sortOrder,
      })) as ProductsCache["showcases"],
    categoryGroups: layout.categories
      .filter((item) => item.type === "categoryGroup")
      .map((item) => ({
        id: item.id,
        title: item.title,
        active: true,
        sortOrder: item.sortOrder,
      })) as ProductsCache["categoryGroups"],
    brandGroups: layout.home
      .filter((item) => item.type === "brandGroup")
      .map((item) => ({
        id: item.id,
        title: item.title,
        active: true,
        sortOrder: item.sortOrder,
      })) as ProductsCache["brandGroups"],
  };
}

function storefrontLayoutToSkeletonHints(layout: StorefrontLayoutResponse): AdminSkeletonHints {
  return {
    storefront: {
      home: layout.home.length,
      categories: layout.categories.length,
      products: layout.products.length,
    },
    banners: new Set(
      [...layout.home, ...layout.categories, ...layout.products]
        .filter((item) => item.type === "banner")
        .map((item) => item.id)
    ).size,
    showcases: layout.products.filter((item) => item.type === "showcase").length,
    categoryGroups: layout.categories.filter((item) => item.type === "categoryGroup").length,
    brandGroups: layout.home.filter((item) => item.type === "brandGroup").length,
  };
}

function buildStorefrontLayoutPayload(
  banners: BannerForm[],
  showcases: ShowcaseForm[],
  categoryGroups: CatalogLinkGroupForm[],
  brandGroups: CatalogLinkGroupForm[]
): StorefrontLayoutResponse {
  return {
    home: sortStorefrontLayoutItems([
      ...banners
        .filter((banner) => banner.showOnHome)
        .map((banner) => toStorefrontLayoutItem("banner", banner.id, banner.title, Number(banner.homeSortOrder ?? banner.sortOrder))),
      ...brandGroups
        .filter((group) => group.active !== false)
        .map((group) => toStorefrontLayoutItem("brandGroup", group.id, group.title, Number(group.sortOrder))),
    ]),
    categories: sortStorefrontLayoutItems([
      ...banners
        .filter((banner) => banner.showOnCategories)
        .map((banner) => toStorefrontLayoutItem("banner", banner.id, banner.title, Number(banner.categorySortOrder ?? banner.sortOrder))),
      ...categoryGroups
        .filter((group) => group.active !== false)
        .map((group) => toStorefrontLayoutItem("categoryGroup", group.id, group.title, Number(group.sortOrder))),
    ]),
    products: sortStorefrontLayoutItems([
      ...banners
        .filter((banner) => banner.showOnProducts)
        .map((banner) => toStorefrontLayoutItem("banner", banner.id, banner.title, Number(banner.productSortOrder ?? banner.sortOrder))),
      ...showcases.map((showcase) => toStorefrontLayoutItem("showcase", showcase.id, showcase.title, Number(showcase.sortOrder))),
    ]),
  };
}

export function useAdminProductsPanel(activeSection: AdminCatalogSection = "products") {
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseForm[]>([]);
  const [categories, setCategories] = useState<CategoryForm[]>([
    normalizeCategory({ id: "general", groupId: "default-categories", title: "عمومی", slug: "general", imageUrl: "", active: true, sortOrder: 1 }, 0),
  ]);
  const [categoryGroups, setCategoryGroups] = useState<CatalogLinkGroupForm[]>([
    normalizeCatalogLinkGroup({ id: "default-categories", title: "دسته بندی ها", active: true, sortOrder: 1 }, 0, "default-categories", "دسته بندی ها"),
  ]);
  const [brands, setBrands] = useState<BrandForm[]>([]);
  const [brandGroups, setBrandGroups] = useState<CatalogLinkGroupForm[]>([
    normalizeCatalogLinkGroup({ id: "default-brands", title: "برندها", active: true, sortOrder: 1 }, 0, "default-brands", "برندها"),
  ]);
  const [banners, setBanners] = useState<BannerForm[]>([]);
  const [draftProduct, setDraftProduct] = useState<ProductForm>(createProduct);
  const [draftShowcase, setDraftShowcase] = useState<ShowcaseForm>(createShowcase);
  const [draftCategory, setDraftCategory] = useState<CategoryForm>(createCategory);
  const [draftCategoryGroup, setDraftCategoryGroup] = useState<CatalogLinkGroupForm>(() => createCatalogLinkGroup("category"));
  const [draftBrand, setDraftBrand] = useState<BrandForm>(createBrand);
  const [draftBrandGroup, setDraftBrandGroup] = useState<CatalogLinkGroupForm>(() => createCatalogLinkGroup("brand"));
  const [draftBanner, setDraftBanner] = useState<BannerForm>(createBanner);
  const [editingShowcase, setEditingShowcase] = useState<ShowcaseForm | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryForm | null>(null);
  const [editingBrand, setEditingBrand] = useState<BrandForm | null>(null);
  const [editingCategoryGroup, setEditingCategoryGroup] = useState<CatalogLinkGroupForm | null>(null);
  const [editingBrandGroup, setEditingBrandGroup] = useState<CatalogLinkGroupForm | null>(null);
  const [editingBanner, setEditingBanner] = useState<BannerForm | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isEditShowcaseOpen, setIsEditShowcaseOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const [isCategoryGroupOpen, setIsCategoryGroupOpen] = useState(false);
  const [isBrandGroupOpen, setIsBrandGroupOpen] = useState(false);
  const [isEditCategoryGroupOpen, setIsEditCategoryGroupOpen] = useState(false);
  const [isEditBrandGroupOpen, setIsEditBrandGroupOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isEditBrandOpen, setIsEditBrandOpen] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [structureLoaded, setStructureLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [loadedSections, setLoadedSections] = useState<LoadedAdminCatalogSections>(initialLoadedSections);
  const [productFormReferencesLoaded, setProductFormReferencesLoaded] = useState(false);
  const [skeletonHints, setSkeletonHints] = useState<AdminSkeletonHints>(() => readSkeletonHints());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [requiredErrors, setRequiredErrors] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState("");
  const [draggingProductId, setDraggingProductId] = useState<number | string | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [draggingBrandId, setDraggingBrandId] = useState<string | null>(null);
  const [draggingStorefrontKey, setDraggingStorefrontKey] = useState<string | null>(null);
  const [storefrontLayoutTab, setStorefrontLayoutTab] = useState<StorefrontLayoutTab>("home");
  const [draftBannerImageUrl, setDraftBannerImageUrl] = useState("");
  const [editingBannerImageUrl, setEditingBannerImageUrl] = useState("");
  const [categoryGroupLinkIds, setCategoryGroupLinkIds] = useState<string[]>([]);
  const [brandGroupLinkIds, setBrandGroupLinkIds] = useState<string[]>([]);
  const { readFileAsDataUrl, readFilesAsDataUrls } = useFileDataUrl();
  const activeSectionReady = loadedSections[activeSection];

  const hasRequiredError = (key: string) => requiredErrors.includes(key);
  const applySkeletonHints = useCallback((nextHints: AdminSkeletonHints) => {
    if (!hasSkeletonHints(nextHints)) return;

    setSkeletonHints((current) => {
      const next = mergeSkeletonHints(current, nextHints);
      if (sameSkeletonHints(current, next)) return current;
      writeSkeletonHints(next);
      return next;
    });
  }, []);

  const showRequiredErrors = (keys: string[], message: string) => {
    setRequiredErrors(keys);
    setStatus(message);
    window.setTimeout(() => scrollToFirstInvalidField(document), 0);
  };

  const applyCatalogSectionSnapshot = (section: AdminCatalogLoadSection, catalog: ProductsCache) => {
    const hasProducts = catalog.products.length > 0;
    const snapshot = normalizeAdminCatalog(
      catalog,
      hasProducts || section === "products" || section === "showcases" || section === "all",
      { preserveEmptyCatalogLinks: section === "storefront" }
    );

    if (section === "products") {
      setProducts(snapshot.products);
      setProductsLoaded(true);
      setLoadedSections((current) => markCatalogSectionsLoaded(current, ["products"]));
      return;
    }

    if (section === "banners") {
      setBanners(snapshot.banners);
      setLoadedSections((current) => markCatalogSectionsLoaded(current, ["banners"]));
      return;
    }

    if (section === "showcases") {
      setShowcases(snapshot.showcases);
      if (hasProducts) {
        setProducts(snapshot.products);
        setProductsLoaded(true);
      }
      setLoadedSections((current) => markCatalogSectionsLoaded(current, hasProducts ? ["showcases", "products"] : ["showcases"]));
      return;
    }

    if (section === "categories") {
      setCategoryGroups(snapshot.categoryGroups);
      setCategories(snapshot.categories);
      setLoadedSections((current) => markCatalogSectionsLoaded(current, ["categories"]));
      return;
    }

    if (section === "brands") {
      setBrandGroups(snapshot.brandGroups);
      setBrands(snapshot.brands);
      setLoadedSections((current) => markCatalogSectionsLoaded(current, ["brands"]));
      return;
    }

    if (section === "product-form") {
      setShowcases(snapshot.showcases);
      setCategoryGroups(snapshot.categoryGroups);
      setCategories(snapshot.categories);
      setBrandGroups(snapshot.brandGroups);
      setBrands(snapshot.brands);
      setProductFormReferencesLoaded(true);
      setLoadedSections((current) => markCatalogSectionsLoaded(current, ["categories", "brands"]));
      return;
    }

    if (section === "storefront") {
      setShowcases((current) => mergeStorefrontShowcases(current, snapshot.showcases));
      setCategoryGroups((current) => loadedSections.categories ? mergeStorefrontGroups(current, snapshot.categoryGroups) : snapshot.categoryGroups);
      setCategories((current) => loadedSections.categories ? current : snapshot.categories);
      setBrandGroups((current) => loadedSections.brands ? mergeStorefrontGroups(current, snapshot.brandGroups) : snapshot.brandGroups);
      setBrands((current) => loadedSections.brands ? current : snapshot.brands);
      setBanners((current) => loadedSections.banners ? mergeStorefrontBanners(current, snapshot.banners) : snapshot.banners);
      setLoadedSections((current) => markCatalogSectionsLoaded(current, ["storefront"]));
      return;
    }

    setProducts(snapshot.products);
    setShowcases(snapshot.showcases);
    setCategoryGroups(snapshot.categoryGroups);
    setCategories(snapshot.categories);
    setBrandGroups(snapshot.brandGroups);
    setBrands(snapshot.brands);
    setBanners(snapshot.banners);
    setProductsLoaded(true);
    setStructureLoaded(true);
    setProductFormReferencesLoaded(true);
    setLoadedSections(() => markCatalogSectionsLoaded(initialLoadedSections, ADMIN_CATALOG_SECTIONS));
  };

  const ensureProductFormReferences = async () => {
    if (productFormReferencesLoaded) return null;

    try {
      const catalog = await getAdminCatalogSection("product-form");
      const snapshot = normalizeAdminCatalog(catalog, false);
      applyCatalogSectionSnapshot("product-form", catalog);
      return snapshot;
    } catch {
      setStatus("دریافت اطلاعات فرم محصول ممکن نشد.");
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (activeSectionReady) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const loadSectionData = async () => {
      const startedAt = Date.now();
      setLoading(true);

      try {
        if (activeSection === "storefront") {
          let layout = await getAdminStorefrontLayout();

          if (layout.home.length === 0 && layout.categories.length === 0 && layout.products.length === 0) {
            await new Promise((resolve) => window.setTimeout(resolve, 250));
            layout = await getAdminStorefrontLayout({ force: true });
          }
          if (cancelled) return;

          applySkeletonHints(storefrontLayoutToSkeletonHints(layout));
          applyCatalogSectionSnapshot("storefront", storefrontLayoutToCatalog(layout));
          await waitForMinimumLoading(startedAt);
          return;
        }

        let catalog = await getAdminCatalogSection(activeSection);

        if (!hasCatalogData(catalog)) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          catalog = await getAdminCatalogSection(activeSection, { force: true });
        }
        if (cancelled) return;

        applyCatalogSectionSnapshot(activeSection, catalog);
        await waitForMinimumLoading(startedAt);
      } catch {
        if (cancelled) return;
        setStatus("دریافت اطلاعات فروشگاه ممکن نشد.");
        await waitForMinimumLoading(startedAt);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSectionData();

    return () => {
      cancelled = true;
    };
  }, [activeSection, activeSectionReady, applySkeletonHints]);

  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.sortOrder - b.sortOrder), [products]);
  const sortedShowcases = useMemo(() => ensureShowcases(products, showcases), [products, showcases]);
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);
  const sortedCategoryGroups = useMemo(() => [...categoryGroups].sort((a, b) => a.sortOrder - b.sortOrder), [categoryGroups]);
  const sortedBrands = useMemo(() => [...brands].sort((a, b) => a.sortOrder - b.sortOrder), [brands]);
  const sortedBrandGroups = useMemo(() => [...brandGroups].sort((a, b) => a.sortOrder - b.sortOrder), [brandGroups]);
  const sortedBanners = useMemo(() => [...banners].sort((a, b) => a.sortOrder - b.sortOrder), [banners]);
  const nextDisplayOrder = useMemo(() => {
    const orders = [...sortedShowcases, ...sortedBanners].map((item) => item.sortOrder);
    return (Math.max(0, ...orders) || 0) + 1;
  }, [sortedBanners, sortedShowcases]);
  const nextCategoryOrder = useMemo(() => (Math.max(0, ...sortedCategories.map((item) => item.sortOrder)) || 0) + 1, [sortedCategories]);

  const displaySections = useMemo<StorefrontDisplayEntry[]>(() => {
    if (storefrontLayoutTab === "categories") {
      const bannerSections = sortedBanners
        .filter((banner) => banner.showOnCategories)
        .map((banner) => ({
          type: "banner" as const,
          item: banner,
          sortOrder: Number(banner.categorySortOrder ?? banner.sortOrder),
        }));
      const categorySections = sortedCategories.length > 0
        ? [{
          type: "categoryGroup" as const,
          item: { id: "category-group", title: "دسته‌بندی‌ها", sortOrder: Number(sortedCategories[0]?.pageSortOrder ?? 1) },
          sortOrder: Number(sortedCategories[0]?.pageSortOrder ?? 1),
        }]
        : [];
      const groupedCategorySections = sortedCategoryGroups
        .filter((group) => group.active !== false)
        .map((group) => ({
          type: "categoryGroup" as const,
          item: { id: group.id, title: group.title, sortOrder: Number(group.sortOrder ?? 1) },
          sortOrder: Number(group.sortOrder ?? 1),
        }));

      return [...bannerSections, ...(groupedCategorySections.length > 0 ? groupedCategorySections : categorySections)].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (storefrontLayoutTab === "products") {
      const bannerSections = sortedBanners
        .filter((banner) => banner.showOnProducts)
        .map((banner) => ({
          type: "banner" as const,
          item: banner,
          sortOrder: Number(banner.productSortOrder ?? banner.sortOrder),
        }));
      const showcaseSections = sortedShowcases.map((showcase) => ({
        type: "showcase" as const,
        item: showcase,
        sortOrder: showcase.sortOrder,
      }));

      return [...bannerSections, ...showcaseSections].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const brandSections = sortedBrands.length > 0
      ? [{
        type: "brandGroup" as const,
        item: { id: "brand-group", title: "برندها", sortOrder: Number(sortedBrands[0]?.homeSortOrder ?? 1) },
        sortOrder: Number(sortedBrands[0]?.homeSortOrder ?? 1),
      }]
      : [];
    const groupedBrandSections = sortedBrandGroups
      .filter((group) => group.active !== false)
      .map((group) => ({
        type: "brandGroup" as const,
        item: { id: group.id, title: group.title, sortOrder: Number(group.sortOrder ?? 1) },
        sortOrder: Number(group.sortOrder ?? 1),
      }));

    return [
      ...sortedBanners
        .filter((banner) => banner.showOnHome)
        .map((banner) => ({
          type: "banner" as const,
          item: banner,
          sortOrder: Number(banner.homeSortOrder ?? banner.sortOrder),
        })),
      ...(groupedBrandSections.length > 0 ? groupedBrandSections : brandSections),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sortedBanners, sortedBrandGroups, sortedBrands, sortedCategories, sortedCategoryGroups, sortedShowcases, storefrontLayoutTab]);

  const currentSkeletonHints = useMemo<AdminSkeletonHints>(() => {
    const hints: AdminSkeletonHints = {};

    if (productsLoaded || loadedSections.products) {
      hints.products = sortedProducts.length;
    }

    if (loadedSections.banners) {
      hints.banners = sortedBanners.length;
    }

    if (loadedSections.showcases) {
      hints.showcases = sortedShowcases.length;
      hints.showcaseProductsById = Object.fromEntries(
        sortedShowcases.map((showcase) => {
          const loadedProductCount = productsLoaded ? getShowcaseProductsForAdmin(sortedProducts, showcase).length : undefined;
          const hintedProductCount = normalizedCount(showcase.productCount);
          return [showcase.id, loadedProductCount ?? hintedProductCount ?? 0];
        })
      );
    }

    if (loadedSections.categories) {
      hints.categories = sortedCategories.length;
      hints.categoryGroups = sortedCategoryGroups.length;
      hints.categoryItemsByGroupId = countByGroup(sortedCategories);
    }

    if (loadedSections.brands) {
      hints.brands = sortedBrands.length;
      hints.brandGroups = sortedBrandGroups.length;
      hints.brandItemsByGroupId = countByGroup(sortedBrands);
    }

    if (loadedSections.storefront) {
      hints.storefront = { [storefrontLayoutTab]: displaySections.length };
    }

    return hints;
  }, [
    displaySections.length,
    loadedSections,
    productsLoaded,
    sortedBanners,
    sortedBrandGroups,
    sortedBrands,
    sortedCategories,
    sortedCategoryGroups,
    sortedProducts,
    sortedShowcases,
    storefrontLayoutTab,
  ]);

  useEffect(() => {
    applySkeletonHints(currentSkeletonHints);
  }, [applySkeletonHints, currentSkeletonHints]);

  const persistProducts = async (
    nextProducts: ProductForm[],
    nextShowcases = sortedShowcases,
    nextBanners = sortedBanners,
    nextCategories = sortedCategories,
    nextBrands = sortedBrands,
    showSavedStatus = true,
    nextCategoryGroups = sortedCategoryGroups,
    nextBrandGroups = sortedBrandGroups
  ) => {
    setSaving(true);
    setStatus("");

    try {
      let productsToPersist = nextProducts;
      let showcasesToPersist = nextShowcases;
      let categoriesToPersist = nextCategories;
      let categoryGroupsToPersist = nextCategoryGroups;
      let brandsToPersist = nextBrands;
      let brandGroupsToPersist = nextBrandGroups;
      let bannersToPersist = nextBanners;
      let hasLoadedProducts = productsLoaded;
      let hasLoadedStructure = structureLoaded;
      let preserveExistingProducts = false;

      if (!hasLoadedStructure) {
        const catalog = await getAdminCatalogSection("all", { force: true });
        if (hasCatalogData(catalog)) {
          const snapshot = normalizeAdminCatalog(catalog, true);
          if (!loadedSections.products) productsToPersist = snapshot.products;
          if (!loadedSections.showcases) showcasesToPersist = snapshot.showcases;
          if (!loadedSections.categories) {
            categoriesToPersist = snapshot.categories;
            categoryGroupsToPersist = snapshot.categoryGroups;
          }
          if (!loadedSections.brands) {
            brandsToPersist = snapshot.brands;
            brandGroupsToPersist = snapshot.brandGroups;
          }
          if (!loadedSections.banners) bannersToPersist = snapshot.banners;

          if (!loadedSections.products) setProducts(snapshot.products);
          if (!loadedSections.showcases) setShowcases(snapshot.showcases);
          if (!loadedSections.categories) {
            setCategories(snapshot.categories);
            setCategoryGroups(snapshot.categoryGroups);
          }
          if (!loadedSections.brands) {
            setBrands(snapshot.brands);
            setBrandGroups(snapshot.brandGroups);
          }
          if (!loadedSections.banners) setBanners(snapshot.banners);
          setProductsLoaded(true);
          setStructureLoaded(true);
          setProductFormReferencesLoaded(true);
          setLoadedSections(() => markCatalogSectionsLoaded(initialLoadedSections, ADMIN_CATALOG_SECTIONS));
          hasLoadedProducts = true;
          hasLoadedStructure = true;
        }
      }

      if (!hasLoadedProducts) {
        const catalog = await getProducts({ all: true, full: true, force: true });
        if (hasCatalogData(catalog)) {
          const snapshot = normalizeAdminCatalog(catalog, true);
          productsToPersist = snapshot.products;
          if (!hasLoadedStructure) {
            showcasesToPersist = snapshot.showcases;
            categoriesToPersist = snapshot.categories;
            categoryGroupsToPersist = snapshot.categoryGroups;
            brandsToPersist = snapshot.brands;
            brandGroupsToPersist = snapshot.brandGroups;
            bannersToPersist = snapshot.banners;
            setShowcases(snapshot.showcases);
            setCategories(snapshot.categories);
            setCategoryGroups(snapshot.categoryGroups);
            setBrands(snapshot.brands);
            setBrandGroups(snapshot.brandGroups);
            setBanners(snapshot.banners);
            setStructureLoaded(true);
            setProductFormReferencesLoaded(true);
          }
          setProducts(snapshot.products);
          setProductsLoaded(true);
          setLoadedSections(() => markCatalogSectionsLoaded(initialLoadedSections, hasLoadedStructure ? ["products"] : ADMIN_CATALOG_SECTIONS));
        } else {
          preserveExistingProducts = true;
        }
      }

      const validProducts = dedupeProducts(
        productsToPersist.filter((item) => item.title.trim() && item.price.trim())
      );
      let attempt = 0;
      let res: Response | null = null;
      const maxAttempts = 3;
      const bodyPayload = JSON.stringify({
        preserveProducts: preserveExistingProducts,
        products: preserveExistingProducts ? [] : validProducts,
        showcases: showcasesToPersist.map((showcase) => ({
          id: showcase.id,
          title: showcase.title,
          active: showcase.active,
          mode: showcase.mode,
          autoSort: showcase.autoSort,
          limit: showcase.limit,
          categoryId: showcase.categoryId,
          manualProductIds: showcase.manualProductIds,
          sortOrder: showcase.sortOrder,
        })),
        categories: categoriesToPersist.map((category) => ({
          id: category.id,
          groupId: category.groupId,
          title: category.title,
          slug: category.slug,
          imageUrl: category.imageUrl,
          active: category.active,
          sortOrder: category.sortOrder,
          pageSortOrder: category.pageSortOrder,
        })),
        categoryGroups: categoryGroupsToPersist.map((group) => ({
          id: group.id,
          title: group.title,
          active: group.active,
          sortOrder: group.sortOrder,
        })),
        brands: brandsToPersist.map((brand) => ({
          id: brand.id,
          groupId: brand.groupId,
          title: brand.title,
          slug: brand.slug,
          imageUrl: brand.imageUrl,
          active: brand.active,
          sortOrder: brand.sortOrder,
          homeSortOrder: brand.homeSortOrder,
        })),
        brandGroups: brandGroupsToPersist.map((group) => ({
          id: group.id,
          title: group.title,
          active: group.active,
          sortOrder: group.sortOrder,
        })),
        banners: bannersToPersist.map((banner) => {
          const normalizedBanner = normalizeBannerTiming(banner);
          return {
            id: normalizedBanner.id,
            title: normalizedBanner.title,
            showcaseId: normalizedBanner.showOnShowcase ? normalizedBanner.showcaseId : "",
            imageUrls: normalizedBanner.imageUrls,
            active: normalizedBanner.active,
            showOnHome: normalizedBanner.showOnHome,
            showOnShowcase: normalizedBanner.showOnShowcase,
            showOnCategories: normalizedBanner.showOnCategories,
            showOnProducts: normalizedBanner.showOnProducts,
            intervalSeconds: normalizedBanner.intervalSeconds,
            heightPercent: normalizedBanner.heightPercent,
            homeSortOrder: normalizedBanner.homeSortOrder,
            showcaseSortOrder: normalizedBanner.showcaseSortOrder,
            categorySortOrder: normalizedBanner.categorySortOrder,
            productSortOrder: normalizedBanner.productSortOrder,
            sortOrder: normalizedBanner.sortOrder,
          };
        }),
      });

      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          res = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyPayload,
          });
        } catch {
          res = null;
        }

        if (!res) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 300));
          continue;
        }

        const maybeText = await res.text();
        let data: any = null;
        try {
          data = maybeText ? JSON.parse(maybeText) : null;
        } catch {
          data = { ok: res.ok, raw: maybeText };
        }

        if (res.ok && data?.ok !== false) {
          const savedProducts = Array.isArray(data?.data?.products)
            ? dedupeProducts(data.data.products.map(normalizeProduct))
            : validProducts;
          const savedShowcases = Array.isArray(data?.data?.showcases)
            ? ensureShowcases(savedProducts, data.data.showcases.map(normalizeShowcase))
            : showcasesToPersist;
          const savedBanners = Array.isArray(data?.data?.banners)
            ? data.data.banners.map(normalizeBanner)
            : bannersToPersist;
          const savedCategories = Array.isArray(data?.data?.categories)
            ? data.data.categories.map(normalizeCategory)
            : categoriesToPersist;
          const savedCategoryGroups = Array.isArray(data?.data?.categoryGroups)
            ? data.data.categoryGroups.map((group: Partial<CatalogLinkGroupForm>, index: number) => normalizeCatalogLinkGroup(group, index, "default-categories", "دسته بندی ها"))
            : categoryGroupsToPersist;
          const savedBrands = Array.isArray(data?.data?.brands)
            ? data.data.brands.map(normalizeBrand)
            : brandsToPersist;
          const savedBrandGroups = Array.isArray(data?.data?.brandGroups)
            ? data.data.brandGroups.map((group: Partial<CatalogLinkGroupForm>, index: number) => normalizeCatalogLinkGroup(group, index, "default-brands", "برندها"))
            : brandGroupsToPersist;

          setProducts(savedProducts);
          setShowcases(savedShowcases);
          setCategoryGroups(savedCategoryGroups);
          setCategories(savedCategories);
          setBrandGroups(savedBrandGroups);
          setBrands(savedBrands);
          setBanners(savedBanners);
          setProductsLoaded(true);
          setStructureLoaded(true);
          setProductFormReferencesLoaded(true);
          setLoadedSections(() => markCatalogSectionsLoaded(initialLoadedSections, ADMIN_CATALOG_SECTIONS));
          clearProductsCache();
          invalidateFetchCache(ADMIN_CATALOG_SECTION_URL);
          if (showSavedStatus) setStatus("اطلاعات فروشگاه در پایگاه داده ذخیره شد.");
          return true;
        }

        const transientMessage = String((data && data?.error) || "").toLowerCase();
        if (attempt < maxAttempts && (res.status >= 500 || transientMessage.includes("transaction"))) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          continue;
        }

        throw new Error(data?.message || data?.error || "ذخیره اطلاعات فروشگاه ناموفق بود.");
      }

      throw new Error("ذخیره اطلاعات فروشگاه بعد از چند تلاش ناموفق بود.");
    } catch (error) {
      console.error("Catalog save error:", error);
      setStatus(visibleStatusMessage(error, "ذخیره اطلاعات فروشگاه ناموفق بود."));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const persistStorefrontLayout = async (
    nextBanners = sortedBanners,
    nextShowcases = sortedShowcases,
    nextCategoryGroups = sortedCategoryGroups,
    nextBrandGroups = sortedBrandGroups,
    showSavedStatus = true
  ) => {
    setSaving(true);
    setStatus("");

    try {
      const storefrontPayload = buildStorefrontLayoutPayload(
        nextBanners.map(normalizeBannerTiming),
        nextShowcases,
        nextCategoryGroups,
        nextBrandGroups
      );
      const res = await fetch(`${ADMIN_CATALOG_SECTION_URL}/storefront`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storefront: {
            home: storefrontPayload.home,
            categories: storefrontPayload.categories,
            showcases: storefrontPayload.products,
          },
        }),
      });
      const maybeText = await res.text();
      let data: any = null;

      try {
        data = maybeText ? JSON.parse(maybeText) : null;
      } catch {
        data = { ok: res.ok, raw: maybeText };
      }

      if (!res.ok || data?.ok === false) {
        data = {
          ...data,
          message: visibleStatusMessage(
            data?.message || data?.error ? new Error(String(data?.message || data?.error)) : null,
            "ذخیره چیدمان فروشگاه ناموفق بود."
          ),
          error: undefined,
        };
        throw new Error(String(data.message));
      }

      applySkeletonHints(storefrontLayoutToSkeletonHints(storefrontPayload));
      clearProductsCache();
      invalidateFetchCache(ADMIN_CATALOG_SECTION_URL);
      if (showSavedStatus) {
        setStatus("چیدمان فروشگاه ذخیره شد.");
        return true;
      }
      return true;
    } catch (error) {
      console.error("Storefront layout save error:", error);
      if (!(error instanceof Error) || /[A-Za-z]/.test(error.message)) {
        setStatus("ذخیره چیدمان فروشگاه ناموفق بود.");
        return false;
      }
      setStatus(error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const reorderProducts = async (sourceId: number | string, targetId: number | string) => {
    if (String(sourceId) === String(targetId)) return;
    const ordered = [...sortedProducts];
    const sourceIndex = ordered.findIndex((product) => String(product.id) === String(sourceId));
    const targetIndex = ordered.findIndex((product) => String(product.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const reordered = ordered.map((product, index) => ({ ...product, sortOrder: index + 1 }));
    setProducts(reordered);
    await persistProducts(reordered, sortedShowcases, sortedBanners, sortedCategories, sortedBrands, false);
    setStatus("ترتیب محصولات ذخیره شد.");
  };

  const reorderCategories = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ordered = [...sortedCategories];
    const sourceIndex = ordered.findIndex((category) => category.id === sourceId);
    const targetIndex = ordered.findIndex((category) => category.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const targetGroupId = ordered[targetIndex].groupId;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, { ...moved, groupId: targetGroupId });
    const reordered = ordered.map((category, index) => ({ ...category, sortOrder: index + 1 }));
    setCategories(reordered);
    await persistProducts(products, sortedShowcases, sortedBanners, reordered, sortedBrands, false);
    setStatus("ترتیب دسته‌بندی‌ها ذخیره شد.");
  };

  const reorderBrands = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ordered = [...sortedBrands];
    const sourceIndex = ordered.findIndex((brand) => brand.id === sourceId);
    const targetIndex = ordered.findIndex((brand) => brand.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const targetGroupId = ordered[targetIndex].groupId;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, { ...moved, groupId: targetGroupId });
    const reordered = ordered.map((brand, index) => ({ ...brand, sortOrder: index + 1 }));
    setBrands(reordered);
    await persistProducts(products, sortedShowcases, sortedBanners, sortedCategories, reordered, false);
    setStatus("ترتیب برندها ذخیره شد.");
  };

  const reorderShowcaseProducts = async (showcase: ShowcaseForm, sourceProductId: number | string, targetProductId: number | string) => {
    if (String(sourceProductId) === String(targetProductId)) return;
    const visibleIds = getShowcaseProductsForAdmin(sortedProducts, showcase).map((product) => String(product.id));
    const sourceIndex = visibleIds.findIndex((id) => id === String(sourceProductId));
    const targetIndex = visibleIds.findIndex((id) => id === String(targetProductId));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = visibleIds.splice(sourceIndex, 1);
    visibleIds.splice(targetIndex, 0, moved);
    const nextShowcases = sortedShowcases.map((item) =>
      item.id === showcase.id
        ? { ...item, mode: "manual" as const, manualProductIds: visibleIds }
        : item
    );
    setShowcases(nextShowcases);
    await persistProducts(products, nextShowcases, sortedBanners, sortedCategories, sortedBrands, false);
    setStatus("ترتیب محصولات ویترین ذخیره شد.");
  };

  const openImagePreview = (imageUrl?: string) => {
    if (imageUrl) setPreviewImage(imageUrl);
  };

  const openCreateModal = () => {
    void (async () => {
      const references = await ensureProductFormReferences();
      const referenceCategories = references?.categories ?? sortedCategories;
      const firstCategory = referenceCategories[0]?.id ?? "general";
      setRequiredErrors([]);
      setDraftProduct({
        ...createProduct(),
        showcaseId: "",
        showcaseIds: [],
        categoryId: firstCategory,
        categoryIds: [firstCategory],
        sortOrder: products.length + 1,
      });
      setIsCreateOpen(true);
    })();
  };

  const openShowcaseModal = () => {
    void (async () => {
      await ensureProductFormReferences();
      setRequiredErrors([]);
      setDraftShowcase({ ...createShowcase(), sortOrder: nextDisplayOrder });
      setIsShowcaseOpen(true);
    })();
  };

  const openCategoryModal = (groupId?: string) => {
    setRequiredErrors([]);
    setDraftCategory({ ...createCategory(), groupId: groupId || sortedCategoryGroups[0]?.id || "default-categories", sortOrder: nextCategoryOrder });
    setIsCategoryOpen(true);
  };

  const openBrandModal = (groupId?: string) => {
    setRequiredErrors([]);
    setDraftBrand({ ...createBrand(), groupId: groupId || sortedBrandGroups[0]?.id || "default-brands", sortOrder: (Math.max(0, ...sortedBrands.map((brand) => brand.sortOrder)) || 0) + 1 });
    setIsBrandOpen(true);
  };

  const openCategoryGroupModal = () => {
    setRequiredErrors([]);
    setDraftCategoryGroup({ ...createCatalogLinkGroup("category"), sortOrder: (Math.max(0, ...sortedCategoryGroups.map((group) => group.sortOrder)) || 0) + 1 });
    setCategoryGroupLinkIds([]);
    setIsCategoryGroupOpen(true);
  };

  const openBrandGroupModal = () => {
    setRequiredErrors([]);
    setDraftBrandGroup({ ...createCatalogLinkGroup("brand"), sortOrder: (Math.max(0, ...sortedBrandGroups.map((group) => group.sortOrder)) || 0) + 1 });
    setBrandGroupLinkIds([]);
    setIsBrandGroupOpen(true);
  };

  const openEditCategoryGroupModal = (group: CatalogLinkGroupForm) => {
    setRequiredErrors([]);
    setEditingCategoryGroup(group);
    setCategoryGroupLinkIds(sortedCategories.filter((category) => category.groupId === group.id).map((category) => category.id));
    setIsEditCategoryGroupOpen(true);
  };

  const openEditBrandGroupModal = (group: CatalogLinkGroupForm) => {
    setRequiredErrors([]);
    setEditingBrandGroup(group);
    setBrandGroupLinkIds(sortedBrands.filter((brand) => brand.groupId === group.id).map((brand) => brand.id));
    setIsEditBrandGroupOpen(true);
  };

  const openBannerModal = () => {
    setRequiredErrors([]);
    setDraftBanner({ ...createBanner(), homeSortOrder: nextDisplayOrder, showcaseSortOrder: nextDisplayOrder, sortOrder: nextDisplayOrder });
    setDraftBannerImageUrl("");
    setIsBannerOpen(true);
  };

  const openEditShowcaseModal = (showcase: ShowcaseForm) => {
    void (async () => {
      await ensureProductFormReferences();
      setRequiredErrors([]);
      setEditingShowcase(showcase);
      setIsEditShowcaseOpen(true);
    })();
  };

  const openEditCategoryModal = (category: CategoryForm) => {
    setRequiredErrors([]);
    setEditingCategory(category);
    setIsEditCategoryOpen(true);
  };

  const openEditBrandModal = (brand: BrandForm) => {
    setRequiredErrors([]);
    setEditingBrand(brand);
    setIsEditBrandOpen(true);
  };

  const openEditBannerModal = (banner: BannerForm) => {
    setRequiredErrors([]);
    setEditingBanner(banner);
    setEditingBannerImageUrl("");
    setIsEditBannerOpen(true);
  };

  const openEditModal = (product: ProductForm) => {
    void (async () => {
      const references = await ensureProductFormReferences();
      const referenceBrands = references?.brands ?? sortedBrands;
      const selectedBrand = referenceBrands.find((brand) => product.brand === brand.id || product.brand === brand.title);
      setRequiredErrors([]);
      setEditingProduct(product.brand ? { ...product, brand: selectedBrand?.id ?? "" } : product);
      setIsEditOpen(true);
    })();
  };

  const updateDraftProduct = (patch: Partial<ProductForm>) => setDraftProduct((current) => updateProductPatch(current, patch));
  const updateDraftShowcase = (patch: Partial<ShowcaseForm>) => setDraftShowcase((current) => ({ ...current, ...patch }));
  const updateEditingShowcase = (patch: Partial<ShowcaseForm>) => setEditingShowcase((current) => (current ? { ...current, ...patch } : current));
  const updateEditingProduct = (patch: Partial<ProductForm>) => setEditingProduct((current) => (current ? updateProductPatch(current, patch) : current));
  const updateDraftBanner = (patch: Partial<BannerForm>) => setDraftBanner((current) => normalizeBannerTiming({ ...current, ...patch }));
  const updateEditingBanner = (patch: Partial<BannerForm>) => setEditingBanner((current) => (current ? normalizeBannerTiming({ ...current, ...patch }) : current));

  const updateDraftCategory = (patch: Partial<CategoryForm>) => {
    setDraftCategory((current) => {
      const next = { ...current, ...patch };
      if (patch.title !== undefined && !patch.slug) return { ...next, slug: slugifyValue(next.title), id: slugifyValue(next.title) || next.id };
      if (patch.slug !== undefined) return { ...next, slug: slugifyValue(patch.slug), id: slugifyValue(patch.slug) || next.id };
      return next;
    });
  };

  const updateEditingCategory = (patch: Partial<CategoryForm>) => {
    setEditingCategory((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (patch.title !== undefined && !patch.slug) return { ...next, slug: slugifyValue(next.title) };
      if (patch.slug !== undefined) return { ...next, slug: slugifyValue(patch.slug) };
      return next;
    });
  };

  const updateDraftBrand = (patch: Partial<BrandForm>) => {
    setDraftBrand((current) => {
      const next = { ...current, ...patch };
      if ("title" in patch && !current.slug.trim()) {
        next.slug = slugifyValue(String(patch.title ?? ""));
        next.id = next.slug || next.id;
      }
      if ("slug" in patch) {
        next.slug = slugifyValue(String(patch.slug ?? ""));
        next.id = next.slug || next.id;
      }
      return next;
    });
  };

  const updateEditingBrand = (patch: Partial<BrandForm>) => {
    setEditingBrand((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if ("title" in patch && !current.slug.trim()) {
        next.slug = slugifyValue(String(patch.title ?? ""));
        next.id = next.slug || next.id;
      }
      if ("slug" in patch) {
        next.slug = slugifyValue(String(patch.slug ?? ""));
        next.id = next.slug || next.id;
      }
      return next;
    });
  };

  const updateDraftPricing = (patch: Partial<ProductForm>) => {
    setDraftProduct((current) => updatePricingPatch(current, patch));
  };

  const updateEditingPricing = (patch: Partial<ProductForm>) => {
    setEditingProduct((current) => (current ? updatePricingPatch(current, patch) : current));
  };

  const appendProductImages = (imageUrls: string[], mode: "draft" | "edit") => {
    const urls = imageUrls.map((imageUrl) => String(imageUrl).trim()).filter(Boolean);
    if (urls.length === 0) return;

    if (mode === "draft") {
      setDraftProduct((current) => ({
        ...current,
        ...productImagePatch([...getProductImageUrls(current), ...urls]),
      }));
      return;
    }

    setEditingProduct((current) => current ? ({
      ...current,
      ...productImagePatch([...getProductImageUrls(current), ...urls]),
    }) : current);
  };

  const handleImageUpload = (files: FileList | null) => {
    void readFilesAsDataUrls(files).then((result) => {
      if (!result.ok) {
        if (result.error) setStatus(result.error);
        return;
      }
      appendProductImages(result.dataUrls, "draft");
    });
  };

  const handleEditImageUpload = (files: FileList | null) => {
    void readFilesAsDataUrls(files).then((result) => {
      if (!result.ok) {
        if (result.error) setStatus(result.error);
        return;
      }
      appendProductImages(result.dataUrls, "edit");
    });
  };

  const addProductImageUrl = (imageUrl: string, mode: "draft" | "edit") => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return false;
    if (!isAllowedWebpImageValue(trimmed)) {
      setStatus(WEBP_ONLY_ERROR);
      return false;
    }

    appendProductImages([trimmed], mode);
    return true;
  };

  const removeProductImage = (imageUrl: string, mode: "draft" | "edit") => {
    if (mode === "draft") {
      setDraftProduct((current) => ({
        ...current,
        ...productImagePatch(getProductImageUrls(current).filter((item) => item !== imageUrl)),
      }));
      return;
    }

    setEditingProduct((current) => current ? ({
      ...current,
      ...productImagePatch(getProductImageUrls(current).filter((item) => item !== imageUrl)),
    }) : current);
  };

  const handleCategoryImageUpload = (file: File | null, mode: "draft" | "edit") => {
    void readFileAsDataUrl(file).then((result) => {
      if (!result.ok) {
        if (result.error) setStatus(result.error);
        return;
      }
      if (mode === "draft") updateDraftCategory({ imageUrl: result.dataUrl });
      else updateEditingCategory({ imageUrl: result.dataUrl });
    });
  };

  const handleBrandImageUpload = (file: File | null, mode: "draft" | "edit") => {
    void readFileAsDataUrl(file).then((result) => {
      if (!result.ok) {
        if (result.error) setStatus(result.error);
        return;
      }
      if (mode === "draft") updateDraftBrand({ imageUrl: result.dataUrl });
      else updateEditingBrand({ imageUrl: result.dataUrl });
    });
  };

  const appendBannerImages = (imageUrls: string[], mode: "draft" | "edit") => {
    if (imageUrls.length === 0) return;
    if (mode === "draft") {
      updateDraftBanner({ imageUrls: [...draftBanner.imageUrls, ...imageUrls] });
      return;
    }
    if (editingBanner) updateEditingBanner({ imageUrls: [...editingBanner.imageUrls, ...imageUrls] });
  };

  const handleBannerImagesUpload = (files: FileList | null, mode: "draft" | "edit") => {
    void readFilesAsDataUrls(files).then((result) => {
      if (!result.ok) {
        if (result.error) setStatus(result.error);
        return;
      }
      appendBannerImages(result.dataUrls.filter(Boolean), mode);
    });
  };

  const addBannerImageUrl = (mode: "draft" | "edit") => {
    const imageUrl = mode === "draft" ? draftBannerImageUrl.trim() : editingBannerImageUrl.trim();
    if (!imageUrl) return;
    if (!isAllowedWebpImageValue(imageUrl)) {
      setStatus(WEBP_ONLY_ERROR);
      return;
    }
    appendBannerImages([imageUrl], mode);
    if (mode === "draft") setDraftBannerImageUrl("");
    else setEditingBannerImageUrl("");
  };

  const removeBannerImage = (imageUrl: string, mode: "draft" | "edit") => {
    if (mode === "draft") {
      updateDraftBanner({ imageUrls: draftBanner.imageUrls.filter((item) => item !== imageUrl) });
      return;
    }
    if (editingBanner) updateEditingBanner({ imageUrls: editingBanner.imageUrls.filter((item) => item !== imageUrl) });
  };

  const submitDraftProduct = async () => {
    if (saving) return;
    const errors = [
      !draftProduct.title.trim() && "draftProduct.title",
      !draftProduct.discountPrice.trim() && "draftProduct.discountPrice",
      draftProduct.categoryIds.length === 0 && "draftProduct.categoryId",
      !hasMatchingColorStock(draftProduct) && "draftProduct.colorStock",
    ].filter(Boolean) as string[];
    if (errors.length > 0) {
      showRequiredErrors(errors, "نام، قیمت جدید، دسته‌بندی و موجودی رنگ‌ها الزامی است.");
      return;
    }
    setRequiredErrors([]);
    const nextProducts = [...products, draftProduct];
    setProducts(nextProducts);
    setIsCreateOpen(false);
    await persistProducts(nextProducts);
  };

  const submitDraftShowcase = async () => {
    if (!draftShowcase.title.trim()) {
      showRequiredErrors(["draftShowcase.title"], "عنوان ویترین الزامی است.");
      return;
    }
    setRequiredErrors([]);
    const nextShowcases = [...sortedShowcases, draftShowcase];
    setShowcases(nextShowcases);
    setIsShowcaseOpen(false);
    await persistProducts(products, nextShowcases, sortedBanners);
  };

  const submitDraftCategory = async () => {
    if (!draftCategory.title.trim()) {
      showRequiredErrors(["draftCategory.title"], "عنوان دسته‌بندی الزامی است.");
      return;
    }
    const normalized = normalizeCategory(draftCategory, sortedCategories.length);
    setRequiredErrors([]);
    const nextCategories = [...sortedCategories, normalized];
    setCategories(nextCategories);
    setIsCategoryOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, nextCategories);
  };

  const submitDraftCategoryGroup = async () => {
    if (!draftCategoryGroup.title.trim()) {
      showRequiredErrors(["draftCategoryGroup.title"], "عنوان بخش دسته‌بندی الزامی است.");
      return;
    }
    const normalized = normalizeCatalogLinkGroup({
      ...draftCategoryGroup,
      id: slugifyValue(draftCategoryGroup.title) || draftCategoryGroup.id,
      sortOrder: (Math.max(0, ...sortedCategoryGroups.map((group) => group.sortOrder)) || 0) + 1,
    }, sortedCategoryGroups.length, "default-categories", "دسته بندی ها");
    const nextGroups = [...sortedCategoryGroups, normalized];
    const nextCategories = sortedCategories.map((category) =>
      categoryGroupLinkIds.includes(category.id) ? { ...category, groupId: normalized.id } : category
    );
    setRequiredErrors([]);
    setCategoryGroups(nextGroups);
    setCategories(nextCategories);
    setDraftCategoryGroup(createCatalogLinkGroup("category"));
    setCategoryGroupLinkIds([]);
    setIsCategoryGroupOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, nextCategories, sortedBrands, false, nextGroups, sortedBrandGroups);
  };

  const submitEditingCategoryGroup = async () => {
    if (!editingCategoryGroup) return;
    if (!editingCategoryGroup.title.trim()) {
      showRequiredErrors(["editingCategoryGroup.title"], "عنوان بخش دسته‌بندی الزامی است.");
      return;
    }
    const normalized = normalizeCatalogLinkGroup(editingCategoryGroup, editingCategoryGroup.sortOrder, "default-categories", "دسته بندی ها");
    const nextGroups = sortedCategoryGroups.map((group) => (group.id === editingCategoryGroup.id ? normalized : group));
    const fallbackGroupId = sortedCategoryGroups.find((group) => group.id !== editingCategoryGroup.id)?.id || normalized.id;
    const nextCategories = sortedCategories.map((category) => {
      if (categoryGroupLinkIds.includes(category.id)) return { ...category, groupId: normalized.id };
      if (category.groupId === normalized.id) return { ...category, groupId: fallbackGroupId };
      return category;
    });
    setRequiredErrors([]);
    setCategoryGroups(nextGroups);
    setCategories(nextCategories);
    setEditingCategoryGroup(null);
    setCategoryGroupLinkIds([]);
    setIsEditCategoryGroupOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, nextCategories, sortedBrands, false, nextGroups, sortedBrandGroups);
  };

  const submitDraftBrand = async () => {
    if (!draftBrand.title.trim()) {
      showRequiredErrors(["draftBrand.title"], "عنوان برند الزامی است.");
      return;
    }
    const normalized = normalizeBrand(draftBrand, sortedBrands.length);
    setRequiredErrors([]);
    const nextBrands = [...sortedBrands, normalized];
    setBrands(nextBrands);
    setIsBrandOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, sortedCategories, nextBrands);
  };

  const submitDraftBrandGroup = async () => {
    if (!draftBrandGroup.title.trim()) {
      showRequiredErrors(["draftBrandGroup.title"], "عنوان بخش برند الزامی است.");
      return;
    }
    const normalized = normalizeCatalogLinkGroup({
      ...draftBrandGroup,
      id: slugifyValue(draftBrandGroup.title) || draftBrandGroup.id,
      sortOrder: (Math.max(0, ...sortedBrandGroups.map((group) => group.sortOrder)) || 0) + 1,
    }, sortedBrandGroups.length, "default-brands", "برندها");
    const nextGroups = [...sortedBrandGroups, normalized];
    const nextBrands = sortedBrands.map((brand) =>
      brandGroupLinkIds.includes(brand.id) ? { ...brand, groupId: normalized.id } : brand
    );
    setRequiredErrors([]);
    setBrandGroups(nextGroups);
    setBrands(nextBrands);
    setDraftBrandGroup(createCatalogLinkGroup("brand"));
    setBrandGroupLinkIds([]);
    setIsBrandGroupOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, sortedCategories, nextBrands, false, sortedCategoryGroups, nextGroups);
  };

  const submitEditingBrandGroup = async () => {
    if (!editingBrandGroup) return;
    if (!editingBrandGroup.title.trim()) {
      showRequiredErrors(["editingBrandGroup.title"], "عنوان بخش برند الزامی است.");
      return;
    }
    const normalized = normalizeCatalogLinkGroup(editingBrandGroup, editingBrandGroup.sortOrder, "default-brands", "برندها");
    const nextGroups = sortedBrandGroups.map((group) => (group.id === editingBrandGroup.id ? normalized : group));
    const fallbackGroupId = sortedBrandGroups.find((group) => group.id !== editingBrandGroup.id)?.id || normalized.id;
    const nextBrands = sortedBrands.map((brand) => {
      if (brandGroupLinkIds.includes(brand.id)) return { ...brand, groupId: normalized.id };
      if (brand.groupId === normalized.id) return { ...brand, groupId: fallbackGroupId };
      return brand;
    });
    setRequiredErrors([]);
    const saved = await persistProducts(products, sortedShowcases, sortedBanners, sortedCategories, nextBrands, false, sortedCategoryGroups, nextGroups);
    if (!saved) return;
    setBrandGroups(nextGroups);
    setBrands(nextBrands);
    setEditingBrandGroup(null);
    setBrandGroupLinkIds([]);
    setIsEditBrandGroupOpen(false);
  };

  const submitDraftBanner = async () => {
    if (draftBanner.imageUrls.length === 0) {
      showRequiredErrors(["draftBanner.images"], "برای بنر حداقل یک تصویر لازم است.");
      return;
    }
    setRequiredErrors([]);
    const normalizedBanner = normalizeBannerTiming(draftBanner);
    const nextBanners = [...sortedBanners, normalizedBanner];
    setBanners(nextBanners);
    setIsBannerOpen(false);
    await persistProducts(products, sortedShowcases, nextBanners);
  };

  const submitEditingShowcase = async () => {
    if (!editingShowcase) return;
    if (!editingShowcase.title.trim()) {
      showRequiredErrors(["editingShowcase.title"], "عنوان ویترین الزامی است.");
      return;
    }
    setRequiredErrors([]);
    const nextShowcases = sortedShowcases.map((showcase) => showcase.id === editingShowcase.id ? editingShowcase : showcase);
    setShowcases(nextShowcases);
    setIsEditShowcaseOpen(false);
    setEditingShowcase(null);
    await persistProducts(products, nextShowcases, sortedBanners);
  };

  const submitEditingCategory = async () => {
    if (!editingCategory) return;
    if (!editingCategory.title.trim()) {
      showRequiredErrors(["editingCategory.title"], "عنوان دسته‌بندی الزامی است.");
      return;
    }
    const nextCategories = sortedCategories.map((category) =>
      category.id === editingCategory.id ? normalizeCategory(editingCategory, category.sortOrder) : category
    );
    setRequiredErrors([]);
    setCategories(nextCategories);
    setIsEditCategoryOpen(false);
    setEditingCategory(null);
    await persistProducts(products, sortedShowcases, sortedBanners, nextCategories);
  };

  const submitEditingBrand = async () => {
    if (!editingBrand) return;
    if (!editingBrand.title.trim()) {
      showRequiredErrors(["editingBrand.title"], "عنوان برند الزامی است.");
      return;
    }
    const nextBrand = normalizeBrand(editingBrand, editingBrand.sortOrder);
    const nextBrands = sortedBrands.map((brand) => brand.id === editingBrand.id ? nextBrand : brand);
    const nextProducts = products.map((product) => product.brand === editingBrand.id ? { ...product, brand: nextBrand.id } : product);
    setRequiredErrors([]);
    setProducts(nextProducts);
    setBrands(nextBrands);
    setIsEditBrandOpen(false);
    setEditingBrand(null);
    await persistProducts(nextProducts, sortedShowcases, sortedBanners, sortedCategories, nextBrands);
  };

  const submitEditingBanner = async () => {
    if (!editingBanner) return;
    if (editingBanner.imageUrls.length === 0) {
      showRequiredErrors(["editingBanner.images"], "برای بنر حداقل یک تصویر لازم است.");
      return;
    }
    setRequiredErrors([]);
    const normalizedBanner = normalizeBannerTiming(editingBanner);
    const nextBanners = sortedBanners.map((banner) => banner.id === normalizedBanner.id ? normalizedBanner : banner);
    setBanners(nextBanners);
    setIsEditBannerOpen(false);
    setEditingBanner(null);
    await persistProducts(products, sortedShowcases, nextBanners);
  };

  const deleteEditingBanner = async () => {
    if (!editingBanner) return;
    const nextBanners = sortedBanners.filter((banner) => banner.id !== editingBanner.id);
    setBanners(nextBanners);
    setIsEditBannerOpen(false);
    setEditingBanner(null);
    await persistProducts(products, sortedShowcases, nextBanners);
  };

  const deleteShowcase = async (showcaseToDelete: ShowcaseForm) => {
    const nextShowcases = sortedShowcases.filter((showcase) => showcase.id !== showcaseToDelete.id);
    const nextProducts = products.map((product) => {
      if (!product.showcaseIds.includes(showcaseToDelete.id)) return product;
      const showcaseIds = product.showcaseIds.filter((id) => id !== showcaseToDelete.id);
      return { ...product, showcaseId: showcaseIds[0] ?? "", showcaseIds };
    });
    setShowcases(nextShowcases);
    setProducts(nextProducts);
    setIsEditShowcaseOpen(false);
    setEditingShowcase(null);
    await persistProducts(nextProducts, nextShowcases, sortedBanners);
    setStatus("ویترین حذف شد.");
  };

  const deleteEditingShowcase = async () => {
    if (editingShowcase) await deleteShowcase(editingShowcase);
  };

  const deleteEditingCategory = async () => {
    if (!editingCategory) return;
    const fallbackCategory = sortedCategories.find((category) => category.id !== editingCategory.id)?.id ?? "general";
    const nextCategories = sortedCategories.filter((category) => category.id !== editingCategory.id);
    const nextProducts = products.map((product) => {
      if (!product.categoryIds.includes(editingCategory.id)) return product;
      const categoryIds = product.categoryIds.filter((id) => id !== editingCategory.id);
      const normalized = categoryIds.length > 0 ? categoryIds : [fallbackCategory];
      return { ...product, categoryId: normalized[0], categoryIds: normalized };
    });
    setProducts(nextProducts);
    setCategories(nextCategories);
    setIsEditCategoryOpen(false);
    setEditingCategory(null);
    await persistProducts(nextProducts, sortedShowcases, sortedBanners, nextCategories);
  };

  const deleteEditingBrand = async () => {
    if (!editingBrand) return;
    const nextBrands = sortedBrands.filter((brand) => brand.id !== editingBrand.id);
    const nextProducts = products.map((product) => product.brand === editingBrand.id ? { ...product, brand: "" } : product);
    setProducts(nextProducts);
    setBrands(nextBrands);
    setIsEditBrandOpen(false);
    setEditingBrand(null);
    await persistProducts(nextProducts, sortedShowcases, sortedBanners, sortedCategories, nextBrands);
  };

  const submitEditingProduct = async () => {
    if (saving || !editingProduct) return;
    const errors = [
      !editingProduct.title.trim() && "editingProduct.title",
      !editingProduct.discountPrice.trim() && "editingProduct.discountPrice",
      editingProduct.categoryIds.length === 0 && "editingProduct.categoryId",
      !hasMatchingColorStock(editingProduct) && "editingProduct.colorStock",
    ].filter(Boolean) as string[];
    if (errors.length > 0) {
      showRequiredErrors(errors, "نام، قیمت جدید، دسته‌بندی و موجودی رنگ‌ها الزامی است.");
      return;
    }
    setRequiredErrors([]);
    const nextProducts = products.map((item) => item.id === editingProduct.id ? editingProduct : item);
    setProducts(nextProducts);
    setIsEditOpen(false);
    setEditingProduct(null);
    await persistProducts(nextProducts);
  };

  const deleteEditingProduct = async () => {
    if (saving || !editingProduct) return;
    const editingKey = getProductKey(editingProduct);
    const nextProducts = products.filter((item) => item.id !== editingProduct.id && getProductKey(item) !== editingKey);
    setProducts(nextProducts);
    setIsEditOpen(false);
    setEditingProduct(null);
    await persistProducts(nextProducts);
  };

  const updateBannerPlacement = async (banner: BannerForm, sortOrder: number) => {
    const nextBanners = banners.map((item) => {
      if (item.id !== banner.id) return item;
      if (storefrontLayoutTab === "categories") return { ...item, categorySortOrder: sortOrder };
      if (storefrontLayoutTab === "products") return { ...item, productSortOrder: sortOrder };
      return { ...item, homeSortOrder: sortOrder, sortOrder };
    });
    setBanners(nextBanners);
    const saved = await persistStorefrontLayout(nextBanners, showcases, categoryGroups, brandGroups);
    if (!saved) setBanners(banners);
  };

  const updateShowcasePlacement = async (showcase: ShowcaseForm, sortOrder: number) => {
    const nextShowcases = showcases.map((item) => (item.id === showcase.id ? { ...item, sortOrder } : item));
    setShowcases(nextShowcases);
    const saved = await persistStorefrontLayout(banners, nextShowcases, categoryGroups, brandGroups);
    if (!saved) setShowcases(showcases);
  };

  const updateCategoryGroupPlacement = async (groupId: string, sortOrder: number) => {
    const nextCategoryGroups = categoryGroups.map((item) => (item.id === groupId ? { ...item, sortOrder } : item));
    setCategoryGroups(nextCategoryGroups);
    const saved = await persistStorefrontLayout(banners, showcases, nextCategoryGroups, brandGroups);
    if (!saved) setCategoryGroups(categoryGroups);
  };

  const updateBrandGroupPlacement = async (groupId: string, sortOrder: number) => {
    const nextBrandGroups = brandGroups.map((item) => (item.id === groupId ? { ...item, sortOrder } : item));
    setBrandGroups(nextBrandGroups);
    const saved = await persistStorefrontLayout(banners, showcases, categoryGroups, nextBrandGroups);
    if (!saved) setBrandGroups(brandGroups);
  };

  const reorderStorefrontSections = async (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;
    const ordered = displaySections.map((entry) => ({ type: entry.type, item: entry.item, key: storefrontKey(entry) }));
    const sourceIndex = ordered.findIndex((entry) => entry.key === sourceKey);
    const targetIndex = ordered.findIndex((entry) => entry.key === targetKey);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const nextOrder = new Map(ordered.map((entry, index) => [entry.key, index + 1]));
    const nextBanners = banners.map((banner) => ({
      ...banner,
      homeSortOrder: storefrontLayoutTab === "home" ? nextOrder.get(`banner:${banner.id}`) ?? banner.homeSortOrder : banner.homeSortOrder,
      categorySortOrder: storefrontLayoutTab === "categories" ? nextOrder.get(`banner:${banner.id}`) ?? banner.categorySortOrder : banner.categorySortOrder,
      productSortOrder: storefrontLayoutTab === "products" ? nextOrder.get(`banner:${banner.id}`) ?? banner.productSortOrder : banner.productSortOrder,
      sortOrder: storefrontLayoutTab === "home" ? nextOrder.get(`banner:${banner.id}`) ?? banner.sortOrder : banner.sortOrder,
    }));
    const nextShowcases = showcases.map((showcase) => ({
      ...showcase,
      sortOrder: storefrontLayoutTab === "products" ? nextOrder.get(`showcase:${showcase.id}`) ?? showcase.sortOrder : showcase.sortOrder,
    }));
    const nextCategories = categories.map((category) => ({ ...category }));
    const nextBrands = brands.map((brand) => ({ ...brand }));
    const nextCategoryGroups = categoryGroups.map((group) => ({
      ...group,
      sortOrder: storefrontLayoutTab === "categories" ? nextOrder.get(`categoryGroup:${group.id}`) ?? group.sortOrder : group.sortOrder,
    }));
    const nextBrandGroups = brandGroups.map((group) => ({
      ...group,
      sortOrder: storefrontLayoutTab === "home" ? nextOrder.get(`brandGroup:${group.id}`) ?? group.sortOrder : group.sortOrder,
    }));

    setBanners(nextBanners);
    setShowcases(nextShowcases);
    setCategories(nextCategories);
    setBrands(nextBrands);
    setCategoryGroups(nextCategoryGroups);
    setBrandGroups(nextBrandGroups);
    const saved = await persistStorefrontLayout(nextBanners, nextShowcases, nextCategoryGroups, nextBrandGroups, false);
    if (!saved) {
      setBanners(banners);
      setShowcases(showcases);
      setCategories(categories);
      setBrands(brands);
      setCategoryGroups(categoryGroups);
      setBrandGroups(brandGroups);
      return;
    }
    setStatus("چیدمان فروشگاه ذخیره شد.");
  };

  return {
    products,
    sortedProducts,
    sortedShowcases,
    sortedCategories,
    sortedCategoryGroups,
    sortedBrands,
    sortedBrandGroups,
    sortedBanners,
    displaySections,
    skeletonHints,
    loading,
    sectionReady: activeSectionReady,
    saving,
    status,
    draftProduct,
    draftShowcase,
    draftCategory,
    draftCategoryGroup,
    draftBrand,
    draftBrandGroup,
    draftBanner,
    editingShowcase,
    editingCategory,
    editingBrand,
    editingCategoryGroup,
    editingBrandGroup,
    editingBanner,
    editingProduct,
    isCreateOpen,
    isShowcaseOpen,
    isEditShowcaseOpen,
    isCategoryOpen,
    isBrandOpen,
    isCategoryGroupOpen,
    isBrandGroupOpen,
    isEditCategoryGroupOpen,
    isEditBrandGroupOpen,
    isEditCategoryOpen,
    isEditBrandOpen,
    isBannerOpen,
    isEditBannerOpen,
    isEditOpen,
    previewImage,
    draggingProductId,
    draggingCategoryId,
    draggingBrandId,
    draggingStorefrontKey,
    storefrontLayoutTab,
    draftBannerImageUrl,
    editingBannerImageUrl,
    categoryGroupLinkIds,
    brandGroupLinkIds,
    setIsCreateOpen,
    setIsShowcaseOpen,
    setIsEditShowcaseOpen,
    setIsCategoryOpen,
    setIsBrandOpen,
    setIsCategoryGroupOpen,
    setIsBrandGroupOpen,
    setIsEditCategoryGroupOpen,
    setIsEditBrandGroupOpen,
    setIsEditCategoryOpen,
    setIsEditBrandOpen,
    setIsBannerOpen,
    setIsEditBannerOpen,
    setIsEditOpen,
    setEditingShowcase,
    setEditingCategory,
    setEditingBrand,
    setEditingCategoryGroup,
    setEditingBrandGroup,
    setEditingBanner,
    setEditingProduct,
    setPreviewImage,
    setStorefrontLayoutTab,
    setDraftBannerImageUrl,
    setEditingBannerImageUrl,
    setCategoryGroupLinkIds,
    setBrandGroupLinkIds,
    setDraftCategoryGroup,
    setDraftBrandGroup,
    setDraggingProductId,
    setDraggingCategoryId,
    setDraggingBrandId,
    setDraggingStorefrontKey,
    hasRequiredError,
    openImagePreview,
    openCreateModal,
    openShowcaseModal,
    openCategoryModal,
    openBrandModal,
    openCategoryGroupModal,
    openBrandGroupModal,
    openEditCategoryGroupModal,
    openEditBrandGroupModal,
    openBannerModal,
    openEditShowcaseModal,
    openEditCategoryModal,
    openEditBrandModal,
    openEditBannerModal,
    openEditModal,
    updateDraftProduct,
    updateDraftShowcase,
    updateDraftCategory,
    updateDraftBrand,
    updateDraftBanner,
    updateEditingShowcase,
    updateEditingCategory,
    updateEditingBrand,
    updateEditingBanner,
    updateEditingProduct,
    updateDraftPricing,
    updateEditingPricing,
    handleImageUpload,
    handleEditImageUpload,
    handleCategoryImageUpload,
    handleBrandImageUpload,
    handleBannerImagesUpload,
    addProductImageUrl,
    removeProductImage,
    addBannerImageUrl,
    removeBannerImage,
    submitDraftProduct,
    submitDraftShowcase,
    submitDraftCategory,
    submitDraftCategoryGroup,
    submitEditingCategoryGroup,
    submitDraftBrand,
    submitDraftBrandGroup,
    submitEditingBrandGroup,
    submitDraftBanner,
    submitEditingShowcase,
    submitEditingCategory,
    submitEditingBrand,
    submitEditingBanner,
    deleteEditingBanner,
    deleteEditingShowcase,
    deleteEditingCategory,
    deleteEditingBrand,
    deleteShowcase,
    submitEditingProduct,
    deleteEditingProduct,
    updateBannerPlacement,
    updateShowcasePlacement,
    updateCategoryGroupPlacement,
    updateBrandGroupPlacement,
    reorderProducts,
    reorderCategories,
    reorderBrands,
    reorderShowcaseProducts,
    reorderStorefrontSections,
    formatPrice,
    storefrontKey,
  };
}

function updatePricingPatch(product: ProductForm, patch: Partial<ProductForm>) {
  const normalizedPatch = {
    ...patch,
    ...(patch.originalPrice !== undefined ? { originalPrice: formatAmount(patch.originalPrice) } : {}),
    ...(patch.discountPrice !== undefined ? { discountPrice: formatAmount(patch.discountPrice) } : {}),
  };
  const next = { ...product, ...normalizedPatch };

  if (normalizedPatch.originalPrice !== undefined || normalizedPatch.discountPrice !== undefined) {
    const discountPercent = calculateDiscountPercent(next.originalPrice, next.discountPrice);
    return {
      ...next,
      discountPercent,
      price: next.discountPrice,
    };
  }

  return next;
}

function updateProductPatch(product: ProductForm, patch: Partial<ProductForm>) {
  const next = { ...product, ...patch };

  if (patch.slug !== undefined) {
    return { ...next, slug: slugifyValue(String(patch.slug ?? "")) };
  }

  if (patch.title !== undefined) {
    const previousAutoSlug = slugifyValue(product.title);
    const shouldSyncSlug = !product.slug.trim() || product.slug === previousAutoSlug;
    if (shouldSyncSlug) return { ...next, slug: slugifyValue(String(patch.title ?? "")) };
  }

  return next;
}

export type AdminProductsPanelState = ReturnType<typeof useAdminProductsPanel>;
