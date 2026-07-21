"use client";

import { useState, type ReactNode } from "react";
import { IoCheckmarkSharp, IoChevronDown } from "react-icons/io5";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { getStockColorValue } from "@/app/design-system/components/ui/color-stock-dots";
import { PRODUCT_COLOR_OPTIONS, STOCK_OPTIONS } from "../constants";
import type { BrandForm, CategoryForm, ProductForm, ShowcaseForm } from "../types";
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
      className={`flex flex-col gap-2 rounded-lg border bg-primary-card p-2 ${
        stockMatchesTotal ? "border-primary-border" : "border-danger-border-nomode"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-primary-text">موجودی</div>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            stockMatchesTotal ? "border-primary-border text-secondary-text" : "border-danger-border-nomode text-danger-text-nomode"
          }`}>
            {assignedStock}/{totalStock}
          </span>
        </div>
        <div className="flex w-28 shrink-0">
          <CustomSelect
            size="sm"
            value={String(product.stockQuantity)}
            aria-label="موجودی کل"
            className="h-8 py-1 text-xs"
            onChange={(event) => onChange({ stockQuantity: Number(event.target.value) })}
          >
            {STOCK_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      <div className="flex items-stretch gap-2 rounded-md border border-primary-border bg-primary-bg p-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {PRODUCT_COLOR_OPTIONS.map((color) => {
            const count = Number(colorStock[color] ?? 0);
            const selected = color === selectedColor;
            return (
              <button
                key={color}
                type="button"
                aria-label={`${color} stock`}
                onClick={() => setSelectedColor(color)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[9px] font-bold tabular-nums transition hover:scale-105 ${
                  selected ? "border-primary text-primary-text ring-2 ring-primary-border" : "border-primary-border text-primary-text"
                }`}
                style={{ backgroundColor: getStockColorValue(color) }}
              >
                <span className="rounded-full bg-primary-base/85 px-1 leading-4">{count > 10 ? "+10" : count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex w-24 shrink-0 flex-col gap-1">
          <span className="truncate text-[11px] font-bold text-primary-text">{selectedColor}</span>
          <CustomSelect
            size="sm"
            value={String(selectedCount)}
            aria-label={`${selectedColor} stock quantity`}
            className="h-8 py-1 text-xs"
            onChange={(event) => updateColorStock(selectedColor, Number(event.target.value))}
          >
            {STOCK_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      {!stockMatchesTotal ? (
        <span className="text-xs font-semibold text-danger-text-nomode">
          مجموع رنگ‌ها باید با موجودی کل برابر باشد.
        </span>
      ) : null}
    </div>
  );
}

type ProductPlacementFieldsProps = {
  product: ProductForm;
  showcases: ShowcaseForm[];
  categories: CategoryForm[];
  brands: BrandForm[];
  onChange: (patch: Partial<ProductForm>) => void;
  hasRequiredError: (key: string) => boolean;
  categoryErrorKey: string;
};

type PlacementSectionId = "categories" | "showcases" | "brand";

export function ProductPlacementFields({
  product,
  showcases,
  categories,
  brands,
  onChange,
  hasRequiredError,
  categoryErrorKey,
}: ProductPlacementFieldsProps) {
  const [expandedSection, setExpandedSection] = useState<PlacementSectionId>("categories");
  const selectedCategoryIds = product.categoryIds.length > 0
    ? product.categoryIds
    : product.categoryId
      ? [product.categoryId]
      : [];
  const selectedShowcaseIds = product.showcaseIds.length > 0
    ? product.showcaseIds
    : product.showcaseId
      ? [product.showcaseId]
      : [];
  const selectedBrand = brands.find((brand) => product.brand === brand.id || product.brand === brand.title);
  const noBrandSelected = !selectedBrand;
  const hasCategoryError = hasRequiredError(categoryErrorKey) && selectedCategoryIds.length === 0;
  const selectedCategoryLabels = selectedCategoryIds.map((id) => categories.find((category) => category.id === id)?.title || id);
  const selectedShowcaseLabels = selectedShowcaseIds.map((id) => showcases.find((showcase) => showcase.id === id)?.title || id);
  const selectedBrandLabels = [selectedBrand?.title || "بدون برند"];

  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      if (selectedCategoryIds.length <= 1) return;
      const categoryIds = selectedCategoryIds.filter((id) => id !== categoryId);
      onChange({ categoryId: categoryIds[0] ?? "", categoryIds });
      return;
    }

    const categoryIds = [...selectedCategoryIds, categoryId];
    onChange({ categoryId: categoryIds[0] ?? categoryId, categoryIds });
  };

  const toggleShowcase = (showcaseId: string) => {
    const showcaseIds = selectedShowcaseIds.includes(showcaseId)
      ? selectedShowcaseIds.filter((id) => id !== showcaseId)
      : [...selectedShowcaseIds, showcaseId];
    onChange({ showcaseId: showcaseIds[0] ?? "", showcaseIds });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-primary-text">جایگاه محصول</div>
        <span className="text-[11px] font-semibold text-secondary-text">انتخاب‌های محصول</span>
      </div>

      <SelectionGroup
        id="categories"
        title="دسته‌بندی"
        meta={`${selectedCategoryIds.length} انتخاب`}
        invalid={hasCategoryError}
        expanded={expandedSection === "categories"}
        selectedLabels={selectedCategoryLabels}
        role="group"
        onToggle={() => setExpandedSection("categories")}
      >
        {categories.length > 0 ? (
          categories.map((category) => (
            <SelectableOption
              key={category.id}
              label={category.title || "دسته‌بندی بدون عنوان"}
              imageUrl={category.imageUrl}
              selected={selectedCategoryIds.includes(category.id)}
              role="checkbox"
              onClick={() => toggleCategory(category.id)}
            />
          ))
        ) : (
          <span className="text-xs text-secondary-text">دسته‌بندی‌ای تعریف نشده است.</span>
        )}
      </SelectionGroup>

      <SelectionGroup
        id="showcases"
        title="ویترین"
        meta={selectedShowcaseIds.length > 0 ? `${selectedShowcaseIds.length} انتخاب` : "اختیاری"}
        expanded={expandedSection === "showcases"}
        selectedLabels={selectedShowcaseLabels}
        emptyLabel="بدون ویترین"
        role="group"
        onToggle={() => setExpandedSection("showcases")}
      >
        {showcases.length > 0 ? (
          showcases.map((showcase) => (
            <SelectableOption
              key={showcase.id}
              label={showcase.title || "ویترین بدون عنوان"}
              selected={selectedShowcaseIds.includes(showcase.id)}
              role="checkbox"
              onClick={() => toggleShowcase(showcase.id)}
            />
          ))
        ) : (
          <span className="text-xs text-secondary-text">ویترینی تعریف نشده است.</span>
        )}
      </SelectionGroup>

      <SelectionGroup
        id="brand"
        title="برند"
        meta="تک انتخاب"
        expanded={expandedSection === "brand"}
        selectedLabels={selectedBrandLabels}
        role="radiogroup"
        onToggle={() => setExpandedSection("brand")}
      >
        <SelectableOption
          label="بدون برند"
          selected={noBrandSelected}
          role="radio"
          onClick={() => onChange({ brand: "" })}
        />
        {brands.map((brand) => (
          <SelectableOption
            key={brand.id}
            label={brand.title || "برند بدون عنوان"}
            imageUrl={brand.imageUrl}
            selected={selectedBrand?.id === brand.id}
            role="radio"
            onClick={() => onChange({ brand: brand.id })}
          />
        ))}
      </SelectionGroup>
    </div>
  );
}

type ProductAdvancedFieldsProps = {
  product: ProductForm;
  onChange: (patch: Partial<ProductForm>) => void;
};

export function ProductAdvancedFields({ product, onChange }: ProductAdvancedFieldsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
      <div className="text-sm font-bold text-primary-text">جزئیات محصول</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <CustomInput value={product.manufactureYear} placeholder="Manufacture year" onChange={(event) => onChange({ manufactureYear: event.target.value })} />
      </div>
      <CustomInput value={imageListToText(product.images)} placeholder="Gallery image URLs" onChange={(event) => onChange({ images: textToImageList(event.target.value) })} />
      <CustomInput value={product.videoUrl} placeholder="Video URL" onChange={(event) => onChange({ videoUrl: event.target.value })} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <CustomInput
          value={product.sku}
          label="SKU (کد یکتای کالا)"
          placeholder="Sku"
          onChange={(event) => onChange({ sku: event.target.value })}
        />
      </div>
      <span className="text-xs font-semibold text-secondary-text">
        SKU مخفف Stock Keeping Unit است؛ یک کد اختیاری و یکتا برای شناسایی محصول در انبار و سفارش‌ها.
      </span>
      <div className="flex flex-wrap gap-2">
        <CustomSwitch checked={product.isActive} onChange={(isActive) => onChange({ isActive, active: isActive })} label={product.isActive ? "فعال" : "مخفی"} size="sm" />
        <CustomSwitch checked={product.isFeatured} onChange={(isFeatured) => onChange({ isFeatured })} label={product.isFeatured ? "ویژه" : "عادی"} size="sm" />
        <CustomSwitch checked={product.isAvailable} onChange={(isAvailable) => onChange({ isAvailable })} label={product.isAvailable ? "موجود" : "ناموجود"} size="sm" />
      </div>
    </div>
  );
}

type SelectionGroupProps = {
  id: PlacementSectionId;
  title: string;
  meta: string;
  invalid?: boolean;
  expanded: boolean;
  selectedLabels: string[];
  emptyLabel?: string;
  role: "group" | "radiogroup";
  onToggle: () => void;
  children: ReactNode;
};

function SelectionGroup({
  id,
  title,
  meta,
  invalid = false,
  expanded,
  selectedLabels,
  emptyLabel = "انتخاب نشده",
  role,
  onToggle,
  children,
}: SelectionGroupProps) {
  return (
    <div
      data-invalid={invalid ? "true" : undefined}
      className={`flex flex-col gap-2 border-t pt-2 ${
        invalid ? "border-danger-border-nomode" : "border-primary-border"
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-options`}
        onClick={onToggle}
        className="flex items-center justify-between gap-2 rounded-md bg-transparent py-1 text-start transition hover:bg-primary-bg"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-xs font-bold text-primary-text">{title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${invalid ? "bg-primary-bg text-danger-text-nomode" : "bg-primary-bg text-secondary-text"}`}>
            {meta}
          </span>
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary-border text-sm text-primary-text transition ${
          expanded ? "rotate-180 bg-primary-soft" : "bg-primary-card"
        }`}>
          <IoChevronDown aria-hidden="true" />
        </span>
      </button>
      <SelectionSummary labels={selectedLabels} emptyLabel={emptyLabel} />
      {expanded ? (
        <div id={`${id}-options`} className="flex max-h-44 flex-wrap items-stretch gap-1.5 overflow-y-auto pt-1" role={role} aria-label={title}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function SelectionSummary({ labels, emptyLabel }: { labels: string[]; emptyLabel: string }) {
  const visibleLabels = labels.filter(Boolean).slice(0, 3);
  const hiddenCount = Math.max(0, labels.filter(Boolean).length - visibleLabels.length);

  return (
    <div className="flex min-h-7 flex-wrap items-center gap-1.5">
      {visibleLabels.length > 0 ? (
        visibleLabels.map((label) => (
          <span key={label} className="max-w-36 truncate rounded-full bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary-text">
            {label}
          </span>
        ))
      ) : (
        <span className="rounded-full border border-dashed border-primary-border px-2 py-1 text-[11px] font-semibold text-secondary-text">
          {emptyLabel}
        </span>
      )}
      {hiddenCount > 0 ? (
        <span className="rounded-full bg-primary text-[11px] font-bold text-primary-contrast px-2 py-1">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

type SelectableOptionProps = {
  label: string;
  imageUrl?: string;
  selected: boolean;
  role: "checkbox" | "radio";
  onClick: () => void;
};

function SelectableOption({ label, imageUrl, selected, role, onClick }: SelectableOptionProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`flex min-h-8 items-center gap-1.5 rounded-md border p-1.5 text-start transition-all duration-150 ${
        selected
          ? "min-w-32 flex-[1_1_9rem] border-primary bg-primary-soft text-primary-text shadow-sm"
          : "min-w-24 flex-[0_1_7rem] border-primary-border bg-primary-bg text-secondary-text hover:bg-primary-soft"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
          selected ? "border-primary bg-primary text-primary-contrast" : "border-primary-border bg-primary-card"
        }`}
      >
        {selected ? <IoCheckmarkSharp aria-hidden="true" /> : null}
      </span>
      {imageUrl ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary-border bg-primary-media">
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{label}</span>
    </button>
  );
}
