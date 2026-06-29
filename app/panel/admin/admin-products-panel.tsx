"use client";

import { useEffect, useMemo, useState } from "react";
import { IoAdd, IoCloudUploadOutline, IoCreateOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../../design-system/components/ui/button";
import { CustomInput } from "../../design-system/components/ui/input";
import { CustomModal } from "../../design-system/components/ui/modal";
import { RequiredLabel } from "../../design-system/components/ui/required-label";
import { CustomSelect } from "../../design-system/components/ui/select";
import { CustomSwitch } from "../../design-system/components/ui/switch";
import { getStockColorValue } from "../../design-system/components/ui/color-stock-dots";
import CategoryOption from "../../design-system/components/ui/category-option";
import { FloatButton } from "@/app/design-system/components/ui/float-button";
import { clearProductsCache, getProducts } from "@/lib/products-client";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import { AdminBannerList } from "./products-panel/admin-banner-list";
import { AdminShowcaseList } from "./products-panel/admin-showcase-list";
import type { BannerForm, CategoryForm, ProductForm, ShowcaseForm } from "./products-panel/types";

export type AdminCatalogSection = "products" | "banners" | "showcases" | "categories" | "storefront";
type ProductRelationMode = "category" | "showcase";

// No default showcase id

const createShowcase = (): ShowcaseForm => ({
  id: `showcase-${Date.now()}`,
  title: "",
  active: true,
  mode: "manual",
  autoSort: "newest",
  limit: 8,
  categoryId: "",
  manualProductIds: [],
  sortOrder: 1,
});

const createCategory = (): CategoryForm => ({
  id: `category-${Date.now()}`,
  title: "",
  slug: "",
  imageUrl: "",
  active: true,
  sortOrder: 1,
});

const createBanner = (): BannerForm => ({
  id: `banner-${Date.now()}`,
  title: "",
  showcaseId: "",
  imageUrls: [],
  active: true,
  showOnHome: true,
  showOnShowcase: false,
  intervalSeconds: 5,
  heightPercent: 28,
  homeSortOrder: 1,
  showcaseSortOrder: 1,
  sortOrder: 1,
});

const createProduct = (): ProductForm => ({
  id: `local-${Date.now()}`,
  showcaseId: "",
  showcaseIds: [],
  title: "",
  description: "",
  slug: "",
  price: "",
  originalPrice: "",
  discountPrice: "",
  discountPercent: "",
  imageUrl: "",
  images: [],
  videoUrl: "",
  badge: "",
  ctaLabel: "مشاهده محصول",
  ctaHref: "#",
  active: true,
  isActive: true,
  isFeatured: false,
  isAvailable: true,
  stockQuantity: 0,
  stockStatus: "in_stock",
  minOrder: 1,
  maxOrder: 0,
  weight: "",
  length: "",
  width: "",
  height: "",
  salesCount: 0,
  views: 0,
  wishlistCount: 0,
  ratingAverage: "",
  ratingCount: 0,
  discountStartAt: "",
  discountEndAt: "",
  categoryId: "general",
  categoryIds: ["general"],
  manufactureYear: "",
  brand: "",
  vendor: "",
  sku: "",
  barcode: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  placement: "",
  publishedAt: "",
  deletedAt: "",
  colorStock: {},
  sortOrder: 1,
});

const MIN_LOADING_MS = 350;

function waitForMinimumLoading(startedAt: number) {
  const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
  return remaining > 0
    ? new Promise((resolve) => window.setTimeout(resolve, remaining))
    : Promise.resolve();
}

const STOCK_OPTIONS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100,
];

const PRODUCT_COLOR_OPTIONS = [
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

const SHOWCASE_SORT_OPTIONS = [
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "bestseller", label: "پرفروش‌ترین" },
  { value: "mostDiscounted", label: "بیشترین تخفیف" },
];

type InventoryControlsProps = {
  product: ProductForm;
  onChange: (patch: Partial<ProductForm>) => void;
};

