import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { requireAdmin } from "@/lib/api/auth";
import { bannerSchema, productSchema, showcaseSchema } from "@/lib/api/schemas";
import { invalidateCatalogCache } from "@/lib/api/catalog-cache";
import { normalizeProductData, normalizeProductPatchData } from "@/lib/api/catalog-service";
import { readImageMetaRecord as readImageMeta, readStoredImageUrls } from "@/lib/catalog-utils";
import { nextOrderStatus, normalizeOrderStatus, ORDER_STATUSES } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ path?: string[] }> };

async function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return { ok: false as const, response: limited };
  return requireAdmin(request);
}

function images(data: any) {
  if (Array.isArray(data.imageUrls)) return data.imageUrls;
  return data.images ?? null;
}

async function readAdminOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
        },
      },
      items: {
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const profileIds = orders.map((order: any) => order.profileId).filter((id: unknown): id is string => Boolean(id));
  const profiles = profileIds.length > 0
    ? await prisma.customerProfile.findMany({
        where: { id: { in: Array.from(new Set(profileIds)) } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          address: true,
        },
      })
    : [];
  const profilesById = new Map(profiles.map((profile: any) => [profile.id, profile]));

  return orders.map((order: any) => ({
    id: order.id,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    trackingCode: order.trackingCode,
    shippedAt: order.shippedAt,
    statusHistory: order.statusHistory,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    user: order.user,
    profile: order.profileId ? profilesById.get(order.profileId) ?? null : null,
    items: order.items,
  }));
}

