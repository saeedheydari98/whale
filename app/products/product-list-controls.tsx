"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FiDollarSign, FiSearch } from "react-icons/fi";
import { IoOptionsOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { formatAmount, numericTextValue as numericFilterValue, readPriceNumberWithFallback as readPriceNumber } from "@/lib/price-format";

export type ProductFilterState = {
  priceMin: string;
  priceMax: string;
  inStock: boolean;
  discounted: boolean;
  featured: boolean;
  minRating: string;
};

export const EMPTY_PRODUCT_FILTERS: ProductFilterState = {
  priceMin: "",
  priceMax: "",
  inStock: false,
  discounted: false,
  featured: false,
  minRating: "",
};

export const PRODUCT_SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی ترین" },
  { value: "cheapest", label: "ارزان ترین" },
  { value: "expensive", label: "گران ترین" },
  { value: "bestseller", label: "پرفروش ترین" },
  { value: "mostDiscounted", label: "بیشترین تخفیف" },
  { value: "topRated", label: "بالاترین امتیاز" },
];

const DEFAULT_PRICE_RANGE_MAX = 10_000_000;
const PRICE_RANGE_STEP = 50_000;
const PRICE_FILTER_COMMIT_DELAY_MS = 450;

export function productFilterParams(filters: ProductFilterState) {
  return {
    priceMin: numericFilterValue(filters.priceMin),
    priceMax: numericFilterValue(filters.priceMax),
    inStock: filters.inStock ? "true" : undefined,
    hasDiscount: filters.discounted ? "true" : undefined,
    isFeatured: filters.featured ? "true" : undefined,
    minRating: filters.minRating || undefined,
  };
}

export function hasProductFilters(filters: ProductFilterState) {
  return Boolean(
    filters.priceMin.trim()
    || filters.priceMax.trim()
    || filters.inStock
    || filters.discounted
    || filters.featured
    || filters.minRating
  );
}

function productFilterCount(filters: ProductFilterState) {
  return [
    filters.priceMin.trim() || filters.priceMax.trim(),
    filters.inStock,
    filters.discounted,
    filters.featured,
    filters.minRating,
  ].filter(Boolean).length;
}

type ProductFilterFieldsProps = {
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
};

function PriceRangeSlider({ filters, onChange }: Pick<ProductFilterFieldsProps, "filters" | "onChange">) {
  const latestFiltersRef = useRef(filters);
  const latestOnChangeRef = useRef(onChange);
  const commitTimerRef = useRef<number | null>(null);
  const [draftRange, setDraftRange] = useState(() => ({
    min: readPriceNumber(filters.priceMin, 0),
    max: readPriceNumber(filters.priceMax, DEFAULT_PRICE_RANGE_MAX),
  }));
  const rangeMax = Math.max(DEFAULT_PRICE_RANGE_MAX, draftRange.min, draftRange.max);
  const minValue = Math.min(draftRange.min, rangeMax);
  const maxValue = Math.max(minValue, Math.min(draftRange.max, rangeMax));
  const minPercent = (minValue / rangeMax) * 100;
  const maxPercent = (maxValue / rangeMax) * 100;

  latestFiltersRef.current = filters;
  latestOnChangeRef.current = onChange;

  useEffect(() => {
    if (commitTimerRef.current) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    setDraftRange({
      min: readPriceNumber(filters.priceMin, 0),
      max: readPriceNumber(filters.priceMax, DEFAULT_PRICE_RANGE_MAX),
    });
  }, [filters.priceMin, filters.priceMax]);

  useEffect(() => () => {
    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
  }, []);

  const commitRange = (nextMin: number, nextMax: number) => {
    const clampedMin = Math.max(0, Math.min(Math.round(nextMin), rangeMax));
    const clampedMax = Math.max(clampedMin, Math.min(Math.round(nextMax), rangeMax));
    setDraftRange({ min: clampedMin, max: clampedMax });

    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      latestOnChangeRef.current({
        ...latestFiltersRef.current,
        priceMin: clampedMin > 0 ? String(clampedMin) : "",
        priceMax: clampedMax < rangeMax ? String(clampedMax) : "",
      });
      commitTimerRef.current = null;
    }, PRICE_FILTER_COMMIT_DELAY_MS);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-primary-text">محدوده قیمت</div>
        <span className="text-xs font-semibold text-secondary-text">
          {formatAmount(minValue, { suffix: " تومان" })} تا {formatAmount(maxValue, { suffix: " تومان" })}
        </span>
      </div>
      <div
        className="relative flex h-10 items-center"
        dir="ltr"
        style={{
          "--range-start": `${minPercent}%`,
          "--range-end": `${maxPercent}%`,
        } as CSSProperties}
      >
        <div className="h-1 w-full rounded-full bg-primary-media" />
        <div className="absolute h-1 rounded-full bg-primary" style={{ left: "var(--range-start)", right: "calc(100% - var(--range-end))" }} />
        <input
          type="range"
          min={0}
          max={rangeMax}
          step={PRICE_RANGE_STEP}
          value={minValue}
          aria-label="حداقل قیمت"
          className="price-range-input"
          onChange={(event) => commitRange(Number(event.target.value), maxValue)}
        />
        <input
          type="range"
          min={0}
          max={rangeMax}
          step={PRICE_RANGE_STEP}
          value={maxValue}
          aria-label="حداکثر قیمت"
          className="price-range-input"
          onChange={(event) => commitRange(minValue, Number(event.target.value))}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-secondary-text" dir="ltr">
        <span dir="rtl">{formatAmount(0, { suffix: " تومان" })}</span>
        <span dir="rtl">{formatAmount(rangeMax, { suffix: " تومان" })}</span>
      </div>
    </div>
  );
}

