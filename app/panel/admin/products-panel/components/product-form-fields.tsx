"use client";
import { useState, type ReactNode } from "react";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { ColorStockDots, colorLabel as productColorLabel } from "@/app/design-system/components/ui/color-stock-dots";
import { CustomSelectionOption as SelectableOption, CustomSelectionSummary as SelectionSummary } from "@/app/design-system/components/ui/selection";
import { PRODUCT_COLOR_OPTIONS } from "../constants";
import type { BrandForm, CategoryForm, ProductForm, ShowcaseForm } from "../types";
import { normalizeColorStock } from "../utils";
function normalizeStockCount(count: number) {
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}
type InventoryControlsProps = {
  product: ProductForm;
  onChange: (patch: Partial<ProductForm>) => void;
};
export function InventoryControls({ product, onChange }: InventoryControlsProps) {
  const colorStock = normalizeColorStock(product.colorStock);
  const [selectedColor, setSelectedColor] = useState<string>(PRODUCT_COLOR_OPTIONS[0]);
  const totalStock = Math.max(0, Math.round(Number(product.stockQuantity ?? 0)));
  const assignedStock = PRODUCT_COLOR_OPTIONS.reduce((sum, color) => sum + Number(colorStock[color] ?? 0), 0);
  const stockMatchesTotal = assignedStock === totalStock;
  const selectedCount = Number(colorStock[selectedColor] ?? 0);
  const updateColorStock = (color: string, count: number) => {
    onChange({
      colorStock: {
        ...colorStock,
        [color]: normalizeStockCount(count),
      },
    });
  };
  return (
    <div
      data-invalid={!stockMatchesTotal ? "true" : undefined}
      className={`flex flex-col gap-2 rounded-lg border bg-primary-card p-2 ${
        stockMatchesTotal ? "border-primary-border" : "border-danger-border"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-primary-text">موجودی</div>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            stockMatchesTotal ? "border-primary-border text-secondary-text" : "border-danger-border text-danger-text"
          }`}>
            {assignedStock}/{totalStock}
          </span>
        </div>
        <div className="flex w-28 shrink-0">
          <CustomInput
            type="number"
            min={0}
            step={1}
            size="sm"
            value={product.stockQuantity}
            placeholder="موجودی کل"
            aria-label="موجودی کل"
            className="h-8 py-1 text-xs"
            onChange={(event) => onChange({ stockQuantity: normalizeStockCount(Number(event.target.value)) })}
          />
        </div>
      </div>
      <div className="flex items-stretch gap-2 rounded-md border border-primary-border bg-primary-bg p-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <ColorStockDots value={Object.fromEntries(PRODUCT_COLOR_OPTIONS.map((color) => [color, colorStock[color] ?? 0]))} selectedColor={selectedColor} onSelect={setSelectedColor} size="md" />
        </div>
        <div className="flex w-24 shrink-0 flex-col gap-1">
          <span className="truncate text-[11px] font-bold text-primary-text">{productColorLabel(selectedColor)}</span>
          <CustomInput
            type="number"
            min={0}
            step={1}
            size="sm"
            value={selectedCount}
            placeholder="تعداد"
            aria-label={`تعداد موجودی رنگ ${productColorLabel(selectedColor)}`}
            className="h-8 py-1 text-xs"
            onChange={(event) => updateColorStock(selectedColor, Number(event.target.value))}
          />
        </div>
      </div>
      {!stockMatchesTotal ? (
        <span className="text-xs font-semibold text-danger-text">
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
  const [expandedSection, setExpandedSection] = useState<PlacementSectionId | "">("categories");
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
  const noBrandSelected = Boolean(product.brand) && !selectedBrand;
  const hasCategoryError = hasRequiredError(categoryErrorKey) && selectedCategoryIds.length === 0;
  const selectedCategoryLabels = selectedCategoryIds.map((id) => categories.find((category) => category.id === id)?.title || id);
  const selectedShowcaseLabels = selectedShowcaseIds.map((id) => showcases.find((showcase) => showcase.id === id)?.title || id);
  const selectedBrandLabels = product.brand ? [selectedBrand?.title || "بدون برند"] : [];
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
        <span className="text-[11px] font-semibold text-secondary-text">دسته‌بندی، ویترین و برند</span>
      </div>
      <SelectionGroup
        id="categories"
        title="دسته‌بندی"
        meta={`${selectedCategoryIds.length} انتخاب`}
        invalid={hasCategoryError}
        expanded={expandedSection === "categories"}
        selectedLabels={selectedCategoryLabels}
        role="group"
        onToggle={(nextOpen) => setExpandedSection(nextOpen ? "categories" : "")}
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
          <CustomEmptyState description="دسته‌بندی‌ای برای انتخاب وجود ندارد." size="sm" className="w-full" />
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
        onToggle={(nextOpen) => setExpandedSection(nextOpen ? "showcases" : "")}
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
          <CustomEmptyState description="ویترینی برای انتخاب وجود ندارد." size="sm" className="w-full" />
        )}
      </SelectionGroup>
      <SelectionGroup
        id="brand"
        title="برند"
        meta="تک انتخاب"
        expanded={expandedSection === "brand"}
        selectedLabels={selectedBrandLabels}
        role="radiogroup"
        onToggle={(nextOpen) => setExpandedSection(nextOpen ? "brand" : "")}
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
        <CustomInput value={product.manufactureYear} placeholder="سال تولید" onChange={(event) => onChange({ manufactureYear: event.target.value })} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <CustomInput
          value={product.weight}
          placeholder="وزن"
          inputMode="decimal"
          onChange={(event) => onChange({ weight: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <CustomInput
          value={product.length}
          placeholder="طول"
          inputMode="decimal"
          onChange={(event) => onChange({ length: event.target.value })}
        />
        <CustomInput
          value={product.width}
          placeholder="عرض"
          inputMode="decimal"
          onChange={(event) => onChange({ width: event.target.value })}
        />
        <CustomInput
          value={product.height}
          placeholder="ارتفاع"
          inputMode="decimal"
          onChange={(event) => onChange({ height: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <CustomInput
          value={product.sku}
          placeholder="کد کالا"
          onChange={(event) => onChange({ sku: event.target.value })}
        />
      </div>
      <span className="text-xs font-semibold text-secondary-text">
        کد اختیاری برای پیگیری محصول در انبار و سفارش‌ها.
      </span>
      <div className="flex flex-wrap gap-2">
        <CustomSwitch checked={product.isActive} onChange={(isActive) => onChange({ isActive, active: isActive })} label={product.isActive ? "فعال" : "مخفی"} size="sm" />
        <CustomSwitch checked={product.isFeatured} onChange={(isFeatured) => onChange({ isFeatured })} label={product.isFeatured ? "منتخب فروشگاه" : "عادی"} size="sm" />
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
  onToggle: (open: boolean) => void;
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
  const hasSelection = selectedLabels.some(Boolean);
  return (
    <CustomAccordion
      title={title}
      meta={meta}
      status={invalid ? "incomplete" : hasSelection ? "complete" : "optional"}
      invalid={invalid}
      open={expanded}
      showStatusLabel={false}
      onOpenChange={onToggle}
    >
      <SelectionSummary labels={selectedLabels} emptyLabel={emptyLabel} />
      <div id={`${id}-options`} className="flex max-h-44 flex-wrap items-stretch gap-1.5 overflow-y-auto pt-1" role={role} aria-label={title}>
        {children}
      </div>
    </CustomAccordion>
  );
}