async function readStructure() {
  const [banners, showcases, products] = await Promise.all([
    prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.showcase.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  return { banners, showcases, products };
}

function emptyAdminCatalog() {
  return {
    products: [],
    showcases: [],
    categories: [],
    categoryGroups: [],
    brands: [],
    brandGroups: [],
    banners: [],
    tree: { sections: [] },
    catalog: {
      placement: 0,
      showcases: [],
      categoryGroups: [],
      categories: [],
      brandGroups: [],
      brands: [],
      banners: [],
    },
  };
}

type StorefrontLayoutTab = "home" | "categories" | "products";
type BannerLayoutRecord = {
  id: string;
  title: string | null;
  showcaseId: string | null;
  active: boolean;
  sortOrder: number;
  images: unknown;
};
type BannerLayoutPatch = {
  id?: unknown;
  showcaseId?: unknown;
  showOnHome?: unknown;
  showOnShowcase?: unknown;
  showOnCategories?: unknown;
  showOnProducts?: unknown;
  homeSortOrder?: unknown;
  showcaseSortOrder?: unknown;
  categorySortOrder?: unknown;
  productSortOrder?: unknown;
  sortOrder?: unknown;
};
type StorefrontLayoutItemType = "banner" | "showcase" | "categoryGroup" | "brandGroup";
type StorefrontLayoutItem = {
  type: StorefrontLayoutItemType;
  id: string;
  title: string;
  sortOrder: number;
};
type StorefrontLayout = Record<StorefrontLayoutTab, StorefrontLayoutItem[]>;
type StorefrontLayoutResponse = {
  home: StorefrontLayoutItem[];
  categories: StorefrontLayoutItem[];
  showcases: StorefrontLayoutItem[];
};
type LayoutGroupRecord = {
  id: string;
  title: string | null;
  active: boolean;
  sortOrder: number;
};
type LayoutShowcaseRecord = {
  id: string;
  title: string | null;
  active: boolean;
  sortOrder: number;
};

const DEFAULT_CATEGORY_GROUP_TITLE = "دسته‌بندی‌ها";
const DEFAULT_BRAND_GROUP_TITLE = "برندها";

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function optionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

function getBannerLayout(banner: BannerLayoutRecord) {
  const meta = readImageMeta(banner.images);
  const showcaseId = String(banner.showcaseId ?? meta.showcaseId ?? "").trim();
  const hasExplicitTargets = typeof meta.showOnHome === "boolean"
    || typeof meta.showOnShowcase === "boolean"
    || typeof meta.showOnCategories === "boolean"
    || typeof meta.showOnProducts === "boolean";
  const showOnHome = hasExplicitTargets ? meta.showOnHome !== false : !showcaseId;
  const showOnShowcase = hasExplicitTargets ? meta.showOnShowcase === true : Boolean(showcaseId);
  const showOnCategories = meta.showOnCategories === true;
  const showOnProducts = typeof meta.showOnProducts === "boolean" ? meta.showOnProducts === true : showOnShowcase;
  const homeSortOrder = optionalNumber(meta.homeSortOrder) ?? banner.sortOrder;
  const showcaseSortOrder = optionalNumber(meta.showcaseSortOrder) ?? banner.sortOrder;
  const categorySortOrder = optionalNumber(meta.categorySortOrder) ?? homeSortOrder;
  const productSortOrder = optionalNumber(meta.productSortOrder) ?? showcaseSortOrder;

  return {
    showcaseId,
    showOnHome,
    showOnShowcase,
    showOnCategories,
    showOnProducts,
    homeSortOrder,
    showcaseSortOrder,
    categorySortOrder,
    productSortOrder,
  };
}

function sortLayoutItems(items: StorefrontLayoutItem[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function toLayoutItem(type: StorefrontLayoutItemType, item: { id: string; title?: string | null }, sortOrder: number): StorefrontLayoutItem {
  return {
    type,
    id: item.id,
    title: item.title ?? "",
    sortOrder,
  };
}

function bannerLayoutItems(banners: BannerLayoutRecord[], tab: StorefrontLayoutTab) {
  return banners
    .filter((banner) => {
      const layout = getBannerLayout(banner);
      if (tab === "categories") return layout.showOnCategories;
      if (tab === "products") return layout.showOnProducts;
      return layout.showOnHome;
    })
    .map((banner) => {
      const layout = getBannerLayout(banner);
      const sortOrder = tab === "categories"
        ? layout.categorySortOrder
        : tab === "products"
          ? layout.productSortOrder
          : layout.homeSortOrder;
      return toLayoutItem("banner", banner, sortOrder);
    });
}

function normalizeStorefrontLayoutItem(value: unknown): StorefrontLayoutItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  const type = String(record.type ?? "").trim() as StorefrontLayoutItemType;
  const sortOrder = optionalNumber(record.sortOrder);

  if (!id || sortOrder === undefined) return null;
  if (type !== "banner" && type !== "showcase" && type !== "categoryGroup" && type !== "brandGroup") return null;

  return {
    type,
    id,
    title: String(record.title ?? ""),
    sortOrder,
  };
}

function normalizeStorefrontLayoutInput(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const productsValue = Array.isArray(record.products) ? record.products : record.showcases;

  return {
    home: Array.isArray(record.home) ? record.home.map(normalizeStorefrontLayoutItem).filter(Boolean) as StorefrontLayoutItem[] : [],
    categories: Array.isArray(record.categories) ? record.categories.map(normalizeStorefrontLayoutItem).filter(Boolean) as StorefrontLayoutItem[] : [],
    products: Array.isArray(productsValue) ? productsValue.map(normalizeStorefrontLayoutItem).filter(Boolean) as StorefrontLayoutItem[] : [],
  };
}

function hasStorefrontLayoutItems(layout: StorefrontLayout) {
  return layout.home.length > 0 || layout.categories.length > 0 || layout.products.length > 0;
}

function layoutOrderPatches(items: StorefrontLayoutItem[], type: StorefrontLayoutItemType) {
  return items
    .filter((item) => item.type === type)
    .map((item) => ({ id: item.id, sortOrder: item.sortOrder }));
}

function buildBannerLayoutPatches(layout: StorefrontLayout): BannerLayoutPatch[] {
  const entriesById = new Map<string, Partial<Record<StorefrontLayoutTab, StorefrontLayoutItem>>>();

  for (const tab of ["home", "categories", "products"] as StorefrontLayoutTab[]) {
    for (const item of layout[tab]) {
      if (item.type !== "banner") continue;
      entriesById.set(item.id, {
        ...(entriesById.get(item.id) ?? {}),
        [tab]: item,
      });
    }
  }

  return Array.from(entriesById.entries()).map(([id, entries]) => ({
    id,
    showOnHome: Boolean(entries.home),
    showOnCategories: Boolean(entries.categories),
    showOnProducts: Boolean(entries.products),
    homeSortOrder: entries.home?.sortOrder,
    categorySortOrder: entries.categories?.sortOrder,
    productSortOrder: entries.products?.sortOrder,
  }));
}

function toStorefrontLayoutResponse(layout: StorefrontLayout): StorefrontLayoutResponse {
  return {
    home: layout.home,
    categories: layout.categories,
    showcases: layout.products,
  };
}

function mergeBannerImagesMeta(currentImages: unknown, patch: BannerLayoutPatch, currentLayout: ReturnType<typeof getBannerLayout>) {
  const base = readImageMeta(currentImages);
  const urls = readStoredImageUrls(currentImages);
  const showOnHome = optionalBoolean(patch.showOnHome) ?? currentLayout.showOnHome;
  const showOnShowcase = optionalBoolean(patch.showOnShowcase) ?? currentLayout.showOnShowcase;
  const showOnCategories = optionalBoolean(patch.showOnCategories) ?? currentLayout.showOnCategories;
  const showOnProducts = optionalBoolean(patch.showOnProducts) ?? currentLayout.showOnProducts;
  const showcaseId = patch.showcaseId !== undefined
    ? String(patch.showcaseId ?? "").trim()
    : currentLayout.showcaseId;

  return {
    ...base,
    urls,
    showOnHome,
    showOnShowcase,
    showOnCategories,
    showOnProducts,
    showcaseId,
    homeSortOrder: optionalNumber(patch.homeSortOrder ?? patch.sortOrder) ?? currentLayout.homeSortOrder,
    showcaseSortOrder: optionalNumber(patch.showcaseSortOrder) ?? currentLayout.showcaseSortOrder,
    categorySortOrder: optionalNumber(patch.categorySortOrder) ?? currentLayout.categorySortOrder,
    productSortOrder: optionalNumber(patch.productSortOrder) ?? currentLayout.productSortOrder,
  };
}

async function readAdminProducts() {
  return prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
}

async function readAdminProductRefs() {
  return prisma.product.findMany({
    select: {
      id: true,
      showcaseId: true,
      showcaseIds: true,
      categoryId: true,
      categoryIds: true,
      brand: true,
    },
  });
}

type AdminProductRef = Awaited<ReturnType<typeof readAdminProductRefs>>[number];
type AdminShowcaseRecord = {
  id: string;
  mode?: string | null;
  limit?: number | null;
  categoryId?: string | null;
  manualProductIds?: unknown;
};
function stringList(value: unknown, fallback: string[] = []) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;
}

function productMatchesCategory(product: AdminProductRef, categoryId: string) {
  return stringList(product.categoryIds, [String(product.categoryId ?? "")]).includes(categoryId);
}

function productMatchesShowcase(product: AdminProductRef, showcaseId: string) {
  return stringList(product.showcaseIds, product.showcaseId ? [String(product.showcaseId)] : []).includes(showcaseId);
}

function countShowcaseProducts(showcase: AdminShowcaseRecord, products: AdminProductRef[]) {
  const manualProductIds = stringList(showcase.manualProductIds);
  if (showcase.mode === "auto") {
    const categoryId = String(showcase.categoryId ?? "").trim();
    const limit = Number.isFinite(Number(showcase.limit)) ? Math.max(1, Math.round(Number(showcase.limit))) : 8;
    const matchedCount = products.filter((product) => !categoryId || productMatchesCategory(product, categoryId)).length;
    return Math.min(limit, matchedCount);
  }

  if (manualProductIds.length > 0) {
    const productIds = new Set(products.map((product) => String(product.id)));
    return Array.from(new Set(manualProductIds)).filter((id) => productIds.has(id)).length;
  }

  return products.filter((product) => productMatchesShowcase(product, showcase.id)).length;
}

function withCategoryCounts<T extends { id: string }>(categories: T[], products: AdminProductRef[]) {
  return categories.map((category) => ({
    ...category,
    productCount: products.filter((product) => productMatchesCategory(product, category.id)).length,
  }));
}

function withBrandCounts<T extends { id: string; title: string }>(brands: T[], products: AdminProductRef[]) {
  return brands.map((brand) => ({
    ...brand,
    productCount: products.filter((product) => {
      const productBrand = String(product.brand ?? "").trim();
      return productBrand === brand.id || productBrand === brand.title;
    }).length,
  }));
}

function withShowcaseCounts<T extends AdminShowcaseRecord>(
  showcases: T[],
  products: AdminProductRef[]
) {
  return showcases.map((showcase) => ({
    ...showcase,
    productCount: countShowcaseProducts(showcase, products),
  }));
}

async function readAdminStorefrontLayout() {
  const [
    banners,
    showcases,
    categoryGroups,
    brandGroups,
    firstCategory,
    firstBrand,
  ] = await Promise.all([
    prisma.banner.findMany({
      select: {
        id: true,
        title: true,
        showcaseId: true,
        active: true,
        sortOrder: true,
        images: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.showcase.findMany({
      select: {
        id: true,
        title: true,
        active: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.categoryGroup.findMany({
      select: {
        id: true,
        title: true,
        active: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.brandGroup.findMany({
      select: {
        id: true,
        title: true,
        active: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.category.findFirst({
      select: {
        pageSortOrder: true,
      },
      orderBy: [{ pageSortOrder: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.brand.findFirst({
      select: {
        homeSortOrder: true,
      },
      orderBy: [{ homeSortOrder: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const layoutCategoryGroups = categoryGroups.length > 0
    ? categoryGroups
    : firstCategory
      ? [{ id: "default-categories", title: DEFAULT_CATEGORY_GROUP_TITLE, active: true, sortOrder: firstCategory.pageSortOrder ?? 1 }]
      : [];
  const layoutBrandGroups = brandGroups.length > 0
    ? brandGroups
    : firstBrand
      ? [{ id: "default-brands", title: DEFAULT_BRAND_GROUP_TITLE, active: true, sortOrder: firstBrand.homeSortOrder ?? 1 }]
      : [];
  const layoutBanners = banners as BannerLayoutRecord[];
  const layoutBrandGroupRecords = layoutBrandGroups as LayoutGroupRecord[];
  const layoutCategoryGroupRecords = layoutCategoryGroups as LayoutGroupRecord[];
  const layoutShowcases = showcases as LayoutShowcaseRecord[];
  const homeGroups = layoutBrandGroupRecords
    .filter((group) => group.active !== false)
    .map((group) => toLayoutItem("brandGroup", group, Number(group.sortOrder ?? 1)));
  const categoryGroupItems = layoutCategoryGroupRecords
    .filter((group) => group.active !== false)
    .map((group) => toLayoutItem("categoryGroup", group, Number(group.sortOrder ?? 1)));
  const showcaseItems = layoutShowcases.map((showcase) =>
    toLayoutItem("showcase", showcase, Number(showcase.sortOrder ?? 1))
  );

  const layout: StorefrontLayout = {
    home: sortLayoutItems([...bannerLayoutItems(layoutBanners, "home"), ...homeGroups]),
    categories: sortLayoutItems([...bannerLayoutItems(layoutBanners, "categories"), ...categoryGroupItems]),
    products: sortLayoutItems([...bannerLayoutItems(layoutBanners, "products"), ...showcaseItems]),
  };

  return layout;
}

async function updateAdminStorefrontLayout(body: unknown) {
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const layoutSource = record.storefront ?? record.layout ?? record;
  const storefrontLayout = normalizeStorefrontLayoutInput(layoutSource);
  const hasLayoutItems = hasStorefrontLayoutItems(storefrontLayout);
  const layout = record.layout && typeof record.layout === "object"
    ? record.layout as Record<string, unknown>
    : record;
  const bannerPatches = hasLayoutItems
    ? buildBannerLayoutPatches(storefrontLayout)
    : Array.isArray(layout.banners) ? layout.banners as BannerLayoutPatch[] : [];
  const orderPatch = (items: unknown) => Array.isArray(items)
    ? items
        .map((item) => item && typeof item === "object" ? item as { id?: unknown; sortOrder?: unknown } : null)
        .filter((item): item is { id?: unknown; sortOrder?: unknown } => Boolean(item?.id) && optionalNumber(item?.sortOrder) !== undefined)
    : [];

  if (bannerPatches.length > 0) {
    const ids = bannerPatches.map((patch) => String(patch.id ?? "").trim()).filter(Boolean);
    const existingBanners: BannerLayoutRecord[] = ids.length > 0
      ? await prisma.banner.findMany({
          where: { id: { in: Array.from(new Set(ids)) } },
          select: {
            id: true,
            title: true,
            showcaseId: true,
            active: true,
            sortOrder: true,
            images: true,
          },
        })
      : [];
    const bannerById = new Map(existingBanners.map((banner) => [banner.id, banner]));

    for (const patch of bannerPatches) {
      const id = String(patch.id ?? "").trim();
      const current = bannerById.get(id);
      if (!current) continue;
      const currentLayout = getBannerLayout(current);
      const imagesMeta = mergeBannerImagesMeta(current.images, patch, currentLayout);
      const nextShowOnShowcase = optionalBoolean(patch.showOnShowcase) ?? currentLayout.showOnShowcase;
      const nextShowcaseId = patch.showcaseId !== undefined
        ? String(patch.showcaseId ?? "").trim()
        : currentLayout.showcaseId;
      const nextHomeSortOrder = optionalNumber(patch.homeSortOrder ?? patch.sortOrder) ?? currentLayout.homeSortOrder;

      await prisma.banner.update({
        where: { id },
        data: {
          images: imagesMeta as any,
          showcaseId: nextShowOnShowcase && nextShowcaseId ? nextShowcaseId : null,
          sortOrder: nextHomeSortOrder,
        },
      });
    }
  }

  const showcasePatches = hasLayoutItems ? layoutOrderPatches(storefrontLayout.products, "showcase") : orderPatch(layout.showcases);
  const categoryGroupPatches = hasLayoutItems ? layoutOrderPatches(storefrontLayout.categories, "categoryGroup") : orderPatch(layout.categoryGroups);
  const brandGroupPatches = hasLayoutItems ? layoutOrderPatches(storefrontLayout.home, "brandGroup") : orderPatch(layout.brandGroups);

  for (const item of showcasePatches) {
    await prisma.showcase.updateMany({
      where: { id: String(item.id) },
      data: { sortOrder: optionalNumber(item.sortOrder) },
    });
  }

  for (const item of categoryGroupPatches) {
    await prisma.categoryGroup.updateMany({
      where: { id: String(item.id) },
      data: { sortOrder: optionalNumber(item.sortOrder) },
    });
  }

  for (const item of brandGroupPatches) {
    await prisma.brandGroup.updateMany({
      where: { id: String(item.id) },
      data: { sortOrder: optionalNumber(item.sortOrder) },
    });
  }

  await invalidateCatalogCache("admin.storefront-layout");
}

async function readAdminCatalogSection(section: string) {
  const base = emptyAdminCatalog();

  if (section === "products") {
    return { ...base, products: await readAdminProducts() };
  }

  if (section === "banners") {
    const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return { ...base, banners };
  }

  if (section === "showcases") {
    const [showcases, products, productRefs] = await Promise.all([
      prisma.showcase.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      readAdminProducts(),
      readAdminProductRefs(),
    ]);
    return { ...base, showcases: withShowcaseCounts(showcases, productRefs), products };
  }

  if (section === "categories") {
    const [categories, categoryGroups, productRefs] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.categoryGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      readAdminProductRefs(),
    ]);
    return { ...base, categories: withCategoryCounts(categories, productRefs), categoryGroups };
  }

  if (section === "brands") {
    const [brands, brandGroups, productRefs] = await Promise.all([
      prisma.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.brandGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      readAdminProductRefs(),
    ]);
    return { ...base, brands: withBrandCounts(brands, productRefs), brandGroups };
  }

  if (section === "product-form" || section === "all") {
    const shouldIncludeProducts = section === "all";
    const [banners, showcases, categories, categoryGroups, brands, brandGroups, products, productRefs] = await Promise.all([
      section === "product-form" ? Promise.resolve([]) : prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.showcase.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.categoryGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.brandGroup.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      shouldIncludeProducts ? readAdminProducts() : Promise.resolve([]),
      readAdminProductRefs(),
    ]);

    return {
      ...base,
      banners,
      showcases: withShowcaseCounts(showcases, productRefs),
      categories: withCategoryCounts(categories, productRefs),
      categoryGroups,
      brands: withBrandCounts(brands, productRefs),
      brandGroups,
      products,
    };
  }

  return null;
}

export async function GET(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const path = (await context.params).path ?? [];

  try {
    if (path[0] === "catalog" && path[1] === "storefront") {
      return apiOk({ storefront: toStorefrontLayoutResponse(await readAdminStorefrontLayout()) });
    }

    if (path[0] === "catalog" && path[1]) {
      const catalog = await readAdminCatalogSection(path[1]);
      return catalog ? apiOk({ catalog }) : apiFail("مسیر پیدا نشد.", 404);
    }

    if (path[0] === "dashboard") {
      const [products, showcases, banners, users, carts, comments] = await Promise.all([
        prisma.product.count(),
        prisma.showcase.count(),
        prisma.banner.count(),
        prisma.user.count(),
        prisma.cart.count({ where: { status: "active" } }),
        prisma.comment.count(),
      ]);
      return apiOk({ dashboard: { products, showcases, banners, users, carts, comments } });
    }

    if (path[0] === "orders") {
      return apiOk({ orders: await readAdminOrders() });
    }

    if (path[0] === "banners") {
      if (path[1]) {
        const banner = await prisma.banner.findUnique({ where: { id: path[1] } });
        return banner ? apiOk({ banner }) : apiFail("موردی پیدا نشد.", 404);
      }
      const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      return apiOk({ banners });
    }

    if (path[0] === "showcases" && path.length === 1) {
      const showcases = await prisma.showcase.findMany({
        include: { products: true, banners: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return apiOk({ showcases });
    }

    if (path[0] === "showcases" && path[1] && path[2] !== "products") {
      const showcase = await prisma.showcase.findUnique({
        where: { id: path[1] },
        include: { products: true, banners: true },
      });
      return showcase ? apiOk({ showcase }) : apiFail("موردی پیدا نشد.", 404);
    }

    if (path[0] === "showcases" && path[1] && path[2] === "products") {
      const products = await prisma.product.findMany({
        where: { showcaseId: path[1] },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return apiOk({ products });
    }

    if (path[0] === "products") {
      if (path[1]) {
        const product = await prisma.product.findUnique({ where: { id: Number(path[1]) } });
        return product ? apiOk({ product }) : apiFail("موردی پیدا نشد.", 404);
      }
      const products = await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
      return apiOk({ products });
    }

    if (path[0] === "structure") return apiOk({ structure: await readStructure() });

    return apiFail("مسیر پیدا نشد.", 404);
  } catch (error) {
    console.error("Admin GET error:", error);
    return apiServerError();
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const path = (await context.params).path ?? [];

  try {
    if (path[0] === "banners") {
      const parsed = await parseJsonBody(request, bannerSchema);
      if (!parsed.ok) return parsed.response;
      const banner = await prisma.banner.create({
        data: {
          title: parsed.data.title ?? null,
          showcaseId: parsed.data.showcaseId ?? null,
          images: images(parsed.data),
          active: parsed.data.active ?? true,
          sortOrder: parsed.data.sortOrder ?? 0,
          intervalSeconds: parsed.data.intervalSeconds ?? 5,
          heightPercent: parsed.data.heightPercent ?? 28,
        },
      });
      return apiOk({ banner }, { status: 201 });
    }

    if (path[0] === "showcases" && path[1] && path[2] === "products") {
      const body = await request.json().catch(() => null);
      const productId = Number(body?.productId);
      if (!Number.isInteger(productId)) return apiFail("شناسه محصول الزامی است.", 422);
      const product = await prisma.product.update({ where: { id: productId }, data: { showcaseId: path[1] } });
      return apiOk({ product }, { status: 201 });
    }

    if (path[0] === "showcases") {
      const parsed = await parseJsonBody(request, showcaseSchema);
      if (!parsed.ok) return parsed.response;
      const showcase = await prisma.showcase.create({
        data: {
          title: parsed.data.title ?? null,
          description: parsed.data.description ?? null,
          imageUrl: parsed.data.imageUrl ?? null,
          active: parsed.data.active ?? true,
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      });
      return apiOk({ showcase }, { status: 201 });
    }

    if (path[0] === "products") {
      const parsed = await parseJsonBody(request, productSchema);
      if (!parsed.ok) return parsed.response;
      const product = await prisma.product.create({ data: normalizeProductData(parsed.data) });
      return apiOk({ product }, { status: 201 });
    }

    return apiFail("مسیر پیدا نشد.", 404);
  } catch (error) {
    console.error("Admin POST error:", error);
    return apiServerError();
  }
}

export async function PUT(request: Request, context: Context) {
  return updateEntity(request, context, false);
}

export async function PATCH(request: Request, context: Context) {
  return updateEntity(request, context, true);
}

async function updateEntity(request: Request, context: Context, partial: boolean) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const path = (await context.params).path ?? [];

  try {
    if (path[0] === "catalog" && path[1] === "storefront") {
      const body = await request.json().catch(() => null);
      await updateAdminStorefrontLayout(body);
      return apiOk({ storefront: toStorefrontLayoutResponse(await readAdminStorefrontLayout()) });
    }

    if (path[0] === "structure") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") return apiFail("اطلاعات ارسالی معتبر نیست.", 422);
      return apiOk({ structure: body });
    }

    if (path[0] === "orders" && path[1]) {
      const body = await request.json().catch(() => null);
      const trackingCode = String(body?.trackingCode ?? "").trim();
      const requestedStatus = String(body?.fulfillmentStatus ?? "").trim();
      if (!ORDER_STATUSES.includes(requestedStatus as (typeof ORDER_STATUSES)[number])) {
        return apiFail("وضعیت سفارش معتبر نیست.", 422);
      }

      const existingOrder = await prisma.order.findUnique({
        where: { id: path[1] },
        select: { fulfillmentStatus: true, trackingCode: true, shippedAt: true },
      });
      if (!existingOrder) return apiFail("سفارش پیدا نشد.", 404);

      const currentStatus = normalizeOrderStatus(existingOrder.fulfillmentStatus);
      const fulfillmentStatus = normalizeOrderStatus(requestedStatus);
      const allowedNextStatus = nextOrderStatus(currentStatus);
      if (fulfillmentStatus !== currentStatus && fulfillmentStatus !== allowedNextStatus) {
        return apiFail("وضعیت سفارش باید مرحله‌به‌مرحله تغییر کند.", 422);
      }
      if (fulfillmentStatus === "shipped" && !trackingCode) {
        return apiFail("برای ثبت وضعیت ارسال‌شده، کد پیگیری الزامی است.", 422);
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const statusChanged = fulfillmentStatus !== currentStatus;
        await tx.order.update({
          where: { id: path[1] },
          data: {
            fulfillmentStatus,
            trackingCode: trackingCode || existingOrder.trackingCode,
            shippedAt: fulfillmentStatus === "shipped"
              ? existingOrder.shippedAt ?? new Date()
              : existingOrder.shippedAt,
          },
        });
        if (statusChanged) {
          await tx.orderStatusEvent.create({
            data: { orderId: path[1], status: fulfillmentStatus },
          });
        }
      });

      const orders = await readAdminOrders();
      const order = orders.find((item: { id: string }) => item.id === path[1]) ?? null;
      return apiOk({ order });
    }

    if (!path[1]) return apiFail("موردی پیدا نشد.", 404);

    if (path[0] === "banners") {
      const body = await request.json().catch(() => null);
      const parsed = (partial ? bannerSchema.partial() : bannerSchema).safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      const banner = await prisma.banner.update({
        where: { id: path[1] },
        data: {
          ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
          ...(parsed.data.showcaseId !== undefined ? { showcaseId: parsed.data.showcaseId } : {}),
          ...(parsed.data.images !== undefined || parsed.data.imageUrls !== undefined ? { images: images(parsed.data) } : {}),
          ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
          ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
          ...(parsed.data.intervalSeconds !== undefined ? { intervalSeconds: parsed.data.intervalSeconds } : {}),
          ...(parsed.data.heightPercent !== undefined ? { heightPercent: parsed.data.heightPercent } : {}),
        },
      });
      return apiOk({ banner });
    }

    if (path[0] === "showcases") {
      const body = await request.json().catch(() => null);
      const parsed = (partial ? showcaseSchema.partial() : showcaseSchema).safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      const showcase = await prisma.showcase.update({ where: { id: path[1] }, data: parsed.data });
      return apiOk({ showcase });
    }

    if (path[0] === "products") {
      const body = await request.json().catch(() => null);
      const parsed = (partial ? productSchema.partial() : productSchema).safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      const product = await prisma.product.update({
        where: { id: Number(path[1]) },
        data: partial ? normalizeProductPatchData(parsed.data) : normalizeProductData(parsed.data),
      });
      return apiOk({ product });
    }

    return apiFail("مسیر پیدا نشد.", 404);
  } catch (error: any) {
    if (error?.code === "P2025") return apiFail("موردی پیدا نشد.", 404);
    console.error("Admin update error:", error);
    return apiServerError();
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const path = (await context.params).path ?? [];

  try {
    if (path[0] === "showcases" && path[1] && path[2] === "products" && path[3]) {
      const product = await prisma.product.update({ where: { id: Number(path[3]) }, data: { showcaseId: null } });
      return apiOk({ product });
    }
    if (!path[1]) return apiFail("موردی پیدا نشد.", 404);
    if (path[0] === "banners") await prisma.banner.delete({ where: { id: path[1] } });
    else if (path[0] === "showcases") await prisma.showcase.delete({ where: { id: path[1] } });
    else if (path[0] === "products") await prisma.product.delete({ where: { id: Number(path[1]) } });
    else return apiFail("مسیر پیدا نشد.", 404);
    return apiOk({ deleted: true });
  } catch (error: any) {
    if (error?.code === "P2025") return apiFail("موردی پیدا نشد.", 404);
    console.error("Admin DELETE error:", error);
    return apiServerError();
  }
}
