"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { BannerCarousel } from "@/app/products/product-showcase/banner-carousel";
import {
  EMPTY_PRODUCT_FILTERS,
  hasProductFilters,
  ProductListShell,
  productFilterParams,
  type ProductFilterState,
} from "@/app/products/product-list-controls";
import {
  ProductListGrid,
  PRODUCT_LIST_PAGE_SIZE,
} from "@/app/products/product-list-grid";
import { addProductToCart } from "@/lib/cart-client";
import { getPageBootstrap } from "@/lib/page-bootstrap-client";
import {
  decodeCatalogSegment,
  getShowcasePageStructure,
  getShowcaseProducts,
  normalizeColorStock,
  type ProductRecord,
} from "@/lib/products-client";

export default function ShowcasePage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const showcaseId = decodeCatalogSegment(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim();
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<ProductFilterState>(EMPTY_PRODUCT_FILTERS);
  const filterParams = useMemo(() => productFilterParams(filters), [filters]);
  const filtersActive = hasProductFilters(filters);
  const [cartMessage, setCartMessage] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "showcase", showcaseId],
    queryFn: () => getPageBootstrap(() => getShowcasePageStructure(showcaseId)),
    enabled: Boolean(showcaseId),
  });
  const pageStructure = structureQuery.data?.page;
  const structureShowcase = pageStructure?.showcases[0];
  const banners = pageStructure?.banners ?? [];

  const showcaseProductsQuery = useInfiniteQuery({
    queryKey: ["catalog", "showcase", showcaseId, "products", "page", sort, normalizedSearchQuery, filterParams],
    queryFn: ({ pageParam }) => getShowcaseProducts(showcaseId, {
      page: Number(pageParam),
      limit: PRODUCT_LIST_PAGE_SIZE,
      sort,
      q: normalizedSearchQuery,
      ...filterParams,
    }),
    enabled: Boolean(showcaseId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
  });

  const pages = showcaseProductsQuery.data?.pages ?? [];
  const products = useMemo(
    () => pages.flatMap((page) => page.products),
    [pages]
  );
  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];
  const showcase = firstPage?.section ?? structureShowcase;
  const loading = showcaseProductsQuery.isLoading && !showcaseProductsQuery.data;
  const headerLoading = (structureQuery.isLoading && !showcase) || loading;
  const showcaseProductCount = Number(showcase?.productCount);
  const totalProducts = lastPage?.pagination.total
    ?? firstPage?.pagination.total
    ?? (normalizedSearchQuery || filtersActive || !Number.isFinite(showcaseProductCount) ? undefined : showcaseProductCount);
  const totalProductCount = Number(totalProducts);
  const hasKnownTotalProducts = Number.isFinite(totalProductCount);
  const loadingCount = hasKnownTotalProducts ? Math.max(0, Math.min(PRODUCT_LIST_PAGE_SIZE, totalProductCount)) : 0;
  const loadingMoreCount = hasKnownTotalProducts
    ? Math.max(0, Math.min(PRODUCT_LIST_PAGE_SIZE, totalProductCount - products.length))
    : 0;

  const showcaseBanners = useMemo(
    () => banners.filter((banner) => banner.active !== false && banner.showOnShowcase === true),
    [banners]
  );

  const loadMore = useCallback(() => {
    if (!showcaseProductsQuery.hasNextPage || showcaseProductsQuery.isFetchingNextPage) return;
    void showcaseProductsQuery.fetchNextPage();
  }, [showcaseProductsQuery]);

  const addToCart = async (product: ProductRecord) => {
    if (product.isAvailable === false || Number(product.stockQuantity ?? 0) <= 0) {
      setCartMessage(`${product.title} ناموجود است.`);
      window.setTimeout(() => setCartMessage(""), 1800);
      return;
    }

    const colorStock = normalizeColorStock(product.colorStock);
    const selectedColor = Object.entries(colorStock).find(([, count]) => count > 0)?.[0] ?? "";

    try {
      await addProductToCart(product, 1, selectedColor);
      setCartMessage(`${product.title} به سبد خرید اضافه شد.`);
    } catch (error) {
      setCartMessage(error instanceof Error ? error.message : "افزودن به سبد خرید ناموفق بود.");
    }
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  return (
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="flex w-full flex-col gap-4 p-4">
        <ProductListShell
          title={showcase?.title || `ویترین: ${showcaseId}`}
          count={hasKnownTotalProducts ? totalProductCount : products.length}
          headerLoading={headerLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sort={sort}
          onSortChange={setSort}
          filters={filters}
          onFiltersChange={setFilters}
          topContent={(
            <div className="flex flex-col gap-4">
              {showcase?.description ? (
                <div className="text-sm text-secondary-text">{showcase.description}</div>
              ) : null}

              {showcaseBanners.length > 0 ? (
                <div className="flex flex-col gap-4">
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
            </div>
          )}
        >
          {cartMessage ? (
            <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
              {cartMessage}
            </div>
          ) : null}

          {!loading && products.length === 0 ? (
            <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
              محصولی برای این ویترین پیدا نشد.
            </div>
          ) : null}

          <ProductListGrid
            products={products}
            loading={loading}
            loadingCount={loadingCount}
            loadingMore={showcaseProductsQuery.isFetchingNextPage}
            loadingMoreCount={loadingMoreCount}
            hasMore={Boolean(showcaseProductsQuery.hasNextPage)}
            onLoadMore={loadMore}
            onAddToCart={(product) => void addToCart(product)}
            onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")}
          />
        </ProductListShell>
      </div>

      {previewImage ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-0"
          onClick={() => setPreviewImage("")}
          aria-label="بستن تصویر"
        >
          <img
            src={previewImage}
            alt="تصویر"
            className="max-h-screen max-w-full object-contain"
          />
        </button>
      ) : null}
    </main>
  );
}
