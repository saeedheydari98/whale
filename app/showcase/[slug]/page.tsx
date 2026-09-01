"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { ImagePreview } from "@/app/design-system/components/ui/image-preview";
import { BannerCarousel } from "@/app/products/product-showcase/banner-carousel";
import type { Banner } from "@/app/products/product-showcase/types";
import {
  EMPTY_PRODUCT_FILTERS,
  hasProductFilters,
  ProductListShell,
  productFilterParams,
  type ProductFilterState,
} from "@/app/products/product-list-controls";
import {
  ProductListGrid,
} from "@/app/products/product-list-grid";
import { addProductToCart } from "@/lib/cart-client";
import { getPageBootstrap } from "@/lib/page-bootstrap-client";
import {
  decodeCatalogSegment,
  getCatalogSectionData,
  getShowcasePageStructure,
  getShowcaseProducts,
  normalizeColorStock,
  type BannerRecord,
  type ProductRecord,
} from "@/lib/products-client";
import { LazyViewport, useStructureRouteLoading } from "@/app/design-system/components/loading/loading";

function showcaseCarouselBanner(
  banner: BannerRecord,
  loaded?: Pick<BannerRecord, "title" | "imageUrls" | "intervalSeconds" | "heightPercent" | "imageCount" | "showcaseId"> | null,
): Banner {
  return {
    id: banner.id,
    title: loaded?.title ?? banner.title ?? "",
    showcaseId: loaded?.showcaseId ?? banner.showcaseId,
    imageUrls: loaded?.imageUrls ?? banner.imageUrls ?? [],
    active: banner.active !== false,
    showOnHome: banner.showOnHome,
    showOnShowcase: banner.showOnShowcase,
    intervalSeconds: loaded?.intervalSeconds ?? banner.intervalSeconds,
    heightPercent: loaded?.heightPercent ?? banner.heightPercent,
    imageCount: Number(loaded?.imageCount ?? banner.imageCount ?? loaded?.imageUrls?.length ?? 0),
    homeSortOrder: banner.homeSortOrder,
    showcaseSortOrder: banner.showcaseSortOrder,
    sortOrder: Number(banner.showcaseSortOrder ?? banner.sortOrder ?? 0),
  };
}

function ShowcasePageBanner({
  banner,
  onPreview,
}: {
  banner: BannerRecord;
  onPreview: (imageUrl?: string) => void;
}) {
  const hasImages = Boolean(banner.imageUrls?.length);
  const query = useQuery({
    queryKey: ["catalog", "section", "banner", banner.id],
    queryFn: () => getCatalogSectionData({ type: "banner", id: banner.id }),
    enabled: !hasImages,
  });
  const loaded = query.data?.banner;
  const dataLoading = !hasImages && !loaded?.imageUrls?.length && query.isLoading;

  return (
    <BannerCarousel
      banner={showcaseCarouselBanner(banner, loaded)}
      onPreview={onPreview}
      isLoading={dataLoading}
    />
  );
}

export default function ShowcasePage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const showcaseId = decodeCatalogSegment(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim();
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<ProductFilterState>(EMPTY_PRODUCT_FILTERS);
  const [pageSize, setPageSize] = useState(0);
  const filterParams = useMemo(() => productFilterParams(filters), [filters]);
  const filtersActive = hasProductFilters(filters);
  const [cartMessage, setCartMessage] = useState("");
  useTransientAppMessage(cartMessage);
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
    queryKey: ["catalog", "showcase", showcaseId, "products", "page", sort, normalizedSearchQuery, filterParams, pageSize],
    queryFn: ({ pageParam }) => getShowcaseProducts(showcaseId, {
      page: Number(pageParam),
      limit: Math.max(1, pageSize),
      sort,
      q: normalizedSearchQuery,
      ...filterParams,
    }),
    enabled: Boolean(showcaseId) && pageSize > 0,
    initialPageParam: 1,
    placeholderData: (previous) => previous,
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
  const productLoading = pageSize === 0 || (showcaseProductsQuery.isLoading && !showcaseProductsQuery.data);
  const loading = productLoading;
  const headerLoading = structureQuery.isLoading && !showcase;
  useStructureRouteLoading(structureQuery.isLoading && !structureQuery.data);
  const showcaseProductCount = Number(showcase?.productCount);
  const totalProducts = lastPage?.pagination.total
    ?? firstPage?.pagination.total
    ?? (normalizedSearchQuery || filtersActive || !Number.isFinite(showcaseProductCount) ? undefined : showcaseProductCount);
  const totalProductCount = Number(totalProducts);
  const hasKnownTotalProducts = Number.isFinite(totalProductCount);

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
    <main className="min-h-full bg-primary-base text-primary-text">
      <div className="flex w-full flex-col gap-4 px-4 pb-4">
        <ProductListShell
          title={showcase?.title || `ویترین: ${showcaseId}`}
          count={hasKnownTotalProducts ? totalProductCount : (loading ? 0 : products.length)}
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
                    <LazyViewport
                      key={banner.id}
                      fallback={<BannerCarousel banner={showcaseCarouselBanner(banner)} isLoading />}
                    >
                      <ShowcasePageBanner banner={banner} onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")} />
                    </LazyViewport>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        >

          {!loading && products.length === 0 ? (
            <CustomEmptyState />
          ) : null}

          <ProductListGrid
            products={products}
            loading={loading}
            loadingMore={showcaseProductsQuery.isFetchingNextPage}
            totalProducts={hasKnownTotalProducts ? totalProductCount : undefined}
            hasMore={Boolean(showcaseProductsQuery.hasNextPage)}
            onLoadMore={loadMore}
            onCapacityChange={setPageSize}
            onAddToCart={(product) => void addToCart(product)}
            onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")}
          />
        </ProductListShell>
      </div>

      <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />
    </main>
  );
}