type ToggleFilterKey = "inStock" | "discounted" | "featured";

const TOGGLE_FILTERS: Array<{ key: ToggleFilterKey; label: string }> = [
  { key: "inStock", label: "فقط موجودها" },
  { key: "discounted", label: "تخفیف‌دارها" },
  { key: "featured", label: "منتخب فروشگاه" },
];

function ProductFilterBar({ filters, onChange }: Pick<ProductFilterFieldsProps, "filters" | "onChange">) {
  const patchFilters = (patch: Partial<ProductFilterState>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-primary-border bg-primary-soft p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOGGLE_FILTERS.map((item) => {
          const active = filters[item.key];

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              className={`flex h-10 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-semibold transition hover:brightness-105 sm:text-sm ${
                active
                  ? "bg-primary text-primary-contrast shadow-sm"
                  : "bg-primary-card text-primary-text hover:bg-primary-bg hover:text-primary"
              }`}
              onClick={() => patchFilters({ [item.key]: !active })}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={filters.minRating === "4"}
          className={`flex h-10 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-semibold transition hover:brightness-105 sm:text-sm ${
            filters.minRating === "4"
              ? "bg-primary text-primary-contrast shadow-sm"
              : "bg-primary-card text-primary-text hover:bg-primary-bg hover:text-primary"
          }`}
          onClick={() => patchFilters({ minRating: filters.minRating === "4" ? "" : "4" })}
        >
          <span>محبوب‌ترین‌ها</span>
        </button>
      </div>
    </div>
  );
}

type ProductListShellProps = {
  title: string;
  count: number;
  headerLoading?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  filters: ProductFilterState;
  onFiltersChange: (filters: ProductFilterState) => void;
  topContent?: ReactNode;
  children: ReactNode;
};

export function ProductListShell({
  title,
  count,
  headerLoading = false,
  searchQuery,
  onSearchChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  topContent,
  children,
}: ProductListShellProps) {
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const activeFilterCount = productFilterCount(filters);
  const priceFilterActive = Boolean(filters.priceMin.trim() || filters.priceMax.trim());

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-20 -mx-4 flex flex-col border-b border-primary-border bg-primary-panel p-2 shadow-sm backdrop-blur md:p-3">
        <CustomAccordion
          title={activeFilterCount ? `فیلترها (${activeFilterCount})` : "فیلترها"}
          heading={(
            <div className="flex min-w-0 flex-col gap-0.5">
              <Loading loading="skeleton-item" isLoading={headerLoading}>
                <div className="truncate text-xl font-bold sm:text-2xl">{title || "محصولات"}</div>
              </Loading>
              <Loading loading="skeleton-item" isLoading={headerLoading}>
                <span className="text-[11px] font-semibold text-secondary-text sm:text-xs">{count} محصول</span>
              </Loading>
            </div>
          )}
          leading={<IoOptionsOutline aria-hidden="true" />}
          meta="جست‌وجو، مرتب‌سازی و فیلتر"
          defaultOpen={false}
          showStatusLabel={false}
          contentClassName="gap-3"
        >
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:min-w-56 sm:flex-1 lg:w-64 lg:flex-none">
              <CustomInput
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="جستجو..."
                aria-label="جست‌وجوی محصول"
                showLabel={false}
                fullWidth
                size="sm"
                rounded="full"
                icon={<FiSearch />}
                className="min-w-0 bg-primary-media text-sm"
                style={{ backgroundColor: "var(--primary-media)" }}
              />
            </div>
            <div className="flex min-w-0 items-end gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
                <span className="text-xs font-semibold text-secondary-text">مرتب کردن بر اساس</span>
                <CustomSelect
                  value={sort}
                  aria-label="مرتب کردن محصولات بر اساس"
                  onChange={(event) => onSortChange(event.target.value)}
                  fullWidth={false}
                  size="sm"
                  rounded="full"
                >
                  {PRODUCT_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CustomSelect>
              </label>
              <CustomButton
                type="button"
                size="sm"
                rounded="full"
                variant={priceFilterActive ? "primary" : "neutral"}
                icon={<FiDollarSign />}
                onClick={() => setPriceModalOpen(true)}
              >
                <span>قیمت</span>
              </CustomButton>
            </div>
          </div>
          <ProductFilterBar filters={filters} onChange={onFiltersChange} />
        </CustomAccordion>
      </div>

      {topContent}

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {children}
      </div>

      <CustomModal
        open={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        title="انتخاب محدوده قیمت"
        rounded="lg"
        shadow="lg"
      >
        <div className="flex flex-col gap-4">
          <PriceRangeSlider filters={filters} onChange={onFiltersChange} />
          <div className="flex flex-wrap justify-end gap-2">
            <CustomButton
              type="button"
              size="sm"
              variant="neutral"
              rounded="full"
              disabled={!priceFilterActive}
              onClick={() => onFiltersChange({ ...filters, priceMin: "", priceMax: "" })}
            >
              <span>پاک کردن قیمت</span>
            </CustomButton>
            <CustomButton type="button" size="sm" rounded="full" onClick={() => setPriceModalOpen(false)}>
              <span>نمایش محصولات</span>
            </CustomButton>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
