"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FiSearch } from "react-icons/fi";
import { IoOptionsOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";

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

const persianDigits: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function toLatinDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => persianDigits[digit] ?? digit);
}

function numericFilterValue(value: string) {
  const normalized = toLatinDigits(value).replace(/[^\d.]/g, "");
  return normalized || undefined;
}

const DEFAULT_PRICE_RANGE_MAX = 10_000_000;
const PRICE_RANGE_STEP = 50_000;
const PRICE_FILTER_COMMIT_DELAY_MS = 450;

function readPriceNumber(value: string, fallback: number) {
  const parsed = Number(numericFilterValue(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function formatPriceLabel(value: number) {
  return `${Math.round(value).toLocaleString("fa-IR")} تومان`;
}

export function productFilterParams(filters: ProductFilterState) {
  return {
    priceMin: numericFilterValue(filters.priceMin),
    priceMax: numericFilterValue(filters.priceMax),
    inStock: filters.inStock ? "true" : undefined,
    discounted: filters.discounted ? "1" : undefined,
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
    filters.priceMin.trim(),
    filters.priceMax.trim(),
    filters.inStock,
    filters.discounted,
    filters.featured,
    filters.minRating,
  ].filter(Boolean).length;
}

type ProductFilterFieldsProps = {
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
  onClose?: () => void;
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
          {formatPriceLabel(minValue)} تا {formatPriceLabel(maxValue)}
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
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-secondary-text">
        <span>{formatPriceLabel(0)}</span>
        <span>{formatPriceLabel(rangeMax)}</span>
      </div>
    </div>
  );
}

function ProductFilterFields({ filters, onChange, onClose }: ProductFilterFieldsProps) {
  const activeCount = productFilterCount(filters);
  const patchFilters = (patch: Partial<ProductFilterState>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-bold text-primary-text">فیلترها</div>
        <span className="text-xs font-semibold text-secondary-text">{activeCount} فیلتر فعال</span>
      </div>

      <div className="flex flex-col gap-3">
        <PriceRangeSlider filters={filters} onChange={onChange} />
        <div className="hidden">
        <CustomInput
          value={filters.priceMin}
          onChange={(event) => patchFilters({ priceMin: event.target.value })}
          label="حداقل قیمت"
          placeholder=" ۵۰۰۰۰۰"
          inputMode="numeric"
          rounded="full"
        />
        <CustomInput
          value={filters.priceMax}
          onChange={(event) => patchFilters({ priceMax: event.target.value })}
          label="حداکثر قیمت"
          placeholder=" ۳۰۰۰۰۰۰"
          inputMode="numeric"
          rounded="full"
        />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-secondary-text">حداقل امتیاز</span>
          <CustomSelect
            value={filters.minRating}
            onChange={(event) => patchFilters({ minRating: event.target.value })}
            aria-label="حداقل امتیاز"
            rounded="full"
          >
            <option value="">همه امتیازها</option>
            <option value="4">۴ ستاره به بالا</option>
            <option value="3">۳ ستاره به بالا</option>
          </CustomSelect>
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
        <CustomSwitch checked={filters.inStock} onChange={(inStock) => patchFilters({ inStock })} label="فقط موجودها" size="sm" />
        <CustomSwitch checked={filters.discounted} onChange={(discounted) => patchFilters({ discounted })} label="تخفیف دارها" size="sm" />
        <CustomSwitch checked={filters.featured} onChange={(featured) => patchFilters({ featured })} label="محصولات ویژه" size="sm" />
      </div>

      <div className="flex flex-wrap gap-2">
        <CustomButton
          size="sm"
          variant="neutral"
          rounded="full"
          disabled={!activeCount}
          onClick={() => onChange(EMPTY_PRODUCT_FILTERS)}
        >
          <span>پاک کردن فیلترها</span>
        </CustomButton>
        {onClose ? (
          <CustomButton size="sm" variant="primary" rounded="full" onClick={onClose}>
            <span>نمایش محصولات</span>
          </CustomButton>
        ) : null}
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
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const activeFilterCount = productFilterCount(filters);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-primary-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold">{headerLoading ? "..." : title}</div>
            <span className="text-xs font-semibold text-secondary-text">{count} محصول</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomInput
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="جستجو محصول ..."
              aria-label="جستجو محصول"
              showLabel={false}
              fullWidth={false}
              size="sm"
              rounded="full"
              icon={<FiSearch />}
              className="min-w-56 bg-primary-media text-sm"
              style={{ backgroundColor: "var(--primary-media)" }}
            />
            <CustomSelect
              value={sort}
              aria-label="مرتب سازی محصولات"
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
            <CustomButton
              type="button"
              size="sm"
              rounded="full"
              variant={activeFilterCount ? "accent" : "neutral"}
              icon={<IoOptionsOutline />}
              className="lg:hidden"
              onClick={() => setFilterModalOpen(true)}
            >
              <span>{activeFilterCount ? `فیلتر (${activeFilterCount})` : "فیلتر"}</span>
            </CustomButton>
          </div>
        </div>
      </div>

      {topContent}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="hidden shrink-0 lg:flex lg:w-1/4">
          <ProductFilterFields filters={filters} onChange={onFiltersChange} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:w-3/4">
          {children}
        </div>
      </div>

      <CustomModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="فیلتر محصولات"
        rounded="lg"
        shadow="lg"
      >
        <ProductFilterFields
          filters={filters}
          onChange={onFiltersChange}
          onClose={() => setFilterModalOpen(false)}
        />
      </CustomModal>
    </div>
  );
}
