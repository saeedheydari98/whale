"use client";

import { useState } from "react";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { getStockColorValue } from "@/app/design-system/components/ui/color-stock-dots";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import { PRODUCT_COLOR_OPTIONS, STOCK_OPTIONS } from "../constants";
import type { BrandForm, CategoryForm, ProductForm } from "../types";
import { imageListToText, normalizeColorStock, textToImageList } from "../utils";

type InventoryControlsProps = {
  product: ProductForm;
  onChange: (patch: Partial<ProductForm>) => void;
};

export function InventoryControls({ product, onChange }: InventoryControlsProps) {
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
  brands: BrandForm[];
  onChange: (patch: Partial<ProductForm>) => void;
  hasRequiredError: (key: string) => boolean;
  categoryErrorKey: string;
};

export function ProductAdvancedFields({ product, categories, brands, onChange, hasRequiredError, categoryErrorKey }: ProductAdvancedFieldsProps) {
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
      <div className="flex flex-col gap-2">
        <RequiredLabel className="text-primary-text">برند</RequiredLabel>
        <div className="flex flex-wrap gap-3 rounded-md border border-primary-border p-2">
          <CategoryOption
            label="بدون برند"
            selected={!product.brand}
            size="sm"
            onClick={() => onChange({ brand: "" })}
          />
          {brands.length === 0 ? (
            <span className="text-xs text-secondary-text">ابتدا از بخش برندها، برند تعریف کنید.</span>
          ) : null}
          {brands.map((brand) => (
            <CategoryOption
              key={brand.id}
              label={brand.title}
              imageUrl={brand.imageUrl}
              selected={product.brand === brand.id || product.brand === brand.title}
              size="sm"
              onClick={() => onChange({ brand: brand.id })}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
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
