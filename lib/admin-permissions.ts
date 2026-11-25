import { SUPERADMIN_PHONE } from "@/lib/auth-constants";

export const ADMIN_SECTIONS = {
  theme: "ظاهر", products: "محصولات", orders: "سفارش‌ها", users: "کاربران",
  notifications: "اعلان‌ها", discounts: "تخفیف‌ها", banners: "بنرها",
  showcases: "ویترین‌ها", categories: "دسته‌بندی‌ها", brands: "برندها", storefront: "چیدمان",
} as const;
export type AdminSection = keyof typeof ADMIN_SECTIONS;
export type AdminPermissions = Partial<Record<AdminSection, boolean>>;
type PermissionUser = { role?: string | null; username?: string | null; adminPermissions?: unknown };
export function isSuperadmin(user: PermissionUser | null | undefined) {
  return user?.role === "superadmin" && user.username === SUPERADMIN_PHONE;
}
export function normalizeAdminPermissions(value: unknown): AdminPermissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.keys(ADMIN_SECTIONS).filter(key =>
    Object.hasOwn(value, key) && (value as Record<string, unknown>)[key] === true
  ).map(key => [key, true]));
}
export function hasAdminPermission(user: PermissionUser | null | undefined, section: string) {
  if (!Object.hasOwn(ADMIN_SECTIONS, section)) return false;
  return isSuperadmin(user) || (user?.role === "admin" && normalizeAdminPermissions(user.adminPermissions)[section as AdminSection] === true);
}

// Unknown routes deny by default. The structure endpoint filters its response separately.
export function canAccessAdminApi(user: PermissionUser, url: URL, method: string) {
  if (isSuperadmin(user)) return true;
  if (user.role !== "admin") return false;
  const path = url.pathname.replace(/\/$/, "");
  if (path === "/api/admin/catalog/structure") return method === "GET";
  if (["/api/theme", "/api/theme/admin", "/api/admin/theme"].includes(path)) return hasAdminPermission(user, "theme");
  if (/^\/api\/products\/[^/]+$/.test(path)) return hasAdminPermission(user, "products");
  if (method === "GET" && url.searchParams.get("picker") === "1" && (path === "/api/admin/users" || (path === "/api/admin/collections/structure" && url.searchParams.get("collection") === "users"))) return ["users", "discounts", "notifications"].some(key => hasAdminPermission(user, key));
  if (path === "/api/admin/collections/structure") return hasAdminPermission(user, url.searchParams.get("collection") ?? "");
  if (/^\/api\/admin\/users\/[^/]+\/discount$/.test(path)) return hasAdminPermission(user, "discounts");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "admin") return false;
  if (path === "/api/admin/catalog/all") return method === "GET" && ["products", "banners", "categories", "brands", "showcases"].some(key => hasAdminPermission(user, key));
  if (path === "/api/admin/catalog/product-form") return hasAdminPermission(user, "products");
  const section = parts[2] === "catalog" ? parts[3] : parts[2];
  if (section === "commerce") return hasAdminPermission(user, "orders");
  return hasAdminPermission(user, section);
}
