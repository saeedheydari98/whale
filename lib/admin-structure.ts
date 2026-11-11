import { fetchJsonDeduped } from "@/lib/fetch-json";

export const ADMIN_STRUCTURE_URL = "/api/admin/catalog/structure";

export type AdminCountItem = {
  id: string;
  count: number;
};

export type AdminStorefrontStructure = {
  home: number;
  categories: number;
  products: number;
};

export type AdminPanelStructure = {
  products: number;
  orders: number;
  inPersonOrders: number;
  users: number;
  banners: number;
  showcases: AdminCountItem[];
  categoryGroups: AdminCountItem[];
  brandGroups: AdminCountItem[];
  storefront: AdminStorefrontStructure;
  discountRules: number;
  accessRequests: { pending: number; approved: number; archived: number };
};

function asCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

function asCountItem(value: unknown): AdminCountItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    count: asCount(record.count ?? record.itemCount ?? record.productCount),
  };
}

function asCountItems(value: unknown) {
  return Array.isArray(value)
    ? value.map(asCountItem).filter((item): item is AdminCountItem => Boolean(item))
    : [];
}

function asStorefrontStructure(value: unknown): AdminStorefrontStructure {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    home: asCount(record.home),
    categories: asCount(record.categories),
    products: asCount(record.products ?? record.showcases),
  };
}

export function normalizeAdminPanelStructure(value: unknown): AdminPanelStructure | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record.counts && typeof record.counts === "object" && !Array.isArray(record.counts)
    ? record.counts as Record<string, unknown>
    : record;

  return {
    products: asCount(nested.products),
    orders: asCount(nested.orders),
    inPersonOrders: asCount(nested.inPersonOrders),
    users: asCount(nested.users),
    banners: asCount(nested.banners),
    showcases: asCountItems(record.showcases),
    categoryGroups: asCountItems(record.categoryGroups),
    brandGroups: asCountItems(record.brandGroups),
    storefront: asStorefrontStructure(record.storefront ?? nested.storefront),
    discountRules: asCount(nested.discountRules),
    accessRequests: {
      pending: asCount((record.accessRequests as Record<string, unknown> | undefined)?.pending),
      approved: asCount((record.accessRequests as Record<string, unknown> | undefined)?.approved),
      archived: asCount((record.accessRequests as Record<string, unknown> | undefined)?.archived),
    },
  };
}

export async function getAdminPanelStructure(options?: { force?: boolean }) {
  const json = await fetchJsonDeduped<{
    ok?: boolean;
    data?: { structure?: unknown };
    showMessage?: string;
  }>(ADMIN_STRUCTURE_URL, { force: options?.force });

  if (json?.ok === false) throw new Error(json.showMessage || "دریافت ساختار پنل ممکن نشد.");
  const structure = normalizeAdminPanelStructure(json?.data?.structure);
  if (!structure) throw new Error("پاسخ ساختار پنل مدیریت معتبر نیست.");
  return structure;
}