function InventoryControls({ product, onChange }: InventoryControlsProps) {
  const colorStock = normalizeColorStock(product.colorStock);
  const [selectedColor, setSelectedColor] = useState(PRODUCT_COLOR_OPTIONS[0]);
  const totalStock = Math.max(0, Math.round(Number(product.stockQuantity ?? 0)));
  const assignedStock = PRODUCT_COLOR_OPTIONS.reduce((sum, color) => sum + Number(colorStock[color] ?? 0), 0);
  const stockMatchesTotal = assignedStock === totalStock;
  const selectedCount = Number(colorStock[selectedColor] ?? 0);

  const updateColorStock = (color: string, count: number) => {
    const normalizedCount = Math.max(0, Math.round(Number(count)));
    onChange({
      colorStock: {
        ...colorStock,
        [color]: normalizedCount,
      },
    });
  };

  return (
    <div
      data-invalid={!stockMatchesTotal ? "true" : undefined}
      className={`flex flex-col gap-3 rounded-lg border bg-primary-card p-3 ${
        stockMatchesTotal ? "border-primary-border" : "border-danger-border-nomode"
      }`}
    >
      <div className="flex flex-col gap-1">
        <div className="text-sm font-bold text-primary-text">موجودی</div>
        <span className="text-xs text-secondary-text">
          ابتدا موجودی کل را تعیین کنید، سپس همان مقدار را بین رنگ‌ها تقسیم کنید.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold text-secondary-text">موجودی کل</div>
        <CustomSelect
          value={String(product.stockQuantity)}
          aria-label="موجودی کل"
          onChange={(event) => onChange({ stockQuantity: Number(event.target.value) })}
        >
          {STOCK_OPTIONS.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </CustomSelect>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold text-secondary-text">موجودی رنگ‌ها</div>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_COLOR_OPTIONS.map((color) => {
            const count = Number(colorStock[color] ?? 0);
            const selected = color === selectedColor;
            return (
              <button
                key={color}
                type="button"
                aria-label={`${color} stock`}
                onClick={() => setSelectedColor(color)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums transition hover:scale-105 ${
                  selected ? "border-primary text-primary-text ring-2 ring-primary-border" : "border-primary-border text-primary-text"
                }`}
                style={{ backgroundColor: getStockColorValue(color) }}
              >
                <span className="rounded-full bg-primary-base/85 px-1 leading-4">{count > 10 ? "+10" : count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-bg p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-primary-text">{selectedColor}</span>
          <span className={`text-xs font-semibold ${stockMatchesTotal ? "text-secondary-text" : "text-danger-text-nomode"}`}>
            {assignedStock}/{totalStock}
          </span>
        </div>
        <CustomSelect
          value={String(selectedCount)}
          aria-label={`${selectedColor} stock quantity`}
          onChange={(event) => updateColorStock(selectedColor, Number(event.target.value))}
        >
          {STOCK_OPTIONS.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </CustomSelect>
        {!stockMatchesTotal ? (
          <span className="text-xs font-semibold text-danger-text-nomode">
            مجموع موجودی رنگ‌ها باید قبل از ذخیره با موجودی کل برابر باشد.
          </span>
        ) : null}
      </div>
    </div>
  );
}

type ProductAdvancedFieldsProps = {
  product: ProductForm;
  categories: CategoryForm[];
  onChange: (patch: Partial<ProductForm>) => void;
  hasRequiredError: (key: string) => boolean;
  categoryErrorKey: string;
};

function imageListToText(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean).join(", ") : "";
}

function textToImageList(value: string) {
  return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function ProductAdvancedFields({ product, categories, onChange, hasRequiredError, categoryErrorKey }: ProductAdvancedFieldsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
      <div className="text-sm font-bold text-primary-text">جزئیات محصول</div>
      <RequiredLabel required className="text-primary-text">دسته‌بندی</RequiredLabel>
      <div
        data-invalid={hasRequiredError(categoryErrorKey) && !product.categoryId.trim() ? "true" : undefined}
        className={`flex flex-wrap gap-3 rounded-md border p-2 ${
          hasRequiredError(categoryErrorKey) && !product.categoryId.trim()
            ? "border-danger-border-nomode"
            : "border-primary-border"
        }`}
      >
        {categories.map((category) => (
          <CategoryOption
            key={category.id}
            label={category.title}
            imageUrl={category.imageUrl}
            selected={product.categoryId === category.id}
            size="sm"
            onClick={() => onChange({ categoryId: category.id, categoryIds: [category.id] })}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <CustomInput value={product.slug} placeholder="Slug" onChange={(event) => onChange({ slug: event.target.value })} />
        <CustomInput value={product.manufactureYear} placeholder="Manufacture year" onChange={(event) => onChange({ manufactureYear: event.target.value })} />
      </div>
      <CustomInput value={imageListToText(product.images)} placeholder="Gallery image URLs" onChange={(event) => onChange({ images: textToImageList(event.target.value) })} />
      <CustomInput value={product.videoUrl} placeholder="Video URL" onChange={(event) => onChange({ videoUrl: event.target.value })} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <CustomInput value={product.brand} placeholder="Brand" onChange={(event) => onChange({ brand: event.target.value })} />
        <CustomInput value={product.sku} placeholder="SKU" onChange={(event) => onChange({ sku: event.target.value })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <CustomSwitch checked={product.isActive} onChange={(isActive) => onChange({ isActive, active: isActive })} label={product.isActive ? "فعال" : "مخفی"} size="sm" />
        <CustomSwitch checked={product.isFeatured} onChange={(isFeatured) => onChange({ isFeatured })} label={product.isFeatured ? "ویژه" : "عادی"} size="sm" />
        <CustomSwitch checked={product.isAvailable} onChange={(isAvailable) => onChange({ isAvailable })} label={product.isAvailable ? "موجود" : "ناموجود"} size="sm" />
      </div>
    </div>
  );
}

function toggleProductId(list: Array<number | string>, productId: number | string) {
  const id = String(productId);
  const ids = list.map((item) => String(item));
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}


function getProductKey(product: Partial<ProductForm>) {
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

function dedupeProducts(products: ProductForm[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = getProductKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeProduct(item: Partial<ProductForm>, index: number): ProductForm {
  const finalPrice = String(item.discountPrice ?? item.price ?? "");
  const stockQuantity = Number.isFinite(Number(item.stockQuantity)) ? Math.max(0, Math.round(Number(item.stockQuantity))) : 0;
  const categoryIds = normalizeStringList(item.categoryIds, [String(item.categoryId ?? "general").trim() || "general"]);
  const showcaseIds = normalizeStringList(item.showcaseIds, item.showcaseId ? [String(item.showcaseId)] : []);

  return {
    id: item.id ?? `local-${Date.now()}-${index}`,
    showcaseId: showcaseIds[0] ?? "",
    showcaseIds,
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    slug: String(item.slug ?? ""),
    price: finalPrice,
    originalPrice: String(item.originalPrice ?? ""),
    discountPrice: finalPrice,
    discountPercent: String(item.discountPercent ?? ""),
    imageUrl: String(item.imageUrl ?? ""),
    images: Array.isArray(item.images) ? item.images.map((value) => String(value)).filter(Boolean) : [],
    videoUrl: String(item.videoUrl ?? ""),
    badge: String(item.badge ?? ""),
    ctaLabel: String(item.ctaLabel ?? "مشاهده محصول"),
    ctaHref: String(item.ctaHref ?? "#"),
    active: item.active !== false && item.isActive !== false,
    isActive: item.isActive !== false && item.active !== false,
    isFeatured: item.isFeatured === true,
    isAvailable: item.isAvailable !== false,
    stockQuantity,
    stockStatus: String(item.stockStatus ?? (stockQuantity > 0 ? "in_stock" : "out_of_stock")),
    minOrder: Number.isFinite(Number(item.minOrder)) ? Math.max(1, Math.round(Number(item.minOrder))) : 1,
    maxOrder: Number.isFinite(Number(item.maxOrder)) ? Math.max(0, Math.round(Number(item.maxOrder))) : 0,
    weight: String(item.weight ?? ""),
    length: String(item.length ?? ""),
    width: String(item.width ?? ""),
    height: String(item.height ?? ""),
    salesCount: Number.isFinite(Number(item.salesCount)) ? Math.max(0, Math.round(Number(item.salesCount))) : 0,
    views: Number.isFinite(Number(item.views)) ? Math.max(0, Math.round(Number(item.views))) : 0,
    wishlistCount: Number.isFinite(Number(item.wishlistCount)) ? Math.max(0, Math.round(Number(item.wishlistCount))) : 0,
    ratingAverage: String(item.ratingAverage ?? ""),
    ratingCount: Number.isFinite(Number(item.ratingCount)) ? Math.max(0, Math.round(Number(item.ratingCount))) : 0,
    discountStartAt: String(item.discountStartAt ?? ""),
    discountEndAt: String(item.discountEndAt ?? ""),
    categoryId: categoryIds[0] || "general",
    categoryIds,
    manufactureYear: String(item.manufactureYear ?? ""),
    brand: String(item.brand ?? ""),
    vendor: String(item.vendor ?? ""),
    sku: String(item.sku ?? ""),
    barcode: String(item.barcode ?? ""),
    metaTitle: String(item.metaTitle ?? ""),
    metaDescription: String(item.metaDescription ?? ""),
    metaKeywords: String(item.metaKeywords ?? ""),
    placement: String(item.placement ?? ""),
    publishedAt: String(item.publishedAt ?? ""),
    deletedAt: String(item.deletedAt ?? ""),
    colorStock: normalizeColorStock(item.colorStock),
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function normalizeColorStock(value: unknown) {
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

function getAssignedColorStock(value: unknown) {
  return Object.values(normalizeColorStock(value)).reduce((sum, count) => sum + Number(count), 0);
}

function hasMatchingColorStock(product: Pick<ProductForm, "stockQuantity" | "colorStock">) {
  return getAssignedColorStock(product.colorStock) === Math.max(0, Math.round(Number(product.stockQuantity ?? 0)));
}

function normalizeStringList(value: unknown, fallback: string[] = []) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;
}

function colorStockToText(value: unknown) {
  return Object.entries(normalizeColorStock(value))
    .map(([color, count]) => `${color}:${count}`)
    .join(", ");
}

function parseColorStockText(value: string) {
  return Object.fromEntries(
    value
      .split(/[\n,]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [color, count] = part.split(":");
        return [String(color ?? "").trim(), Math.max(0, Math.round(Number(count ?? 0)))] as const;
      })
      .filter(([color, count]) => color && Number.isFinite(count))
  );
}

function normalizeShowcase(item: Partial<ShowcaseForm>, index: number): ShowcaseForm {
  return {
    id: String(item.id ?? `showcase-${Date.now()}-${index}`),
    title: String(item.title ?? `ویترین ${index + 1}`),
    active: item.active !== false,
    mode: item.mode === "auto" ? "auto" : "manual",
    autoSort: String(item.autoSort ?? "newest"),
    limit: Number.isFinite(Number(item.limit)) ? Math.max(1, Math.round(Number(item.limit))) : 8,
    categoryId: String(item.categoryId ?? ""),
    manualProductIds: Array.isArray(item.manualProductIds) ? item.manualProductIds.map((value) => String(value)) : [],
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function slugifyValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeCategory(item: Partial<CategoryForm>, index: number): CategoryForm {
  const title = String(item.title ?? `دسته‌بندی ${index + 1}`).trim();
  const slug = String(item.slug ?? slugifyValue(title)).trim() || slugifyValue(title);

  return {
    id: String(item.id ?? (slug || `category-${Date.now()}-${index}`)),
    title,
    slug,
    imageUrl: String(item.imageUrl ?? "").trim(),
    active: item.active !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function normalizeBanner(item: Partial<BannerForm> & { bannerUrl?: string; images?: unknown }, index: number): BannerForm {
  const legacyImage = typeof item.bannerUrl === "string" && item.bannerUrl ? [item.bannerUrl] : [];
  const imageMeta = item.images && typeof item.images === "object" && !Array.isArray(item.images)
    ? item.images as Partial<BannerForm> & { urls?: unknown; imageUrls?: unknown }
    : {};
  const objectImages = Array.isArray(imageMeta.urls)
    ? imageMeta.urls.map((value) => String(value)).filter(Boolean)
    : Array.isArray(imageMeta.imageUrls)
      ? imageMeta.imageUrls.map((value) => String(value)).filter(Boolean)
      : [];
  const dbImages = Array.isArray(item.images) ? item.images.map((value) => String(value)).filter(Boolean) : objectImages;
  const imageUrls = Array.isArray(item.imageUrls)
    ? item.imageUrls.map((value) => String(value)).filter(Boolean)
    : dbImages.length > 0
      ? dbImages
      : legacyImage;
  const showcaseId = String(item.showcaseId ?? imageMeta.showcaseId ?? "").trim();
  const hasExplicitTargets = typeof item.showOnHome === "boolean"
    || typeof item.showOnShowcase === "boolean"
    || typeof imageMeta.showOnHome === "boolean"
    || typeof imageMeta.showOnShowcase === "boolean";
  const showOnHome = hasExplicitTargets ? (item.showOnHome ?? imageMeta.showOnHome) !== false : !showcaseId;
  const showOnShowcase = hasExplicitTargets ? (item.showOnShowcase ?? imageMeta.showOnShowcase) === true : Boolean(showcaseId);
  const homeSortOrder = Number.isFinite(Number(item.homeSortOrder ?? imageMeta.homeSortOrder))
    ? Number(item.homeSortOrder ?? imageMeta.homeSortOrder)
    : Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1;
  const showcaseSortOrder = Number.isFinite(Number(item.showcaseSortOrder ?? imageMeta.showcaseSortOrder))
    ? Number(item.showcaseSortOrder ?? imageMeta.showcaseSortOrder)
    : Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1;

  return {
    id: String(item.id ?? `banner-${Date.now()}-${index}`),
    title: String(item.title ?? `Banner ${index + 1}`),
    showcaseId,
    imageUrls,
    active: item.active !== false,
    showOnHome,
    showOnShowcase,
    intervalSeconds: Number.isFinite(Number(item.intervalSeconds)) ? Math.max(1, Math.round(Number(item.intervalSeconds))) : 5,
    heightPercent: Number.isFinite(Number(item.heightPercent)) ? Math.max(10, Math.min(100, Math.round(Number(item.heightPercent)))) : 28,
    homeSortOrder,
    showcaseSortOrder,
    sortOrder: homeSortOrder,
  };
}

function ensureShowcases(products: ProductForm[], savedShowcases: ShowcaseForm[]) {
  const normalized = savedShowcases.map(normalizeShowcase);
  const byId = new Map(normalized.map((showcase) => [showcase.id, showcase]));

  for (const product of products) {
    const showcaseId = product.showcaseId ?? "";
    if (!showcaseId) continue;
    if (!byId.has(showcaseId)) {
      byId.set(showcaseId, {
        id: showcaseId,
        title: "ویترین بدون عنوان",
        active: true,
        mode: "manual",
        autoSort: "newest",
        limit: 8,
        categoryId: "",
        manualProductIds: [],
        sortOrder: byId.size + 1,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function readPriceNumber(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function calculateDiscountPercent(originalPrice: string, discountPrice: string) {
  const original = readPriceNumber(originalPrice);
  const discounted = readPriceNumber(discountPrice);

  if (original <= 0 || discounted <= 0 || discounted >= original) {
    return "";
  }

  return String(Math.round(((original - discounted) / original) * 100));
}

function formatPrice(value?: string) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || !normalized) {
    return value || "";
  }

  return `$${parsed.toLocaleString("en-US")}`;
}

function getShowcaseProductsForAdmin(products: ProductForm[], showcase: ShowcaseForm) {
  const activeProducts = products.filter((product) => product.isActive !== false);

  if (showcase.mode === "auto") {
    const filtered = activeProducts.filter((product) => !showcase.categoryId || product.categoryId === showcase.categoryId);
    return sortAdminShowcaseProducts(filtered, showcase.autoSort).slice(0, Math.max(1, showcase.limit));
  }

  const manualIds = showcase.manualProductIds.map((item) => String(item));
  if (manualIds.length > 0) {
    return manualIds
      .map((id) => activeProducts.find((product) => String(product.id) === id))
      .filter(Boolean) as ProductForm[];
  }

  return activeProducts.filter((product) => {
    const showcaseIds = product.showcaseIds.length > 0 ? product.showcaseIds : product.showcaseId ? [product.showcaseId] : [];
    return showcaseIds.includes(showcase.id);
  });
}

function sortAdminShowcaseProducts(products: ProductForm[], sort: string) {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "cheapest":
        return readPriceNumber(a.discountPrice || a.price) - readPriceNumber(b.discountPrice || b.price);
      case "expensive":
        return readPriceNumber(b.discountPrice || b.price) - readPriceNumber(a.discountPrice || a.price);
      case "oldest":
        return Number(a.id) - Number(b.id);
      case "bestseller":
        return b.salesCount - a.salesCount;
      case "mostDiscounted":
        return Number(b.discountPercent || 0) - Number(a.discountPercent || 0);
      case "newest":
      default:
        return Number(b.id) - Number(a.id);
    }
  });
}

function clampWholeNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeBannerTiming(banner: BannerForm): BannerForm {
  const homeSortOrder = clampWholeNumber(banner.homeSortOrder || banner.sortOrder, 1, 999, 1);
  const showcaseSortOrder = clampWholeNumber(banner.showcaseSortOrder || banner.sortOrder, 1, 999, 1);
  return {
    ...banner,
    showOnShowcase: banner.showOnShowcase && Boolean(banner.showcaseId),
    homeSortOrder,
    showcaseSortOrder,
    sortOrder: homeSortOrder,
    intervalSeconds: clampWholeNumber(banner.intervalSeconds, 1, 60, 5),
    heightPercent: clampWholeNumber(banner.heightPercent, 10, 100, 28),
  };
}

type AdminProductsPanelProps = {
  section?: AdminCatalogSection;
};

export function AdminProductsPanel({ section = "storefront" }: AdminProductsPanelProps) {
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseForm[]>([]);
  const [categories, setCategories] = useState<CategoryForm[]>([
    normalizeCategory({ id: "general", title: "عمومی", slug: "general", imageUrl: "", active: true, sortOrder: 1 }, 0),
  ]);
  const [banners, setBanners] = useState<BannerForm[]>([]);
  const [draftProduct, setDraftProduct] = useState<ProductForm>(createProduct);
  const [draftShowcase, setDraftShowcase] = useState<ShowcaseForm>(createShowcase);
  const [draftCategory, setDraftCategory] = useState<CategoryForm>(createCategory);
  const [draftBanner, setDraftBanner] = useState<BannerForm>(createBanner);
  const [editingShowcase, setEditingShowcase] = useState<ShowcaseForm | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryForm | null>(null);
  const [editingBanner, setEditingBanner] = useState<BannerForm | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isEditShowcaseOpen, setIsEditShowcaseOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [requiredErrors, setRequiredErrors] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState("");
  const [relationProduct, setRelationProduct] = useState<ProductForm | null>(null);
  const [relationMode, setRelationMode] = useState<ProductRelationMode>("category");
  const [relationCategoryIds, setRelationCategoryIds] = useState<string[]>([]);
  const [relationShowcaseIds, setRelationShowcaseIds] = useState<string[]>([]);
  const [draggingProductId, setDraggingProductId] = useState<number | string | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [draggingStorefrontKey, setDraggingStorefrontKey] = useState<string | null>(null);
  const [draftBannerImageUrl, setDraftBannerImageUrl] = useState("");
  const [editingBannerImageUrl, setEditingBannerImageUrl] = useState("");

  const hasRequiredError = (key: string) => requiredErrors.includes(key);

  const showRequiredErrors = (keys: string[], message: string) => {
    setRequiredErrors(keys);
    setStatus(message);
    window.setTimeout(() => scrollToFirstInvalidField(document), 0);
  };

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      const startedAt = Date.now();
      try {
        const catalog = await getProducts({ all: true });
        if (cancelled) return;

        const apiProducts = dedupeProducts(
          catalog.products.map((item, index) =>
            normalizeProduct(item as Partial<ProductForm>, index)
          )
        );
        const nextShowcases = ensureShowcases(
          apiProducts,
          catalog.showcases.map((item, index) => ({
            id: String(item.id),
            title: String(item.title ?? `ویترین ${index + 1}`),
            active: item.active !== false,
            mode: item.mode === "auto" ? "auto" : "manual",
            autoSort: String(item.autoSort ?? "newest"),
            limit: Number.isFinite(Number(item.limit)) ? Math.max(1, Math.round(Number(item.limit))) : 8,
            categoryId: String(item.categoryId ?? ""),
            manualProductIds: Array.isArray(item.manualProductIds) ? item.manualProductIds.map((value) => String(value)) : [],
            sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
          }))
        );
        const nextBanners = catalog.banners.map((item, index) =>
          normalizeBanner(
            {
              ...item,
              showcaseId: String(item.showcaseId ?? ""),
              homeSortOrder: Number(item.homeSortOrder ?? item.sortOrder),
              showcaseSortOrder: Number(item.showcaseSortOrder ?? item.sortOrder),
              intervalSeconds: Number(item.intervalSeconds),
              heightPercent: Number(item.heightPercent),
            },
            index
          )
        );
        const nextCategories = catalog.categories.length > 0
          ? catalog.categories.map((item, index) =>
              normalizeCategory(
                {
                  id: item.id,
                  title: item.title,
                  slug: item.slug,
                  imageUrl: item.imageUrl ?? "",
                  active: item.active,
                  sortOrder: Number(item.sortOrder),
                },
                index
              )
            )
          : [
              normalizeCategory({
                id: "general",
                title: "عمومی",
                slug: "general",
                imageUrl: "",
                active: true,
                sortOrder: 1,
              }, 0),
            ];
        setProducts(apiProducts);
        setShowcases(nextShowcases);
        setCategories(nextCategories);
        setBanners(nextBanners);
        await waitForMinimumLoading(startedAt);
      } catch {
        if (cancelled) return;
        setProducts([]);
        setShowcases([]);
        setCategories([]);
        setBanners([]);
        setStatus("دریافت اطلاعات فروشگاه ممکن نشد.");
        await waitForMinimumLoading(startedAt);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products]
  );

  const sortedShowcases = useMemo(
    () => ensureShowcases(products, showcases),
    [products, showcases]
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => a.sortOrder - b.sortOrder),
    [banners]
  );

  const nextDisplayOrder = useMemo(() => {
    const orders = [...sortedShowcases, ...sortedBanners].map((item) => item.sortOrder);
    return (Math.max(0, ...orders) || 0) + 1;
  }, [sortedBanners, sortedShowcases]);

  const nextCategoryOrder = useMemo(
    () => (Math.max(0, ...sortedCategories.map((item) => item.sortOrder)) || 0) + 1,
    [sortedCategories]
  );

  const displaySections = useMemo(() => {
    const bannerSections = sortedBanners.map((banner) => ({
      type: "banner" as const,
      item: banner,
      sortOrder: banner.sortOrder,
    }));

    const showcaseSections = sortedShowcases.map((showcase) => ({
      type: "showcase" as const,
      item: showcase,
      sortOrder: showcase.sortOrder,
    }));

    return [...bannerSections, ...showcaseSections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sortedBanners, sortedShowcases]);

  const persistProducts = async (
    nextProducts: ProductForm[],
    nextShowcases = sortedShowcases,
    nextBanners = sortedBanners,
    nextCategories = sortedCategories,
    showSavedStatus = true
  ) => {
    const validProducts = dedupeProducts(
      nextProducts.filter((item) => item.title.trim() && item.description.trim() && item.price.trim())
    );

    setSaving(true);
    setStatus("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: validProducts,
          showcases: nextShowcases.map((showcase) => ({
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
          categories: nextCategories.map((category) => ({
            id: category.id,
            title: category.title,
            slug: category.slug,
            imageUrl: category.imageUrl,
            active: category.active,
            sortOrder: category.sortOrder,
          })),
          banners: nextBanners.map((banner) => {
            const normalizedBanner = normalizeBannerTiming(banner);
            return {
              id: normalizedBanner.id,
              title: normalizedBanner.title,
              showcaseId: normalizedBanner.showOnShowcase ? normalizedBanner.showcaseId : "",
              imageUrls: normalizedBanner.imageUrls,
              active: normalizedBanner.active,
              showOnHome: normalizedBanner.showOnHome,
              showOnShowcase: normalizedBanner.showOnShowcase,
              intervalSeconds: normalizedBanner.intervalSeconds,
              heightPercent: normalizedBanner.heightPercent,
              homeSortOrder: normalizedBanner.homeSortOrder,
              showcaseSortOrder: normalizedBanner.showcaseSortOrder,
              sortOrder: normalizedBanner.sortOrder,
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "API save failed");
      }
      const savedProducts = Array.isArray(data?.data?.products)
        ? dedupeProducts(data.data.products.map(normalizeProduct))
        : validProducts;
      const savedShowcases = Array.isArray(data?.data?.showcases)
        ? ensureShowcases(savedProducts, data.data.showcases.map(normalizeShowcase))
        : nextShowcases;
      const savedBanners = Array.isArray(data?.data?.banners)
        ? data.data.banners.map(normalizeBanner)
        : nextBanners;
      const savedCategories = Array.isArray(data?.data?.categories)
        ? data.data.categories.map(normalizeCategory)
        : nextCategories;
      setProducts(savedProducts);
      setShowcases(savedShowcases);
      setCategories(savedCategories);
      setBanners(savedBanners);
      clearProductsCache();
      if (showSavedStatus) setStatus("Catalog saved to database.");
    } catch (error) {
      console.error("Catalog save error:", error);
      setStatus("Database save failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveProducts = () => persistProducts(sortedProducts);

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
    await persistProducts(reordered, sortedShowcases, sortedBanners, sortedCategories, false);
    setStatus("ترتیب محصولات ذخیره شد.");
  };

  const reorderCategories = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const ordered = [...sortedCategories];
    const sourceIndex = ordered.findIndex((category) => category.id === sourceId);
    const targetIndex = ordered.findIndex((category) => category.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const reordered = ordered.map((category, index) => ({ ...category, sortOrder: index + 1 }));
    setCategories(reordered);
    await persistProducts(products, sortedShowcases, sortedBanners, reordered, false);
    setStatus("ترتیب دسته‌بندی‌ها ذخیره شد.");
  };

  const reorderShowcaseProducts = async (
    showcase: ShowcaseForm,
    sourceProductId: number | string,
    targetProductId: number | string
  ) => {
    if (String(sourceProductId) === String(targetProductId)) return;

    const visibleIds = getShowcaseProductsForAdmin(sortedProducts, showcase).map((product) => String(product.id));
    const sourceIndex = visibleIds.findIndex((id) => id === String(sourceProductId));
    const targetIndex = visibleIds.findIndex((id) => id === String(targetProductId));
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = visibleIds.splice(sourceIndex, 1);
    visibleIds.splice(targetIndex, 0, moved);
    const nextShowcases = sortedShowcases.map((item) =>
      item.id === showcase.id
        ? {
            ...item,
            mode: "manual" as const,
            manualProductIds: visibleIds,
          }
        : item
    );
    setShowcases(nextShowcases);
    await persistProducts(products, nextShowcases, sortedBanners, sortedCategories, false);
    setStatus("ترتیب محصولات ویترین ذخیره شد.");
  };

  const openProductRelations = (product: ProductForm, mode: ProductRelationMode) => {
    const categoryIds = product.categoryIds.length > 0
      ? product.categoryIds
      : [product.categoryId || sortedCategories[0]?.id || "general"];
    const showcaseIds = product.showcaseIds.length > 0
      ? product.showcaseIds
      : product.showcaseId
        ? [product.showcaseId]
        : [];
    setRelationProduct(product);
    setRelationMode(mode);
    setRelationCategoryIds(categoryIds.filter(Boolean));
    setRelationShowcaseIds(showcaseIds.filter(Boolean));
  };

  const openImagePreview = (imageUrl?: string) => {
    if (!imageUrl) return;
    setPreviewImage(imageUrl);
  };

  const openCreateModal = () => {
    const firstShowcase = sortedShowcases[0]?.id ?? "";
    const firstCategory = sortedCategories[0]?.id ?? "general";
    setRequiredErrors([]);
    setDraftProduct({
      ...createProduct(),
      showcaseId: firstShowcase,
      showcaseIds: firstShowcase ? [firstShowcase] : [],
      categoryId: firstCategory,
      categoryIds: [firstCategory],
      sortOrder: products.length + 1,
    });
    setIsCreateOpen(true);
  };

  const openShowcaseModal = () => {
    setRequiredErrors([]);
    setDraftShowcase({ ...createShowcase(), sortOrder: nextDisplayOrder });
    setIsShowcaseOpen(true);
  };

  const openCategoryModal = () => {
    setRequiredErrors([]);
    setDraftCategory({ ...createCategory(), sortOrder: nextCategoryOrder });
    setIsCategoryOpen(true);
  };

  const openBannerModal = () => {
    setRequiredErrors([]);
    setDraftBanner({ ...createBanner(), homeSortOrder: nextDisplayOrder, showcaseSortOrder: nextDisplayOrder, sortOrder: nextDisplayOrder });
    setDraftBannerImageUrl("");
    setIsBannerOpen(true);
  };

  const openEditShowcaseModal = (showcase: ShowcaseForm) => {
    setRequiredErrors([]);
    setEditingShowcase(showcase);
    setIsEditShowcaseOpen(true);
  };

  const openEditCategoryModal = (category: CategoryForm) => {
    setRequiredErrors([]);
    setEditingCategory(category);
    setIsEditCategoryOpen(true);
  };

  const openEditBannerModal = (banner: BannerForm) => {
    setRequiredErrors([]);
    setEditingBanner(banner);
    setEditingBannerImageUrl("");
    setIsEditBannerOpen(true);
  };

  const updateDraftProduct = (patch: Partial<ProductForm>) => {
    setDraftProduct((current) => ({ ...current, ...patch }));
  };

  const updateDraftShowcase = (patch: Partial<ShowcaseForm>) => {
    setDraftShowcase((current) => ({ ...current, ...patch }));
  };

  const updateDraftCategory = (patch: Partial<CategoryForm>) => {
    setDraftCategory((current) => {
      const next = { ...current, ...patch };
      if (patch.title !== undefined && !patch.slug) {
        return { ...next, slug: slugifyValue(next.title), id: slugifyValue(next.title) || next.id };
      }
      if (patch.slug !== undefined) {
        return { ...next, slug: slugifyValue(patch.slug), id: slugifyValue(patch.slug) || next.id };
      }
      return next;
    });
  };

  const updateEditingShowcase = (patch: Partial<ShowcaseForm>) => {
    setEditingShowcase((current) => (current ? { ...current, ...patch } : current));
  };

  const updateEditingCategory = (patch: Partial<CategoryForm>) => {
    setEditingCategory((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (patch.title !== undefined && !patch.slug) {
        return { ...next, slug: slugifyValue(next.title) };
      }
      if (patch.slug !== undefined) {
        return { ...next, slug: slugifyValue(patch.slug) };
      }
      return next;
    });
  };

  const updateDraftBanner = (patch: Partial<BannerForm>) => {
    setDraftBanner((current) => normalizeBannerTiming({ ...current, ...patch }));
  };

  const updateEditingBanner = (patch: Partial<BannerForm>) => {
    setEditingBanner((current) => (current ? normalizeBannerTiming({ ...current, ...patch }) : current));
  };

  const updateEditingProduct = (patch: Partial<ProductForm>) => {
    setEditingProduct((current) => (current ? { ...current, ...patch } : current));
  };

  const updateDraftPricing = (patch: Partial<ProductForm>) => {
    setDraftProduct((current) => {
      const next = { ...current, ...patch };

      if (patch.originalPrice !== undefined || patch.discountPrice !== undefined) {
        const discountPercent = calculateDiscountPercent(next.originalPrice, next.discountPrice);
        return {
          ...next,
          discountPercent,
          price: next.discountPrice,
        };
      }

      return next;
    });
  };

  const updateEditingPricing = (patch: Partial<ProductForm>) => {
    setEditingProduct((current) => {
      if (!current) return current;

      const next = { ...current, ...patch };

      if (patch.originalPrice !== undefined || patch.discountPrice !== undefined) {
        const discountPercent = calculateDiscountPercent(next.originalPrice, next.discountPrice);
        return {
          ...next,
          discountPercent,
          price: next.discountPrice,
        };
      }

      return next;
    });
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateDraftProduct({ imageUrl: String(reader.result ?? "") });
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateEditingProduct({ imageUrl: String(reader.result ?? "") });
    };
    reader.readAsDataURL(file);
  };

  const handleCategoryImageUpload = (file: File | null, mode: "draft" | "edit") => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = String(reader.result ?? "");
      if (mode === "draft") {
        updateDraftCategory({ imageUrl });
        return;
      }
      updateEditingCategory({ imageUrl });
    };
    reader.readAsDataURL(file);
  };

  const appendBannerImages = (imageUrls: string[], mode: "draft" | "edit") => {
    if (imageUrls.length === 0) return;

    if (mode === "draft") {
      updateDraftBanner({ imageUrls: [...draftBanner.imageUrls, ...imageUrls] });
      return;
    }

    if (editingBanner) {
      updateEditingBanner({ imageUrls: [...editingBanner.imageUrls, ...imageUrls] });
    }
  };

  const handleBannerImagesUpload = (files: FileList | null, mode: "draft" | "edit") => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          })
      )
    ).then((imageUrls) => appendBannerImages(imageUrls.filter(Boolean), mode));
  };

  const addBannerImageUrl = (mode: "draft" | "edit") => {
    const imageUrl = mode === "draft" ? draftBannerImageUrl.trim() : editingBannerImageUrl.trim();
    if (!imageUrl) return;

    appendBannerImages([imageUrl], mode);
    if (mode === "draft") {
      setDraftBannerImageUrl("");
      return;
    }
    setEditingBannerImageUrl("");
  };

  const removeBannerImage = (imageUrl: string, mode: "draft" | "edit") => {
    if (mode === "draft") {
      updateDraftBanner({ imageUrls: draftBanner.imageUrls.filter((item) => item !== imageUrl) });
      return;
    }

    if (editingBanner) {
      updateEditingBanner({ imageUrls: editingBanner.imageUrls.filter((item) => item !== imageUrl) });
    }
  };

  const openEditModal = (product: ProductForm) => {
    setRequiredErrors([]);
    setEditingProduct(product);
    setIsEditOpen(true);
  };

  const submitDraftProduct = async () => {
    if (saving) return;

    const errors = [
      !draftProduct.title.trim() && "draftProduct.title",
      !draftProduct.description.trim() && "draftProduct.description",
      !draftProduct.discountPrice.trim() && "draftProduct.discountPrice",
      draftProduct.categoryIds.length === 0 && "draftProduct.categoryId",
      !hasMatchingColorStock(draftProduct) && "draftProduct.colorStock",
    ].filter(Boolean) as string[];

    if (errors.length > 0) {
      showRequiredErrors(errors, "عنوان، توضیحات، قیمت جدید، دسته‌بندی و موجودی رنگ‌ها الزامی است.");
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

  const submitDraftBanner = async () => {
    if (draftBanner.imageUrls.length === 0) {
      showRequiredErrors(["draftBanner.images"], "Banner needs at least one image.");
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
    const nextShowcases = sortedShowcases.map((showcase) =>
      showcase.id === editingShowcase.id ? editingShowcase : showcase
    );
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

  const submitEditingBanner = async () => {
    if (!editingBanner) return;

    if (editingBanner.imageUrls.length === 0) {
      showRequiredErrors(["editingBanner.images"], "Banner needs at least one image.");
      return;
    }

    setRequiredErrors([]);
    const normalizedBanner = normalizeBannerTiming(editingBanner);
    const nextBanners = sortedBanners.map((banner) =>
      banner.id === normalizedBanner.id ? normalizedBanner : banner
    );
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

  const deleteEditingShowcase = async () => {
    if (!editingShowcase) return;

    await deleteShowcase(editingShowcase);
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

  const submitEditingProduct = async () => {
    if (saving) return;
    if (!editingProduct) return;

    const errors = [
      !editingProduct.title.trim() && "editingProduct.title",
      !editingProduct.description.trim() && "editingProduct.description",
      !editingProduct.discountPrice.trim() && "editingProduct.discountPrice",
      editingProduct.categoryIds.length === 0 && "editingProduct.categoryId",
      !hasMatchingColorStock(editingProduct) && "editingProduct.colorStock",
    ].filter(Boolean) as string[];

    if (errors.length > 0) {
      showRequiredErrors(errors, "عنوان، توضیحات، قیمت جدید، دسته‌بندی و موجودی رنگ‌ها الزامی است.");
      return;
    }

    setRequiredErrors([]);
    const nextProducts = products.map((item) =>
      item.id === editingProduct.id ? editingProduct : item
    );
    setProducts(nextProducts);
    setIsEditOpen(false);
    setEditingProduct(null);
    await persistProducts(nextProducts);
  };

  const deleteEditingProduct = async () => {
    if (saving) return;
    if (!editingProduct) return;

    const editingKey = getProductKey(editingProduct);
    const nextProducts = products.filter(
      (item) => item.id !== editingProduct.id && getProductKey(item) !== editingKey
    );
    setProducts(nextProducts);
    setIsEditOpen(false);
    setEditingProduct(null);
    await persistProducts(nextProducts);
  };

  const updateProductAssignment = async (
    product: ProductForm,
    patch: Pick<Partial<ProductForm>, "categoryId" | "showcaseId" | "categoryIds" | "showcaseIds">
  ) => {
    const nextProducts = products.map((item) =>
      item.id === product.id ? { ...item, ...patch } : item
    );
    const nextProduct = nextProducts.find((item) => item.id === product.id) ?? null;
    setProducts(nextProducts);
    setRelationProduct((current) => current?.id === product.id ? nextProduct : current);
    await persistProducts(nextProducts, sortedShowcases, sortedBanners, sortedCategories, false);
  };

  const toggleCategoryProduct = async (category: CategoryForm, product: ProductForm) => {
    const current = product.categoryIds.length > 0 ? product.categoryIds : [product.categoryId];
    const next = current.includes(category.id)
      ? current.filter((id) => id !== category.id)
      : [...current, category.id];
    const normalized = next.length > 0 ? next : [sortedCategories[0]?.id ?? "general"];
    await updateProductAssignment(product, { categoryId: normalized[0], categoryIds: normalized });
  };

  const toggleShowcaseProduct = async (showcase: ShowcaseForm, product: ProductForm) => {
    const current = product.showcaseIds.length > 0 ? product.showcaseIds : product.showcaseId ? [product.showcaseId] : [];
    const next = current.includes(showcase.id)
      ? current.filter((id) => id !== showcase.id)
      : [...current, showcase.id];
    await updateProductAssignment(product, { showcaseId: next[0] ?? "", showcaseIds: next });
  };

  const toggleRelationCategory = (categoryId: string) => {
    setRelationCategoryIds((current) => {
      if (current.includes(categoryId)) {
        return current.length <= 1 ? current : current.filter((id) => id !== categoryId);
      }

      return [...current, categoryId];
    });
  };

  const toggleRelationShowcase = (showcaseId: string) => {
    setRelationShowcaseIds((current) =>
      current.includes(showcaseId)
        ? current.filter((id) => id !== showcaseId)
        : [...current, showcaseId]
    );
  };

  const submitRelationSelection = async () => {
    if (!relationProduct) return;

    if (relationMode === "category") {
      const normalized = relationCategoryIds.length > 0
        ? relationCategoryIds
        : [sortedCategories[0]?.id ?? "general"];
      await updateProductAssignment(relationProduct, {
        categoryId: normalized[0],
        categoryIds: normalized,
      });
    } else {
      await updateProductAssignment(relationProduct, {
        showcaseId: relationShowcaseIds[0] ?? "",
        showcaseIds: relationShowcaseIds,
      });
    }

    setRelationProduct(null);
  };

  const updateBannerPlacement = (banner: BannerForm, sortOrder: number) => {
    setBanners((current) =>
      current.map((item) => (item.id === banner.id ? { ...item, homeSortOrder: sortOrder, sortOrder } : item))
    );
  };

  const updateShowcasePlacement = (showcase: ShowcaseForm, sortOrder: number) => {
    setShowcases((current) =>
      current.map((item) => (item.id === showcase.id ? { ...item, sortOrder } : item))
    );
  };

  const saveStorefrontPlacement = () => persistProducts(products, sortedShowcases, sortedBanners, sortedCategories);

  const storefrontKey = (entry: { type: "banner" | "showcase"; item: { id: string } }) => `${entry.type}:${entry.item.id}`;

  const reorderStorefrontSections = async (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;
    const ordered = displaySections.map((entry) => ({
      type: entry.type,
      item: entry.item,
      key: storefrontKey(entry),
    }));
    const sourceIndex = ordered.findIndex((entry) => entry.key === sourceKey);
    const targetIndex = ordered.findIndex((entry) => entry.key === targetKey);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const nextOrder = new Map(ordered.map((entry, index) => [entry.key, index + 1]));
    const nextBanners = banners.map((banner) => ({
      ...banner,
      homeSortOrder: nextOrder.get(`banner:${banner.id}`) ?? banner.homeSortOrder,
      sortOrder: nextOrder.get(`banner:${banner.id}`) ?? banner.sortOrder,
    }));
    const nextShowcases = showcases.map((showcase) => ({
      ...showcase,
      sortOrder: nextOrder.get(`showcase:${showcase.id}`) ?? showcase.sortOrder,
    }));

    setBanners(nextBanners);
    setShowcases(nextShowcases);
    await persistProducts(products, nextShowcases, nextBanners, sortedCategories, false);
    setStatus("چیدمان فروشگاه ذخیره شد.");
  };

  return (
    <section className="flex w-full max-w-none flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-bold text-primary-text">
          {section === "products" && "محصولات"}
          {section === "banners" && "بنرها"}
          {section === "showcases" && "ویترین‌ها"}
          {section === "categories" && "دسته‌بندی‌ها"}
          {section === "storefront" && "مدیریت چیدمان فروشگاه"}
        </div>
        <div className="hidden text-base font-bold text-primary-text">
          {section === "products" && "محصولات"}
          {section === "banners" && "بنرها"}
          {section === "showcases" && "ویترین‌ها"}
          {section === "categories" && "دسته‌بندی‌ها"}
          {section === "storefront" && "مدیریت چیدمان فروشگاه"}
        </div>
        <span className="text-xs font-semibold text-primary-text">
          {section === "products" && `${sortedProducts.length} محصول`}
          {section === "banners" && `${sortedBanners.length} بنر`}
          {section === "showcases" && `${sortedShowcases.length} ویترین`}
          {section === "categories" && `${sortedCategories.length} دسته‌بندی`}
          {section === "storefront" && `${displaySections.length} بخش`}
        </span>
      </div>

      {section === "products" ? (
        <div className="flex flex-wrap gap-3">
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              draggable
              onDragStart={(event) => {
                setDraggingProductId(product.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(product.id));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("text/plain") || draggingProductId;
                if (sourceId) void reorderProducts(sourceId, product.id);
                setDraggingProductId(null);
              }}
              onDragEnd={() => setDraggingProductId(null)}
              className={`flex w-full max-w-80 cursor-grab flex-col gap-3 rounded-lg border bg-primary-card p-3 active:cursor-grabbing ${
                draggingProductId === product.id ? "border-primary opacity-70" : "border-primary-border"
              }`}
            >
              <button type="button" className="flex gap-3 text-right" onClick={() => openEditModal(product)}>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-secondary-text">بدون تصویر</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="line-clamp-1 text-sm font-bold text-primary-text">{product.title || "محصول بدون عنوان"}</div>
                  <span className="text-xs text-secondary-text">{formatPrice(product.discountPrice || product.price) || "بدون قیمت"}</span>
                  <span className="text-xs text-secondary-text">{product.categoryIds.length} دسته‌بندی / {product.showcaseIds.length} ویترین</span>
                </div>
              </button>
              <div className="flex flex-wrap gap-2">
                <CustomButton
                  size="sm"
                  rounded="full"
                  variant="primary"
                  border="base"
                  icon={<IoCreateOutline />}
                  onClick={() => openEditModal(product)}
                >
                  ویرایش
                </CustomButton>
                <CustomButton
                  size="sm"
                  rounded="full"
                  variant="neutral"
                  border="base"
                  onClick={() => openProductRelations(product, "category")}
                >
                  دسته‌بندی
                </CustomButton>
                <CustomButton
                  size="sm"
                  rounded="full"
                  variant="neutral"
                  border="base"
                  onClick={() => openProductRelations(product, "showcase")}
                >
                  ویترین
                </CustomButton>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {section === "banners" ? (
        <div className="flex flex-col gap-5">
          {sortedBanners.map((banner) => (
            <AdminBannerList
              key={`banner-${banner.id}`}
              banner={banner}
              onEdit={openEditBannerModal}
              onPreview={openImagePreview}
              isLoading={loading}
            />
          ))}
        </div>
      ) : null}

      {section === "showcases" ? (
        <div className="flex flex-col gap-5">
          {sortedShowcases.map((showcase) => (
            <AdminShowcaseList
              key={`showcase-${showcase.id}`}
              products={sortedProducts}
              showcases={[showcase]}
              onEditShowcase={openEditShowcaseModal}
              onDeleteShowcase={deleteShowcase}
              onReorderProducts={(targetShowcase, sourceId, targetId) => {
                void reorderShowcaseProducts(targetShowcase, sourceId, targetId);
              }}
              onPreview={openImagePreview}
              formatPrice={formatPrice}
              isLoading={loading}
            />
          ))}
        </div>
      ) : null}

      {section === "categories" ? (
        <div className="flex flex-col gap-4">
          {sortedCategories.map((category) => {
            const categoryProducts = sortedProducts.filter((product) => {
              const ids = product.categoryIds.length > 0 ? product.categoryIds : [product.categoryId];
              return ids.includes(category.id);
            });

            return (
              <div
                key={category.id}
                draggable
                onDragStart={(event) => {
                  setDraggingCategoryId(category.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", category.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData("text/plain") || draggingCategoryId;
                  if (sourceId) void reorderCategories(sourceId, category.id);
                  setDraggingCategoryId(null);
                }}
                onDragEnd={() => setDraggingCategoryId(null)}
                className={`flex cursor-grab flex-col gap-3 rounded-lg border bg-primary-card p-3 active:cursor-grabbing ${
                  draggingCategoryId === category.id ? "border-primary opacity-70" : "border-primary-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CategoryOption label={category.title} imageUrl={category.imageUrl} size="sm" />
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-bold text-primary-text">{category.title || "دسته‌بندی بدون عنوان"}</div>
                      <span className="text-xs text-secondary-text">{categoryProducts.length} محصول</span>
                    </div>
                  </div>
                  <CustomButton size="sm" variant="neutral" border="base" onClick={() => openEditCategoryModal(category)}>
                    ویرایش
                  </CustomButton>
                </div>
                <div className="flex flex-wrap gap-3">
                  {categoryProducts.length === 0 ? (
                    <div className="rounded-md border border-dashed border-primary-border bg-primary-soft p-3 text-xs text-secondary-text">
                      محصولی در این دسته‌بندی نیست.
                    </div>
                  ) : null}
                  {categoryProducts.map((product, index) => (
                    <button
                      key={product.id}
                      type="button"
                      className="flex min-w-56 max-w-56 shrink-0 gap-2 rounded-lg border border-primary-border bg-primary-soft p-2 text-right"
                      onClick={() => openProductRelations(product, "category")}
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title || `محصول ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] text-secondary-text">بدون تصویر</span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="line-clamp-1 text-xs font-bold text-primary-text">
                          {product.title || `محصول ${index + 1}`}
                        </span>
                        <span className="line-clamp-1 text-xs font-semibold text-primary">
                          {formatPrice(product.discountPrice || product.price) || "بدون قیمت"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {false && section === "categories" ? (
        <div className="flex flex-col gap-4">
          {sortedCategories.map((category) => (
            <div key={category.id} className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CategoryOption label={category.title} imageUrl={category.imageUrl} size="sm" />
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-bold text-primary-text">{category.title}</div>
                    <span className="text-xs text-secondary-text">{sortedProducts.filter((product) => product.categoryId === category.id).length} محصول</span>
                  </div>
                </div>
                <CustomButton size="sm" variant="neutral" border="base" onClick={() => openEditCategoryModal(category)}>
                  ویرایش
                </CustomButton>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedProducts.map((product) => (
                  <CustomButton
                    key={product.id}
                    size="sm"
                    border="base"
                    rounded="full"
                    variant={product.categoryId === category.id ? "primary" : "neutral"}
                    onClick={() => void toggleCategoryProduct(category, product)}
                  >
                    {product.title || "بدون عنوان"}
                  </CustomButton>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {section === "storefront" ? (
        <div className="flex flex-col gap-4">
          {displaySections.map((entry) => {
            const key = storefrontKey(entry);
            return (
            <div
              key={key}
              draggable
              onDragStart={(event) => {
                setDraggingStorefrontKey(key);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", key);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceKey = event.dataTransfer.getData("text/plain") || draggingStorefrontKey;
                if (sourceKey) void reorderStorefrontSections(sourceKey, key);
                setDraggingStorefrontKey(null);
              }}
              onDragEnd={() => setDraggingStorefrontKey(null)}
              className={`flex cursor-grab flex-col gap-3 rounded-lg border bg-primary-card p-3 active:cursor-grabbing sm:flex-row sm:items-center sm:justify-between ${
                draggingStorefrontKey === key ? "border-primary opacity-70" : "border-primary-border"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="text-sm font-bold text-primary-text">{entry.item.title || `${entry.type === "banner" ? "بنر" : "ویترین"} بدون عنوان`}</div>
                <span className="text-xs text-secondary-text">{entry.type === "banner" ? "بنر" : "ویترین"}</span>
              </div>
              <CustomInput
                type="number"
                value={entry.item.sortOrder}
                placeholder="Placement"
                onChange={(event) => {
                  const sortOrder = Number(event.target.value);
                  if (entry.type === "banner") updateBannerPlacement(entry.item, sortOrder);
                  else updateShowcasePlacement(entry.item, sortOrder);
                }}
              />
            </div>
            );
          })}
          <CustomButton border="base" icon={<IoSaveOutline />} onClick={() => void saveStorefrontPlacement()}>
            ذخیره چیدمان
          </CustomButton>
        </div>
      ) : null}

      {section === "products" ? <FloatButton label="New product" icon={<IoAdd />} position="bottom-right" border="base" shadow="lg" onClick={openCreateModal} /> : null}
      {section === "showcases" ? <FloatButton label="New showcase" icon={<IoAdd />} position="bottom-right" border="base" shadow="lg" onClick={openShowcaseModal} /> : null}
      {section === "categories" ? <FloatButton label="دسته‌بندی جدید" icon={<IoAdd />} position="bottom-right" border="base" shadow="lg" onClick={openCategoryModal} /> : null}
      {section === "banners" ? <FloatButton label="New banner" icon={<IoAdd />} position="bottom-right" border="base" shadow="lg" onClick={openBannerModal} /> : null}

      <CustomModal
        open={isCategoryOpen}
        onClose={() => setIsCategoryOpen(false)}
        title="ثبت دسته‌بندی"
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
          <RequiredLabel required className="text-primary-text">عنوان دسته‌بندی</RequiredLabel>
          <CustomInput
            value={draftCategory.title}
            placeholder="عنوان دسته‌بندی"
            invalid={hasRequiredError("draftCategory.title") && !draftCategory.title.trim()}
            onChange={(event) => updateDraftCategory({ title: event.target.value })}
          />
          <CustomInput
            value={draftCategory.slug}
            placeholder="Slug"
            onChange={(event) => updateDraftCategory({ slug: event.target.value })}
          />
          <CustomInput
            value={draftCategory.imageUrl}
            placeholder="آدرس تصویر دسته‌بندی"
            onChange={(event) => updateDraftCategory({ imageUrl: event.target.value })}
          />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-3 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
            <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
            <span className="text-sm font-semibold">بارگذاری تصویر دسته‌بندی</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleCategoryImageUpload(event.target.files?.[0] ?? null, "draft")}
            />
          </label>
          <CategoryOption label={draftCategory.title || "دسته‌بندی"} imageUrl={draftCategory.imageUrl} />
          <CustomInput
            type="number"
            value={draftCategory.sortOrder}
            placeholder="ترتیب نمایش"
            onChange={(event) => updateDraftCategory({ sortOrder: Number(event.target.value) })}
          />
          <CustomSwitch
            checked={draftCategory.active}
            onChange={(active) => updateDraftCategory({ active })}
            label={draftCategory.active ? "فعال" : "مخفی"}
            size="sm"
          />
          <CustomButton border="base" fullWidth icon={<IoSaveOutline />} onClick={submitDraftCategory}>
            ثبت دسته‌بندی
          </CustomButton>
        </div>
      </CustomModal>

      <CustomModal
        open={isEditCategoryOpen}
        onClose={() => {
          setIsEditCategoryOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory?.title || "ویرایش دسته‌بندی"}
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {editingCategory && (
          <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
            <RequiredLabel required className="text-primary-text">عنوان دسته‌بندی</RequiredLabel>
            <CustomInput
              value={editingCategory.title}
              placeholder="عنوان دسته‌بندی"
              invalid={hasRequiredError("editingCategory.title") && !editingCategory.title.trim()}
              onChange={(event) => updateEditingCategory({ title: event.target.value })}
            />
            <CustomInput
              value={editingCategory.slug}
              placeholder="Slug"
              onChange={(event) => updateEditingCategory({ slug: event.target.value })}
            />
            <CustomInput
              value={editingCategory.imageUrl}
              placeholder="آدرس تصویر دسته‌بندی"
              onChange={(event) => updateEditingCategory({ imageUrl: event.target.value })}
            />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-3 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">بارگذاری تصویر دسته‌بندی</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleCategoryImageUpload(event.target.files?.[0] ?? null, "edit")}
              />
            </label>
            <CategoryOption label={editingCategory.title || "دسته‌بندی"} imageUrl={editingCategory.imageUrl} />
            <CustomInput
              type="number"
              value={editingCategory.sortOrder}
              placeholder="ترتیب نمایش"
              onChange={(event) => updateEditingCategory({ sortOrder: Number(event.target.value) })}
            />
            <CustomSwitch
              checked={editingCategory.active}
              onChange={(active) => updateEditingCategory({ active })}
              label={editingCategory.active ? "فعال" : "مخفی"}
              size="sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <CustomButton variant="danger" border="base" fullWidth icon={<IoTrashOutline />} onClick={deleteEditingCategory}>
                حذف
              </CustomButton>
              <CustomButton border="base" fullWidth icon={<IoSaveOutline />} onClick={submitEditingCategory}>
                ذخیره دسته‌بندی
              </CustomButton>
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        open={isBannerOpen}
        onClose={() => setIsBannerOpen(false)}
        title="Register banner"
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-lg border border-primary-border bg-primary-card p-3">
            <CustomInput
              value={draftBanner.title}
              placeholder="Banner title"
              onChange={(event) => updateDraftBanner({ title: event.target.value })}
            />
          <CustomInput
            type="number"
            value={draftBanner.homeSortOrder}
            placeholder="ترتیب نمایش"
            onChange={(event) => updateDraftBanner({ homeSortOrder: Number(event.target.value), sortOrder: Number(event.target.value) })}
          />
          <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3">
            <div className="text-sm font-bold text-primary-text">محل نمایش بنر</div>
            <div className="flex flex-wrap gap-2">
              <CustomSwitch
                checked={draftBanner.showOnHome}
                onChange={(showOnHome) => updateDraftBanner({ showOnHome })}
                label={draftBanner.showOnHome ? "خانه فعال" : "خانه غیرفعال"}
                size="sm"
              />
              <CustomSwitch
                checked={draftBanner.showOnShowcase}
                onChange={(showOnShowcase) => updateDraftBanner({
                  showOnShowcase,
                  showcaseId: showOnShowcase ? draftBanner.showcaseId || sortedShowcases[0]?.id || "" : draftBanner.showcaseId,
                })}
                label={draftBanner.showOnShowcase ? "ویترین فعال" : "ویترین غیرفعال"}
                size="sm"
              />
            </div>
            {draftBanner.showOnShowcase ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <CustomSelect
                  value={draftBanner.showcaseId}
                  aria-label="انتخاب ویترین بنر"
                  onChange={(event) => updateDraftBanner({ showcaseId: event.target.value })}
                >
                  <option value="">انتخاب ویترین</option>
                  {sortedShowcases.map((showcase) => (
                    <option key={showcase.id} value={showcase.id}>
                      {showcase.title || showcase.id}
                    </option>
                  ))}
                </CustomSelect>
                <CustomInput
                  type="number"
                  value={draftBanner.showcaseSortOrder}
                  placeholder="ترتیب در ویترین"
                  onChange={(event) => updateDraftBanner({ showcaseSortOrder: Number(event.target.value) })}
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CustomInput
              name="draft-banner-interval-seconds"
              type="number"
              min={1}
              max={60}
              step={1}
              value={draftBanner.intervalSeconds}
              placeholder="Auto advance seconds"
              onChange={(event) => updateDraftBanner({ intervalSeconds: Number(event.target.value) })}
            />
            <CustomInput
              name="draft-banner-height-percent"
              type="number"
              min={10}
              max={100}
              step={1}
              value={draftBanner.heightPercent}
              placeholder="Height percent"
              onChange={(event) => updateDraftBanner({ heightPercent: Number(event.target.value) })}
            />
          </div>
          <div
            data-invalid={hasRequiredError("draftBanner.images") && draftBanner.imageUrls.length === 0 ? "true" : undefined}
            tabIndex={-1}
            className={`flex flex-col gap-3 rounded-lg border bg-primary-soft p-3 outline-none ${hasRequiredError("draftBanner.images") && draftBanner.imageUrls.length === 0 ? "border-danger-border-nomode" : "border-primary-border"}`}
          >
            <RequiredLabel required className="text-primary-text">Banner images</RequiredLabel>
            <div className="flex gap-2">
              <CustomInput
                value={draftBannerImageUrl}
                placeholder="آدرس تصویر"
                onChange={(event) => setDraftBannerImageUrl(event.target.value)}
              />
              <CustomButton border="base" icon={<IoAdd />} onClick={() => addBannerImageUrl("draft")}>
                افزودن
              </CustomButton>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">بارگذاری تصاویر</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => handleBannerImagesUpload(event.target.files, "draft")}
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {draftBanner.imageUrls.length === 0 && (
                <span className="text-sm text-secondary-text">Banner preview</span>
              )}
              {draftBanner.imageUrls.map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="flex min-w-40 flex-col gap-2">
                  <button
                    type="button"
                    className="h-24 overflow-hidden rounded-md border border-primary-border bg-primary-media"
                    onClick={() => openImagePreview(imageUrl)}
                    aria-label="باز کردن تصویر بنر"
                  >
                    <img src={imageUrl} alt={`Banner image ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                  <CustomButton
                    variant="danger"
                    size="sm"
                    border="base"
                    icon={<IoTrashOutline />}
                    onClick={() => removeBannerImage(imageUrl, "draft")}
                  >
                    Remove
                  </CustomButton>
                </div>
              ))}
            </div>
          </div>
          <CustomSwitch
            checked={draftBanner.active}
            onChange={(active) => updateDraftBanner({ active })}
            label={draftBanner.active ? "فعال" : "مخفی"}
            size="sm"
          />
          <CustomButton
            border="base"
            fullWidth
            icon={<IoSaveOutline />}
            onClick={submitDraftBanner}
          >
            Register banner
          </CustomButton>
        </div>
      </CustomModal>

      <CustomModal
        open={isEditBannerOpen}
        onClose={() => {
          setIsEditBannerOpen(false);
          setEditingBanner(null);
        }}
        title={editingBanner?.title || "ویرایش بنر"}
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {editingBanner && (
          <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-lg border border-primary-border bg-primary-card p-3">
            <CustomInput
              value={editingBanner.title}
              placeholder="Banner title"
              onChange={(event) => updateEditingBanner({ title: event.target.value })}
            />
            <CustomInput
              type="number"
              value={editingBanner.homeSortOrder}
              placeholder="ترتیب نمایش"
              onChange={(event) => updateEditingBanner({ homeSortOrder: Number(event.target.value), sortOrder: Number(event.target.value) })}
            />
            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3">
              <div className="text-sm font-bold text-primary-text">محل نمایش بنر</div>
              <div className="flex flex-wrap gap-2">
                <CustomSwitch
                  checked={editingBanner.showOnHome}
                  onChange={(showOnHome) => updateEditingBanner({ showOnHome })}
                  label={editingBanner.showOnHome ? "خانه فعال" : "خانه غیرفعال"}
                  size="sm"
                />
                <CustomSwitch
                  checked={editingBanner.showOnShowcase}
                  onChange={(showOnShowcase) => updateEditingBanner({
                    showOnShowcase,
                    showcaseId: showOnShowcase ? editingBanner.showcaseId || sortedShowcases[0]?.id || "" : editingBanner.showcaseId,
                  })}
                  label={editingBanner.showOnShowcase ? "ویترین فعال" : "ویترین غیرفعال"}
                  size="sm"
                />
              </div>
              {editingBanner.showOnShowcase ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <CustomSelect
                    value={editingBanner.showcaseId}
                    aria-label="انتخاب ویترین بنر"
                    onChange={(event) => updateEditingBanner({ showcaseId: event.target.value })}
                  >
                    <option value="">انتخاب ویترین</option>
                    {sortedShowcases.map((showcase) => (
                      <option key={showcase.id} value={showcase.id}>
                        {showcase.title || showcase.id}
                      </option>
                    ))}
                  </CustomSelect>
                  <CustomInput
                    type="number"
                    value={editingBanner.showcaseSortOrder}
                    placeholder="ترتیب در ویترین"
                    onChange={(event) => updateEditingBanner({ showcaseSortOrder: Number(event.target.value) })}
                  />
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <CustomInput
                name="edit-banner-interval-seconds"
                type="number"
                min={1}
                max={60}
                step={1}
                value={editingBanner.intervalSeconds}
                placeholder="Auto advance seconds"
                onChange={(event) => updateEditingBanner({ intervalSeconds: Number(event.target.value) })}
              />
              <CustomInput
                name="edit-banner-height-percent"
                type="number"
                min={10}
                max={100}
                step={1}
                value={editingBanner.heightPercent}
                placeholder="Height percent"
                onChange={(event) => updateEditingBanner({ heightPercent: Number(event.target.value) })}
              />
            </div>
            <div
              data-invalid={hasRequiredError("editingBanner.images") && editingBanner.imageUrls.length === 0 ? "true" : undefined}
              tabIndex={-1}
              className={`flex flex-col gap-3 rounded-lg border bg-primary-soft p-3 outline-none ${hasRequiredError("editingBanner.images") && editingBanner.imageUrls.length === 0 ? "border-danger-border-nomode" : "border-primary-border"}`}
            >
            <RequiredLabel required>Banner images</RequiredLabel>
              <div className="flex gap-2">
                <CustomInput
                  value={editingBannerImageUrl}
                  placeholder="آدرس تصویر"
                  onChange={(event) => setEditingBannerImageUrl(event.target.value)}
                />
                <CustomButton border="base" icon={<IoAdd />} onClick={() => addBannerImageUrl("edit")}>
                  افزودن
                </CustomButton>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
                <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
                <span className="text-sm font-semibold">بارگذاری تصاویر</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleBannerImagesUpload(event.target.files, "edit")}
                />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {editingBanner.imageUrls.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="flex min-w-40 flex-col gap-2">
                    <button
                      type="button"
                      className="h-24 overflow-hidden rounded-md border border-primary-border bg-primary-media"
                      onClick={() => openImagePreview(imageUrl)}
                      aria-label="باز کردن تصویر بنر"
                    >
                      <img src={imageUrl} alt={`Banner image ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                    <CustomButton
                      variant="danger"
                      size="sm"
                      border="base"
                      icon={<IoTrashOutline />}
                      onClick={() => removeBannerImage(imageUrl, "edit")}
                    >
                      Remove
                    </CustomButton>
                  </div>
                ))}
              </div>
            </div>
            <CustomSwitch
              checked={editingBanner.active}
              onChange={(active) => updateEditingBanner({ active })}
              label={editingBanner.active ? "فعال" : "مخفی"}
              size="sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <CustomButton
                variant="danger"
                border="base"
                fullWidth
                icon={<IoTrashOutline />}
                onClick={deleteEditingBanner}
              >
                حذف
              </CustomButton>
              <CustomButton
                border="base"
                fullWidth
                icon={<IoSaveOutline />}
                onClick={submitEditingBanner}
              >
                ذخیره بنر
              </CustomButton>
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        open={isShowcaseOpen}
        onClose={() => setIsShowcaseOpen(false)}
        title="Register showcase"
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
          <RequiredLabel required className="text-primary-text">عنوان ویترین</RequiredLabel>
          <CustomInput
            value={draftShowcase.title}
            placeholder="عنوان ویترین"
            invalid={hasRequiredError("draftShowcase.title") && !draftShowcase.title.trim()}
            onChange={(event) => updateDraftShowcase({ title: event.target.value })}
          />
          <CustomInput
            type="number"
            value={draftShowcase.sortOrder}
            placeholder="ترتیب نمایش"
            onChange={(event) => updateDraftShowcase({ sortOrder: Number(event.target.value) })}
          />
          <CustomSelect
            value={draftShowcase.mode}
            aria-label="حالت ویترین"
            onChange={(event) => updateDraftShowcase({ mode: event.target.value === "auto" ? "auto" : "manual" })}
          >
            <option value="manual">Manual product selection</option>
            <option value="auto">Automatic by rule</option>
          </CustomSelect>
          {draftShowcase.mode === "auto" ? (
            <div className="flex flex-col gap-3">
              <CustomSelect
                value={draftShowcase.autoSort}
                aria-label="Automatic showcase sort"
                onChange={(event) => updateDraftShowcase({ autoSort: event.target.value })}
              >
                {SHOWCASE_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CustomSelect>
              <CustomSelect
                value={draftShowcase.categoryId}
                aria-label="Automatic showcase category"
                onChange={(event) => updateDraftShowcase({ categoryId: event.target.value })}
              >
                <option value="">همه دسته‌بندی‌ها</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </CustomSelect>
              <CustomInput
                type="number"
                value={draftShowcase.limit}
                placeholder="تعداد محصول"
                onChange={(event) => updateDraftShowcase({ limit: Number(event.target.value) })}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-secondary-text">محصولات دستی</div>
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                {sortedProducts.map((product) => (
                  <CustomButton
                    key={product.id}
                    variant={draftShowcase.manualProductIds.map(String).includes(String(product.id)) ? "primary" : "neutral"}
                    size="sm"
                    border="base"
                    onClick={() => updateDraftShowcase({ manualProductIds: toggleProductId(draftShowcase.manualProductIds, product.id) })}
                  >
                    {product.title}
                  </CustomButton>
                ))}
              </div>
            </div>
          )}
          <CustomSwitch
            checked={draftShowcase.active}
            onChange={(active) => updateDraftShowcase({ active })}
            label={draftShowcase.active ? "فعال" : "مخفی"}
            size="sm"
          />
          <CustomButton
            border="base"
            fullWidth
            icon={<IoSaveOutline />}
            onClick={submitDraftShowcase}
          >
            Register showcase
          </CustomButton>
        </div>
      </CustomModal>

      <CustomModal
        open={isEditShowcaseOpen}
        onClose={() => {
          setIsEditShowcaseOpen(false);
          setEditingShowcase(null);
        }}
        title={editingShowcase?.title || "ویرایش ویترین"}
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {editingShowcase && (
          <div className="flex flex-col gap-3">
            <RequiredLabel required className="text-primary-text">عنوان ویترین</RequiredLabel>
            <CustomInput
              value={editingShowcase.title}
              placeholder="عنوان ویترین"
              invalid={hasRequiredError("editingShowcase.title") && !editingShowcase.title.trim()}
              onChange={(event) => updateEditingShowcase({ title: event.target.value })}
            />
            <CustomInput
              type="number"
              value={editingShowcase.sortOrder}
              placeholder="ترتیب نمایش"
              onChange={(event) => updateEditingShowcase({ sortOrder: Number(event.target.value) })}
            />
            <CustomSelect
              value={editingShowcase.mode}
              aria-label="حالت ویترین"
              onChange={(event) => updateEditingShowcase({ mode: event.target.value === "auto" ? "auto" : "manual" })}
            >
              <option value="manual">Manual product selection</option>
              <option value="auto">Automatic by rule</option>
            </CustomSelect>
            {editingShowcase.mode === "auto" ? (
              <div className="flex flex-col gap-3">
                <CustomSelect
                  value={editingShowcase.autoSort}
                  aria-label="Automatic showcase sort"
                  onChange={(event) => updateEditingShowcase({ autoSort: event.target.value })}
                >
                  {SHOWCASE_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CustomSelect>
                <CustomSelect
                  value={editingShowcase.categoryId}
                  aria-label="Automatic showcase category"
                  onChange={(event) => updateEditingShowcase({ categoryId: event.target.value })}
                >
                  <option value="">همه دسته‌بندی‌ها</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </CustomSelect>
                <CustomInput
                  type="number"
                  value={editingShowcase.limit}
                  placeholder="تعداد محصول"
                  onChange={(event) => updateEditingShowcase({ limit: Number(event.target.value) })}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-secondary-text">محصولات دستی</div>
                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                  {sortedProducts.map((product) => (
                    <CustomButton
                      key={product.id}
                      variant={editingShowcase.manualProductIds.map(String).includes(String(product.id)) ? "primary" : "neutral"}
                      size="sm"
                      border="base"
                      onClick={() => updateEditingShowcase({ manualProductIds: toggleProductId(editingShowcase.manualProductIds, product.id) })}
                    >
                      {product.title}
                    </CustomButton>
                  ))}
                </div>
              </div>
            )}
            <CustomSwitch
              checked={editingShowcase.active}
              onChange={(active) => updateEditingShowcase({ active })}
              label={editingShowcase.active ? "فعال" : "مخفی"}
              size="sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <CustomButton
                variant="danger"
                border="base"
                fullWidth
                icon={<IoTrashOutline />}
                onClick={deleteEditingShowcase}
              >
                حذف
              </CustomButton>
              <CustomButton
                border="base"
                fullWidth
                icon={<IoSaveOutline />}
                onClick={submitEditingShowcase}
              >
                ذخیره ویترین
              </CustomButton>
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="ثبت محصول"
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-bold">ویترین</div>
              <div className="flex flex-wrap gap-2">
                {sortedShowcases.map((showcase) => (
                  <CustomButton
                    key={showcase.id}
                    variant={draftProduct.showcaseId === showcase.id ? "primary" : "neutral"}
                    rounded="full"
                    size="sm"
                    border="base"
                    onClick={() => updateDraftProduct({ showcaseId: showcase.id })}
                  >
                    {showcase.title || "بدون عنوان"}
                  </CustomButton>
                ))}
              </div>
            </div>
            <RequiredLabel required className="text-primary-text">عنوان</RequiredLabel>
            <CustomInput
              value={draftProduct.title}
              placeholder="عنوان"
              invalid={hasRequiredError("draftProduct.title") && !draftProduct.title.trim()}
              onChange={(event) => updateDraftProduct({ title: event.target.value })}
            />
            <CustomInput
              value={draftProduct.originalPrice}
              placeholder="قیمت قبل از تخفیف"
              onChange={(event) => updateDraftPricing({ originalPrice: event.target.value })}
            />
            <RequiredLabel required className="text-primary-text">قیمت با تخفیف</RequiredLabel>
            <CustomInput
              value={draftProduct.discountPrice}
              placeholder="قیمت با تخفیف"
              invalid={hasRequiredError("draftProduct.discountPrice") && !draftProduct.discountPrice.trim()}
              onChange={(event) => updateDraftPricing({ discountPrice: event.target.value })}
            />
            <CustomInput
              value={draftProduct.badge}
              placeholder="برچسب"
              onChange={(event) => updateDraftProduct({ badge: event.target.value })}
            />
            <InventoryControls product={draftProduct} onChange={updateDraftProduct} />
            <ProductAdvancedFields
              product={draftProduct}
              categories={sortedCategories}
              onChange={updateDraftProduct}
              hasRequiredError={hasRequiredError}
              categoryErrorKey="draftProduct.categoryId"
            />
            <CustomInput
              type="number"
              value={draftProduct.sortOrder}
              placeholder="ترتیب نمایش"
              onChange={(event) => updateDraftProduct({ sortOrder: Number(event.target.value) })}
            />
            <CustomInput
              value={draftProduct.ctaLabel}
              placeholder="متن دکمه"
              onChange={(event) => updateDraftProduct({ ctaLabel: event.target.value })}
            />
            <CustomInput
              value={draftProduct.ctaHref}
              placeholder="لینک دکمه"
              onChange={(event) => updateDraftProduct({ ctaHref: event.target.value })}
            />
          </div>

          <div className="flex min-h-10 items-center rounded-md border border-primary-border bg-primary-card">
            <span className="text-xs text-secondary-text">
              فرمول تخفیف: ((قیمت قبل از تخفیف - قیمت با تخفیف) / قیمت قبل از تخفیف) × ۱۰۰
            </span>
          </div>

          <RequiredLabel required className="text-primary-text">توضیحات</RequiredLabel>
          <textarea
            value={draftProduct.description}
            placeholder="توضیحات"
            aria-invalid={hasRequiredError("draftProduct.description") && !draftProduct.description.trim()}
            data-invalid={hasRequiredError("draftProduct.description") && !draftProduct.description.trim() ? "true" : undefined}
            onChange={(event) => updateDraftProduct({ description: event.target.value })}
            className={`min-h-24 rounded-md border bg-primary-card p-3 text-sm text-primary-text outline-none focus:ring-2 ${hasRequiredError("draftProduct.description") && !draftProduct.description.trim() ? "border-danger-border-nomode focus:ring-danger-border-nomode" : "border-primary-border focus:ring-primary-border"}`}
          />

          <div className="flex flex-col gap-3 rounded-lg border border-primary-border">
            <div className="text-sm font-bold">تصویر محصول</div>
            <CustomInput
              value={draftProduct.imageUrl}
              placeholder="آدرس تصویر یا داده تصویر بارگذاری‌شده"
              onChange={(event) => updateDraftProduct({ imageUrl: event.target.value })}
            />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">بارگذاری تصویر</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleImageUpload(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-primary-border bg-primary-media">
              {draftProduct.imageUrl ? (
                <button
                  type="button"
                  className="h-full w-full"
                  onClick={() => openImagePreview(draftProduct.imageUrl)}
                  aria-label="باز کردن تصویر محصول"
                >
                  <img
                    src={draftProduct.imageUrl}
                    alt="پیش‌نمایش محصول"
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <span className="text-sm text-secondary-text">پیش‌نمایش تصویر</span>
              )}
            </div>
          </div>

          <CustomSwitch
            checked={draftProduct.isActive}
            onChange={(isActive) => updateDraftProduct({ isActive, active: isActive })}
            label={draftProduct.isActive ? "فعال" : "مخفی"}
            size="sm"
          />

          <CustomButton
            border="base"
            fullWidth
            isLoading={saving}
            loading="dots"
            loadingText="در حال ذخیره..."
            icon={<IoSaveOutline />}
            onClick={submitDraftProduct}
          >
            ثبت محصول
          </CustomButton>
        </div>
      </CustomModal>

      <CustomModal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct?.title || "ویرایش محصول"}
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {editingProduct && (
          <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-bold">ویترین</div>
                <div className="flex flex-wrap gap-2">
                  {sortedShowcases.map((showcase) => (
                    <CustomButton
                      key={showcase.id}
                      variant={editingProduct.showcaseId === showcase.id ? "primary" : "neutral"}
                      rounded="full"
                      size="sm"
                      border="base"
                      onClick={() => updateEditingProduct({ showcaseId: showcase.id })}
                    >
                      {showcase.title || "بدون عنوان"}
                    </CustomButton>
                  ))}
                </div>
              </div>
              <RequiredLabel required className="text-primary-text">عنوان</RequiredLabel>
              <CustomInput
                value={editingProduct.title}
                placeholder="عنوان"
                invalid={hasRequiredError("editingProduct.title") && !editingProduct.title.trim()}
                onChange={(event) => updateEditingProduct({ title: event.target.value })}
              />
              <CustomInput
                value={editingProduct.originalPrice}
                placeholder="قیمت قبل از تخفیف"
                onChange={(event) => updateEditingPricing({ originalPrice: event.target.value })}
              />
              <RequiredLabel required className="text-primary-text">قیمت با تخفیف</RequiredLabel>
              <CustomInput
                value={editingProduct.discountPrice}
                placeholder="قیمت با تخفیف"
                invalid={hasRequiredError("editingProduct.discountPrice") && !editingProduct.discountPrice.trim()}
                onChange={(event) => updateEditingPricing({ discountPrice: event.target.value })}
              />
              <CustomInput
                value={editingProduct.badge}
                placeholder="برچسب"
                onChange={(event) => updateEditingProduct({ badge: event.target.value })}
            />
              <InventoryControls product={editingProduct} onChange={updateEditingProduct} />
              <ProductAdvancedFields
                product={editingProduct}
                categories={sortedCategories}
                onChange={updateEditingProduct}
                hasRequiredError={hasRequiredError}
                categoryErrorKey="editingProduct.categoryId"
              />
              <CustomInput
                type="number"
                value={editingProduct.sortOrder}
                placeholder="ترتیب نمایش"
                onChange={(event) => updateEditingProduct({ sortOrder: Number(event.target.value) })}
              />
              <CustomInput
                value={editingProduct.ctaLabel}
                placeholder="متن دکمه"
                onChange={(event) => updateEditingProduct({ ctaLabel: event.target.value })}
              />
              <CustomInput
                value={editingProduct.ctaHref}
                placeholder="لینک دکمه"
                onChange={(event) => updateEditingProduct({ ctaHref: event.target.value })}
              />
            </div>

            <div className="flex min-h-10 items-center rounded-md border border-primary-border bg-primary-card">
              <span className="text-xs text-secondary-text">
                فرمول تخفیف: ((قیمت قبل از تخفیف - قیمت با تخفیف) / قیمت قبل از تخفیف) × ۱۰۰
              </span>
            </div>

            <RequiredLabel required className="text-primary-text">توضیحات</RequiredLabel>
            <textarea
              value={editingProduct.description}
              placeholder="توضیحات"
              aria-invalid={hasRequiredError("editingProduct.description") && !editingProduct.description.trim()}
              data-invalid={hasRequiredError("editingProduct.description") && !editingProduct.description.trim() ? "true" : undefined}
              onChange={(event) => updateEditingProduct({ description: event.target.value })}
              className={`min-h-24 rounded-md border bg-primary-card p-3 text-sm text-primary-text outline-none focus:ring-2 ${hasRequiredError("editingProduct.description") && !editingProduct.description.trim() ? "border-danger-border-nomode focus:ring-danger-border-nomode" : "border-primary-border focus:ring-primary-border"}`}
            />

            <div className="flex flex-col gap-3 rounded-lg border border-primary-border">
              <div className="text-sm font-bold">تصویر محصول</div>
              <CustomInput
                value={editingProduct.imageUrl}
                placeholder="آدرس تصویر یا داده تصویر بارگذاری‌شده"
                onChange={(event) => updateEditingProduct({ imageUrl: event.target.value })}
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
                <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
                <span className="text-sm font-semibold">بارگذاری تصویر</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleEditImageUpload(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-primary-border bg-primary-media">
                {editingProduct.imageUrl ? (
                  <button
                    type="button"
                    className="h-full w-full"
                    onClick={() => openImagePreview(editingProduct.imageUrl)}
                    aria-label="باز کردن تصویر محصول"
                  >
                    <img
                      src={editingProduct.imageUrl}
                      alt="پیش‌نمایش محصول"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <span className="text-sm text-secondary-text">پیش‌نمایش تصویر</span>
                )}
              </div>
            </div>

            <CustomSwitch
              checked={editingProduct.isActive}
              onChange={(isActive) => updateEditingProduct({ isActive, active: isActive })}
              label={editingProduct.isActive ? "فعال" : "مخفی"}
              size="sm"
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <CustomButton
                variant="danger"
                border="base"
                fullWidth
                icon={<IoTrashOutline />}
                onClick={deleteEditingProduct}
              >
                حذف
              </CustomButton>
              <CustomButton
                border="base"
                isLoading={saving}
                loading="dots"
                loadingText="در حال ذخیره..."
                fullWidth
                icon={<IoSaveOutline />}
                onClick={submitEditingProduct}
              >
                ذخیره تغییرات
              </CustomButton>
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        open={Boolean(relationProduct)}
        onClose={() => setRelationProduct(null)}
        title={relationMode === "category" ? "دسته‌بندی‌های محصول" : "ویترین‌های محصول"}
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {relationProduct ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-bold text-primary-text">
                {relationProduct.title || "محصول بدون عنوان"}
              </div>
              <span className="text-xs text-secondary-text">
                {relationMode === "category" ? "حداقل یک دسته‌بندی باید فعال بماند." : "انتخاب ویترین اختیاری است."}
              </span>
            </div>

            {relationMode === "category" ? (
              <div className="flex flex-wrap gap-3">
                {sortedCategories.map((category) => {
                  const selected = relationCategoryIds.includes(category.id);
                  const isLastCategory = selected && relationCategoryIds.length <= 1;
                  return (
                    <CategoryOption
                      key={category.id}
                      label={category.title}
                      imageUrl={category.imageUrl}
                      selected={selected}
                      size="sm"
                      disabled={isLastCategory}
                      onClick={() => toggleRelationCategory(category.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sortedShowcases.length === 0 ? (
                  <div className="rounded-md border border-primary-border bg-primary-card p-3 text-sm text-secondary-text">
                    ویترینی وجود ندارد.
                  </div>
                ) : null}
                {sortedShowcases.map((showcase) => {
                  const selected = relationShowcaseIds.includes(showcase.id);
                  return (
                    <CustomButton
                      key={showcase.id}
                      border="base"
                      variant={selected ? "primary" : "neutral"}
                      unstyled={!selected}
                      className={!selected ? "border-primary-border bg-primary-card text-secondary-text" : undefined}
                      onClick={() => toggleRelationShowcase(showcase.id)}
                    >
                      {showcase.title || "ویترین بدون عنوان"}
                    </CustomButton>
                  );
                })}
              </div>
            )}

            <CustomButton
              border="base"
              fullWidth
              icon={<IoSaveOutline />}
              onClick={() => void submitRelationSelection()}
            >
              تایید
            </CustomButton>
          </div>
        ) : null}
      </CustomModal>

      <CustomModal
        open={false}
        onClose={() => setRelationProduct(null)}
        title={relationMode === "category" ? "دسته‌بندی‌های محصول" : "ویترین‌های محصول"}
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {relationProduct ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-bold text-primary-text">{relationProduct.title || "محصول بدون عنوان"}</div>
              <span className="text-xs text-secondary-text">
                {relationMode === "category" ? "حداقل یک دسته‌بندی الزامی است." : "انتخاب ویترین می‌تواند خالی باشد."}
              </span>
            </div>

            {relationMode === "category" ? (
              <div className="flex flex-wrap gap-3">
                {sortedCategories.map((category) => {
                  const selected = relationProduct.categoryIds.includes(category.id);
                  const isLastCategory = selected && relationProduct.categoryIds.length <= 1;
                  return (
                    <CategoryOption
                      key={category.id}
                      label={category.title}
                      imageUrl={category.imageUrl}
                      selected={selected}
                      size="sm"
                      disabled={isLastCategory}
                      onClick={() => void toggleCategoryProduct(category, relationProduct)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sortedShowcases.length === 0 ? (
                  <div className="rounded-md border border-primary-border bg-primary-card p-3 text-sm text-secondary-text">
                    ویترینی وجود ندارد.
                  </div>
                ) : null}
                {sortedShowcases.map((showcase) => {
                  const selected = relationProduct.showcaseIds.includes(showcase.id);
                  return (
                    <CustomButton
                      key={showcase.id}
                      border="base"
                      variant={selected ? "primary" : "neutral"}
                      onClick={() => void toggleShowcaseProduct(showcase, relationProduct)}
                    >
                      {showcase.title || showcase.id}
                    </CustomButton>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </CustomModal>

      <CustomModal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage("")}
        title="تصویر محصول"
        closeText="بستن"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-md bg-primary-base">
          {previewImage && (
            <img
              src={previewImage}
              alt="پیش‌نمایش تصویر محصول"
              className="max-h-[75vh] w-full object-contain"
            />
          )}
        </div>
      </CustomModal>
    </section>
  );
}
