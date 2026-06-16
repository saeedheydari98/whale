"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import { FiExternalLink, FiSearch, FiSliders, FiX } from "react-icons/fi";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { getProducts } from "@/lib/products-client";
import { matchesSearchQuery } from "@/lib/product-search";

const LOADING_PRODUCTS = [
  {
    id: "loading-product-1",
    title: "Product title placeholder",
    price: "1299",
    description: "Short product description for loading layout",
  },
  {
    id: "loading-product-2",
    title: "Another product item",
    price: "899",
    description: "Second product description for sizing",
  },
  {
    id: "loading-product-3",
    title: "Premium catalog item",
    price: "2499",
    description: "Third product description for sizing",
  },
];

export default function ShowcasePage() {
  const params = useParams();
  const showcaseId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const { getShowcaseById, loading } = useProductsCatalog();
  const showcase = useMemo(() => getShowcaseById(showcaseId), [getShowcaseById, showcaseId]);
  const products = showcase?.products ?? [];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [onlyActive, setOnlyActive] = useState(true);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[] | null>(null);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [yearMin, setYearMin] = useState<string>("");
  const [yearMax, setYearMax] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

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
        new Set((products || []).map((p: any) => String(p.category || p.typeCategory || "")).filter(Boolean))
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

  // When a global search query is entered, fetch all products and filter across showcases
  useEffect(() => {
    let cancelled = false;
    const q = String(searchQuery ?? "").trim();
    if (!q) {
      setGlobalSearchResults(null);
      return;
    }

    (async () => {
      try {
        const data = await getProducts({ all: true });
        const list = data.products || [];
        const filtered = list.filter((product) => matchesSearchQuery(product, q));
        if (!cancelled) setGlobalSearchResults(filtered);
      } catch {
        if (!cancelled) setGlobalSearchResults([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  // Apply local filters on current product list or global search results
  const filteredProducts = (globalSearchResults ?? products).filter((p: any) => {
    if (onlyActive && p.active === false) return false;
    if (onlyDiscounted) {
      const percent = Number(p.discountPercent || 0);
      if (!(percent > 0 || (p.discountPrice && String(p.discountPrice).trim()))) return false;
    }
    const pPrice = Number.isFinite(parsePrice(p.discountPrice)) ? parsePrice(p.discountPrice) : parsePrice(p.price);
    const min = Number.isFinite(Number(parsePrice(priceMin))) ? Number(parsePrice(priceMin)) : NaN;
    const max = Number.isFinite(Number(parsePrice(priceMax))) ? Number(parsePrice(priceMax)) : NaN;
    if (!Number.isNaN(min) && !Number.isNaN(pPrice) && pPrice < min) return false;
    if (!Number.isNaN(max) && !Number.isNaN(pPrice) && pPrice > max) return false;

    // Year range filter (support multiple possible field names)
    const getYear = (prod: any) => {
      const candidates = [prod.year, prod.manufactureYear, prod.madeYear, prod.releaseYear];
      for (const c of candidates) {
        const n = Number(String(c || "").replace(/[^\d-]/g, ""));
        if (Number.isFinite(n) && n > 0) return n;
      }
      return NaN;
    };

    const py = getYear(p);
    const yMin = Number(String(yearMin || "").replace(/[^\d]/g, ""));
    const yMax = Number(String(yearMax || "").replace(/[^\d]/g, ""));
    if (!Number.isNaN(yMin) && !Number.isNaN(py) && py < yMin) return false;
    if (!Number.isNaN(yMax) && !Number.isNaN(py) && py > yMax) return false;

    // Category and type filters (optional fields)
    if (selectedCategory && String(p.category || p.typeCategory || "").toLowerCase() !== selectedCategory.toLowerCase()) return false;
    if (selectedType && String(p.type || p.productType || "").toLowerCase() !== selectedType.toLowerCase()) return false;

    return true;
  });

  if (loading && !showcase) {
    return (
      <main className="min-h-screen bg-bg-base text-primary-text">
        <div className="p-4 w-full">
          <div className="flex items-center justify-between">
            <Loading loading="skeleton-item" isLoading>
              <div className="text-2xl font-bold">Showcase title placeholder</div>
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
                          {(() => {
                            const viewHref = `/products/${product.id}`;
                            const handleClick = async (e: React.MouseEvent) => {
                              e.preventDefault();
                              try { await fetch(`/api/products?id=${encodeURIComponent(String(product.id))}`, { method: "GET" }); } catch {}
                              router.push(viewHref);
                            };
                            return (
                              <CustomButton href={viewHref} onClick={handleClick} className="w-full" variant="primary" size="sm" rounded="md" iconAfter={<FiExternalLink />}>View</CustomButton>
                            );
                          })()}
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
        <div className="text-2xl font-bold">{showcase?.title || `Showcase: ${showcaseId}`}</div>

        <div className="w-full sm:w-auto">
          {/* Desktop: show input; Mobile: toggleable */}
          <div className="hidden w-80 max-w-full items-center gap-2 sm:flex">
            <CustomInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all products..."
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
                placeholder="Search..."
                size="sm"
                rounded="full"
                border="base"
                icon={<FiSearch />}
                className="bg-primary-media text-sm"
                style={{ backgroundColor: "var(--primary-media)" }}
              />
            ) : (
              <CustomButton size="sm" variant="neutral" icon={<FiSearch />} onClick={() => setShowMobileSearch(true)}>Search</CustomButton>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CustomButton size="sm" variant="secondary" icon={<FiSliders />} onClick={() => setShowFilterModal(true)}>Filter</CustomButton>
        </div>
      </div>

      {showcase?.description ? (
        <div className="mt-2 text-sm text-secondary-text">{showcase.description}</div>
      ) : null}

      <div className="mt-4 flex gap-4">
        <main className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="text-sm text-secondary-text">No products found for this showcase.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <div key={product.id} className="rounded-md border border-primary-border p-3 bg-primary-card">
                  <div className="flex gap-3">
                    <div className="w-24 h-24 overflow-hidden rounded bg-primary-media">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="p-2 text-sm">No image</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex flex-col h-full">
                        <div className="text-sm font-bold">{product.title}</div>
                        <div className="text-primary text-sm font-bold">{product.price}$</div>
                        <div className="text-xs text-secondary-text line-clamp-2">{product.description}</div>
                      </div>
                      <div className=" flex gap-2">
                        {(() => {
                          const viewHref = `/products/${product.id}`;
                          const handleClick = async (e: React.MouseEvent) => {
                            e.preventDefault();
                            try { await fetch(`/api/products?id=${encodeURIComponent(String(product.id))}`, { method: "GET" }); } catch {}
                            router.push(viewHref);
                          };

                          return (
                            <CustomButton href={viewHref} onClick={handleClick} className="w-full" variant="primary" size="sm" rounded="md" iconAfter={<FiExternalLink />}>View</CustomButton>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                <div className="text-lg font-bold">Filters</div>
                <div className="text-xs font-semibold text-secondary-text">Refine this showcase</div>
              </div>
              <CustomButton size="sm" variant="neutral" icon={<FiX />} onClick={() => setShowFilterModal(false)}>Close</CustomButton>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyActive((current) => !current)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    onlyActive
                      ? "border-primary bg-primary text-primary-text"
                      : "border-primary-border bg-primary-soft text-secondary-text"
                  }`}
                >
                  <span>Active only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyDiscounted((current) => !current)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    onlyDiscounted
                      ? "border-danger-border-nomode bg-danger-bg-nomode text-danger-text-nomode"
                      : "border-primary-border bg-primary-soft text-secondary-text"
                  }`}
                >
                  <span>Deals</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold">Price range</div>
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
                    aria-label="Minimum price"
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
                    aria-label="Maximum price"
                  />
                </div>
                <div className="flex gap-2">
                  <CustomInput value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Min" size="sm" />
                  <CustomInput value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Max" size="sm" />
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-primary-border bg-primary-soft p-3">
                <div className="text-sm font-bold">Year range</div>
                <div className="flex gap-2">
                  <CustomInput value={yearMin} onChange={(e) => setYearMin(e.target.value)} placeholder="From" size="sm" />
                  <CustomInput value={yearMax} onChange={(e) => setYearMax(e.target.value)} placeholder="To" size="sm" />
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-primary-border bg-primary-soft p-3">
                <div className="text-sm font-bold">Category</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      !selectedCategory ? "border-primary bg-primary text-primary-text" : "border-primary-border bg-primary-card text-secondary-text"
                    }`}
                  >
                    <span>All</span>
                  </button>
                  {categoryOptions.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(String(cat))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        selectedCategory === cat ? "border-primary bg-primary text-primary-text" : "border-primary-border bg-primary-card text-secondary-text"
                      }`}
                    >
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-primary-border bg-primary-soft p-3">
                <div className="text-sm font-bold">Type</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedType("")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      !selectedType ? "border-primary bg-primary text-primary-text" : "border-primary-border bg-primary-card text-secondary-text"
                    }`}
                  >
                    <span>All</span>
                  </button>
                  {typeOptions.map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setSelectedType(String(type))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        selectedType === type ? "border-primary bg-primary text-primary-text" : "border-primary-border bg-primary-card text-secondary-text"
                      }`}
                    >
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 border-t border-primary-border pt-3">
                <CustomButton size="sm" variant="primary" onClick={() => setShowFilterModal(false)}>Apply</CustomButton>
                <CustomButton size="sm" variant="neutral" onClick={() => {
                  setPriceMin(""); setPriceMax(""); setYearMin(""); setYearMax(""); setSelectedCategory(""); setSelectedType(""); setOnlyDiscounted(false); setOnlyActive(true); setShowFilterModal(false);
                }}>Clear</CustomButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
