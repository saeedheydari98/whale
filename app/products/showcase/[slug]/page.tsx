"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import { normalizeColorStock, sortProductsBy, type ProductRecord } from "@/lib/products-client";
import { addProductToCart } from "@/lib/cart-client";
import { FiExternalLink, FiSearch, FiSliders, FiX } from "react-icons/fi";
import { IoBagAddOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import ProductRatingSummary from "@/app/design-system/components/ui/product-rating-summary";
import { BannerCarousel } from "../../product-showcase/banner-carousel";

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
  { value: "bestseller", label: "پرفروش‌ترین" },
  { value: "mostDiscounted", label: "بیشترین تخفیف" },
];

const LOADING_PRODUCTS = [
  {
    id: "loading-product-1",
    title: "عنوان محصول",
    price: "1299",
    description: "توضیح کوتاه محصول",
  },
  {
    id: "loading-product-2",
    title: "محصول نمونه دیگر",
    price: "899",
    description: "توضیح محصول برای پیش‌نمایش",
  },
  {
    id: "loading-product-3",
    title: "محصول ویژه فروشگاه",
    price: "2499",
    description: "توضیح کوتاه محصول ویژه",
  },
];

export default function ShowcasePage() {
  const params = useParams();
  const rawSlug = params?.slug ?? params?.id ?? "";
  const showcaseId = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const { getShowcaseById, banners, loading } = useProductsCatalog();
  const showcase = useMemo(() => getShowcaseById(showcaseId), [getShowcaseById, showcaseId]);
  const products = showcase?.products ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [onlyActive, setOnlyActive] = useState(true);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [yearMin, setYearMin] = useState<string>("");
  const [yearMax, setYearMax] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [sort, setSort] = useState("newest");
  const [cartMessage, setCartMessage] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  const parsePrice = (value: any) => {
    try {
      const normalized = String(value || "").replace(/[^\d.]/g, "");
      return normalized ? Number(normalized) : NaN;
    } catch {
      return NaN;
    }
  };

  const priceBounds = useMemo(() => {
    const prices = (products || [])
      .map((product: any) => {
        const discounted = parsePrice(product.discountPrice);
        return Number.isFinite(discounted) ? discounted : parsePrice(product.price);
      })
      .filter((price) => Number.isFinite(price));

    if (prices.length === 0) {
      return { min: 0, max: 1000 };
    }

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set((products || []).map((p: any) => String(p.categoryId || "")).filter(Boolean))
      ),
    [products]
  );

  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set((products || []).map((p: any) => String(p.type || p.productType || "")).filter(Boolean))
      ),
    [products]
  );

  const selectedPriceMin = priceMin ? Number(priceMin) : priceBounds.min;
  const selectedPriceMax = priceMax ? Number(priceMax) : priceBounds.max;
  const rangeSpan = Math.max(priceBounds.max - priceBounds.min, 1);
  const minPercent = ((selectedPriceMin - priceBounds.min) / rangeSpan) * 100;
  const maxPercent = ((selectedPriceMax - priceBounds.min) / rangeSpan) * 100;

  const filteredProducts = useMemo(() => {
    const q = String(searchQuery ?? "").trim();
    return (products || []).filter((product: any) => {
      if (onlyActive && product.active === false) return false;
      if (onlyDiscounted) {
        const discountPercent = Number(product.discountPercent || 0);
        if (!(discountPercent > 0 || String(product.discountPrice || "").trim())) return false;
      }
      if (q) {
        const searchable = [
          product.title,
          product.description,
          product.badge,
          product.categoryId,
          product.type,
          product.productType,
        ].join(" ").toLowerCase();
        if (!searchable.includes(q.toLowerCase())) return false;
      }
      const price = Number.isFinite(parsePrice(product.discountPrice))
        ? parsePrice(product.discountPrice)
        : parsePrice(product.price);
      if (priceMin && Number.isFinite(price) && price < Number(priceMin)) return false;
      if (priceMax && Number.isFinite(price) && price > Number(priceMax)) return false;
      if (yearMin && Number(product.manufactureYear) < Number(yearMin)) return false;
      if (yearMax && Number(product.manufactureYear) > Number(yearMax)) return false;
      if (selectedCategory && String(product.categoryId || "") !== selectedCategory) return false;
      if (selectedType && String(product.type || product.productType || "") !== selectedType) return false;
      return true;
    });
  }, [onlyActive, onlyDiscounted, priceMax, priceMin, products, searchQuery, selectedCategory, selectedType, yearMax, yearMin]);
  const sortedFilteredProducts = useMemo(
    () => sortProductsBy(filteredProducts, sort),
    [filteredProducts, sort]
  );
  const showcaseBanners = useMemo(
    () =>
      banners
        .filter((banner) =>
          banner.active !== false
          && banner.showOnShowcase === true
          && String(banner.showcaseId ?? "") === String(showcase?.id ?? showcaseId)
        )
        .sort((a, b) => Number(a.showcaseSortOrder ?? a.sortOrder ?? 0) - Number(b.showcaseSortOrder ?? b.sortOrder ?? 0)),
    [banners, showcase?.id, showcaseId]
  );

  const addToCart = async (product: ProductRecord) => {
    if (Number(product.stockQuantity ?? 0) <= 0) {
      setCartMessage(`${product.title} ناموجود است.`);
      window.setTimeout(() => setCartMessage(""), 1800);
      return;
    }
    const colorStock = normalizeColorStock(product.colorStock);
    const selectedColor = Object.entries(colorStock).find(([, count]) => count > 0)?.[0] ?? "";
    await addProductToCart(product, 1, selectedColor);
    setCartMessage(`${product.title} به سبد خرید اضافه شد.`);
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  if (loading && !showcase) {
    return (
      <main className="min-h-screen bg-primary-base text-primary-text">
        <div className="p-4 w-full">
          <div className="flex items-center justify-between">
            <Loading loading="skeleton-item" isLoading>
              <div className="text-2xl font-bold">عنوان ویترین</div>
            </Loading>
          </div>
          <div className="mt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {LOADING_PRODUCTS.map((product) => (
                <div key={product.id} className="rounded-md border border-border-default p-3 bg-primary-card">
                  <div className="flex gap-3">
                    <Loading loading="skeleton-item" isLoading>
                      <div className="w-24 h-24 overflow-hidden rounded bg-primary-media" />
                    </Loading>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex flex-col h-full">
                        <Loading loading="skeleton-item" isLoading>
                          <div className="text-sm font-bold">{product.title}</div>
                        </Loading>
                        <Loading loading="skeleton-item" isLoading>
                          <div className="text-primary text-sm font-bold">{product.price}$</div>
                        </Loading>
                        <Loading loading="skeleton-item" isLoading>
                          <div className="text-xs text-secondary-text line-clamp-2">
                            {product.description}
                          </div>
                        </Loading>
                      </div>
                      <div className=" flex gap-2">
                        <Loading loading="skeleton-item" isLoading className="w-full">
                          <ProductLink productId={product.id ?? product.title} productTitle={product.title} className="w-full" iconAfter={<FiExternalLink />}>مشاهده</ProductLink>
                        </Loading>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="p-4 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Loading loading="skeleton-item" isLoading={loading}>
          <div className="text-2xl font-bold">{showcase?.title || `ویترین: ${showcaseId}`}</div>
        </Loading>

        <div className="w-full sm:w-auto">
          {/* Desktop: show input; Mobile: toggleable */}
          <div className="hidden w-80 max-w-full items-center gap-2 sm:flex">
            <CustomInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setSearchQuery(event.currentTarget.value.trim());
                }
              }}
              placeholder="جست‌وجو بین محصولات..."
              size="sm"
              rounded="full"
              border="base"
              icon={<FiSearch />}
              className="bg-primary-media text-sm"
              style={{ backgroundColor: "var(--primary-media)" }}
            />
          </div>
          <div className="flex sm:hidden items-center gap-2">
            {showMobileSearch ? (
              <CustomInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setSearchQuery(event.currentTarget.value.trim());
                  }
                }}
                placeholder="جست‌وجو..."
                size="sm"
                rounded="full"
                border="base"
                icon={<FiSearch />}
                className="bg-primary-media text-sm"
                style={{ backgroundColor: "var(--primary-media)" }}
              />
            ) : (
              <CustomButton size="sm" variant="neutral" icon={<FiSearch />} onClick={() => setShowMobileSearch(true)}>جست‌وجو</CustomButton>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CustomSelect value={sort} aria-label="مرتب‌سازی محصولات ویترین" onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CustomSelect>
          <CustomButton size="sm" variant="secondary" icon={<FiSliders />} onClick={() => setShowFilterModal(true)}>فیلتر</CustomButton>
        </div>
      </div>

      {showcase?.description ? (
        <Loading loading="skeleton-item" isLoading={loading}>
          <div className="mt-2 text-sm text-secondary-text">{showcase.description}</div>
        </Loading>
      ) : null}

      {cartMessage ? (
        <div className="mt-3 rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
          {cartMessage}
        </div>
      ) : null}

      <div className="mt-4 flex gap-4">
        <main className="flex-1">
          {showcaseBanners.length > 0 ? (
            <div className="mb-4 flex flex-col gap-4">
              {showcaseBanners.map((banner) => (
                <BannerCarousel
                  key={banner.id}
                  banner={{
                    id: banner.id,
                    title: banner.title ?? "",
                    showcaseId: banner.showcaseId,
                    imageUrls: banner.imageUrls ?? [],
                    active: banner.active !== false,
                    showOnHome: banner.showOnHome,
                    showOnShowcase: banner.showOnShowcase,
                    intervalSeconds: banner.intervalSeconds,
                    heightPercent: banner.heightPercent,
                    homeSortOrder: banner.homeSortOrder,
                    showcaseSortOrder: banner.showcaseSortOrder,
                    sortOrder: Number(banner.showcaseSortOrder ?? banner.sortOrder ?? 0),
                  }}
                  onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")}
                />
              ))}
            </div>
          ) : null}
          {sortedFilteredProducts.length === 0 ? (
            <div className="text-sm text-secondary-text">محصولی برای این ویترین پیدا نشد.</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,220px))] gap-3">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,220px))] gap-3">
                {sortedFilteredProducts.map((product) => (
                  <div key={product.id} className="max-w-55 rounded-md border border-primary-border bg-primary-card p-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <div className="h-18 w-18 shrink-0 overflow-hidden rounded bg-primary-media">
                          <Loading loading="skeleton-item" isLoading={loading} className="h-full w-full">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="p-2 text-sm">بدون تصویر</div>
                            )}
                          </Loading>
                        </div>
                        <div className="flex-1 flex flex-col">
                          <Loading loading="skeleton-item" isLoading={loading}>
                            <div className="line-clamp-1 text-xs font-bold">{product.title}</div>
                          </Loading>
                          <Loading loading="skeleton-item" isLoading={loading}>
                            <div className="text-primary text-xs font-bold">{product.price}$</div>
                          </Loading>
                          <Loading loading="skeleton-item" isLoading={loading}>
                            <div className="text-xs text-secondary-text line-clamp-2">{product.description}</div>
                          </Loading>
                          <ProductRatingSummary
                            average={product.ratingAverage}
                            count={product.ratingCount}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-primary-border pt-2">
                        <Loading loading="skeleton-item" isLoading={loading} className="w-full">
                          <CustomButton
                            type="button"
                            variant="success"
                            border="base"
                            size="sm"
                            fullWidth
                            className="flex-1"
                            icon={<IoBagAddOutline />}
                            onClick={() => void addToCart(product)}
                          >
                            افزودن
                          </CustomButton>
                        </Loading>
                        <Loading loading="skeleton-item" isLoading={loading} className="w-full">
                          <ProductLink productId={product.id ?? product.title} productTitle={product.title} className="flex-1" iconAfter={<FiExternalLink />}>مشاهده</ProductLink>
                        </Loading>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Filters are only available via the Filter button (modal). Desktop panel removed per design. */}
      </div>

      {/* Filter drawer */}
      {showFilterModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:items-stretch sm:justify-end sm:p-0">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setShowFilterModal(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-lg border border-primary-border bg-primary-card p-4 text-primary-text shadow-xl sm:h-full sm:max-h-none sm:w-11/12 sm:max-w-md sm:rounded-none sm:border-y-0 sm:border-r-0">
            <div className="flex items-center justify-between gap-3 border-b border-primary-border pb-4">
              <div className="flex flex-col gap-1">
                <div className="text-lg font-bold">فیلترها</div>
                <div className="text-xs font-semibold text-secondary-text">نتایج این ویترین را دقیق‌تر کنید</div>
              </div>
              <CustomButton size="sm" variant="neutral" icon={<FiX />} onClick={() => setShowFilterModal(false)}>بستن</CustomButton>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyActive((current) => !current)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${onlyActive
                      ? "border-primary bg-primary text-primary-text"
                      : "border-primary-border bg-primary-soft text-secondary-text"
                    }`}
                >
                  <span>فقط فعال‌ها</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyDiscounted((current) => !current)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${onlyDiscounted
                      ? "border-danger-border-nomode bg-danger-bg-nomode text-danger-text-nomode"
                      : "border-primary-border bg-primary-soft text-secondary-text"
                    }`}
                >
                  <span>تخفیف‌دارها</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold">بازه قیمت</div>
                  <div className="text-xs font-semibold text-primary">
                    ${selectedPriceMin.toLocaleString("en-US")} - ${selectedPriceMax.toLocaleString("en-US")}
                  </div>
                </div>
                <div className="relative h-10">
                  <div
                    className="absolute top-4 h-2 w-full rounded-full bg-primary-bg"
                    style={{
                      background: `linear-gradient(to right, var(--primary-bg) 0%, var(--primary-bg) ${minPercent}%, var(--primary) ${minPercent}%, var(--primary) ${maxPercent}%, var(--primary-bg) ${maxPercent}%, var(--primary-bg) 100%)`,
                    }}
                  />
                  <input
                    type="range"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    value={selectedPriceMin}
                    onChange={(event) => {
                      const next = Math.min(Number(event.target.value), selectedPriceMax);
                      setPriceMin(String(next));
                    }}
                    className="absolute top-1 h-8 w-full cursor-pointer appearance-none bg-transparent accent-primary"
                    aria-label="حداقل قیمت"
                  />
                  <input
                    type="range"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    value={selectedPriceMax}
                    onChange={(event) => {
                      const next = Math.max(Number(event.target.value), selectedPriceMin);
                      setPriceMax(String(next));
                    }}
                    className="absolute top-1 h-8 w-full cursor-pointer appearance-none bg-transparent accent-primary"
                    aria-label="حداکثر قیمت"
                  />
                </div>
                <div className="flex gap-2">
                  <CustomInput value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="حداقل" size="sm" />
                  <CustomInput value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="حداکثر" size="sm" />
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-primary-border bg-primary-soft p-3">
                <div className="text-sm font-bold">بازه سال تولید</div>
                <div className="flex gap-2">
                  <CustomInput value={yearMin} onChange={(e) => setYearMin(e.target.value)} placeholder="از" size="sm" />
                  <CustomInput value={yearMax} onChange={(e) => setYearMax(e.target.value)} placeholder="تا" size="sm" />
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-primary-border bg-primary-soft p-3">
                <div className="text-sm font-bold">دسته‌بندی</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!selectedCategory ? "border-primary bg-primary text-primary-text" : "border-primary-border bg-primary-card text-secondary-text"
                      }`}
                  >
                    <span>همه</span>
                  </button>
                  {categoryOptions.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(String(cat))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedCategory === cat ? "border-primary bg-primary text-primary-text" : "border-primary-border bg-primary-card text-secondary-text"
                        }`}
                    >
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-primary-border bg-primary-soft p-3">
                <div className="text-sm font-bold">نوع محصول</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedType("")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!selectedType ? "border-primary bg-primary text-primary-text" : "border-primary-border bg-primary-card text-secondary-text"
                      }`}
                  >
                    <span>همه</span>
                  </button>
                  {typeOptions.map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setSelectedType(String(type))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedType === type ? "border-primary bg-primary text-primary-text" : "border-primary-border bg-primary-card text-secondary-text"
                        }`}
                    >
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 border-t border-primary-border pt-3">
                <CustomButton size="sm" variant="primary" onClick={() => setShowFilterModal(false)}>اعمال</CustomButton>
                <CustomButton size="sm" variant="neutral" onClick={() => {
                  setPriceMin(""); setPriceMax(""); setYearMin(""); setYearMax(""); setSelectedCategory(""); setSelectedType(""); setOnlyDiscounted(false); setOnlyActive(true); setShowFilterModal(false);
                }}>پاک کردن</CustomButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {previewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 p-4 backdrop-blur-sm" onClick={() => setPreviewImage("")}>
          <div className="flex max-h-[75vh] w-full max-w-3xl items-center justify-center overflow-hidden rounded-lg border border-primary-border bg-primary-card p-2 shadow-xl">
            <img
              src={previewImage}
              alt="پیش‌نمایش بنر"
              className="max-h-[72vh] w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
