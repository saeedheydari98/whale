import type { AdminCatalogSection, StorefrontLayoutTab } from "./types";

export const MIN_LOADING_MS = 350;

export const STOCK_OPTIONS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100,
];

export const PRODUCT_COLOR_OPTIONS = [
  "black",
  "white",
  "gray",
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
];

export const SHOWCASE_SORT_OPTIONS = [
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "bestseller", label: "پرفروش‌ترین" },
  { value: "mostDiscounted", label: "بیشترین تخفیف" },
];

export const SECTION_TITLES: Record<AdminCatalogSection, string> = {
  products: "محصولات",
  banners: "بنرها",
  showcases: "ویترین‌ها",
  categories: "دسته‌بندی‌ها",
  brands: "برندها",
  storefront: "مدیریت چیدمان فروشگاه",
};

export const SECTION_COUNT_LABELS: Record<AdminCatalogSection, string> = {
  products: "محصول",
  banners: "بنر",
  showcases: "ویترین",
  categories: "دسته‌بندی",
  brands: "برند",
  storefront: "بخش",
};

export const STOREFRONT_TABS: Array<{ id: StorefrontLayoutTab; label: string }> = [
  { id: "home", label: "خانه" },
  { id: "categories", label: "دسته بندی" },
  { id: "products", label: "ویترین" },
];
