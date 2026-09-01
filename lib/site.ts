import { env } from "@/lib/env";

export const SITE_NAME = "فروشگاه وال";
export const SITE_SHORT_NAME = "وال";
export const SITE_LOCALE = "fa-IR";

export function siteUrl() {
  const raw = env.NEXT_PUBLIC_SITE_URL || env.SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function sitePath(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

export const DEFAULT_KEYWORDS = [
  "فروشگاه وال",
  "خرید آنلاین",
  "محصولات",
  "ویترین",
  "دسته‌بندی",
  "برند",
  "سفارش",
  "ارسال",
  "تخفیف",
  "ایران",
];
