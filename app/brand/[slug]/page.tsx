"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  EMPTY_PRODUCT_FILTERS,
  hasProductFilters,
  productFilterParams,
  type ProductFilterState,
} from "@/app/products/product-list-controls";
import { ProductListingPage, PRODUCT_LIST_PAGE_SIZE } from "@/app/products/product-listing-page";
import { getPageBootstrap } from "@/lib/page-bootstrap-client";
import { decodeCatalogSegment, getBrandPageStructure, getBrandProducts } from "@/lib/products-client";

export default function BrandProductsPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const slug = decodeCatalogSegment(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim();
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<ProductFilterState>(EMPTY_PRODUCT_FILTERS);
  const filterParams = useMemo(() => productFilterParams(filters), [filters]);
  const filtersActive = hasProductFilters(filters);

  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "brand", slug],
    queryFn: () => getPageBootstrap(() => getBrandPageStructure(slug)),
    enabled: Boolean(slug),
  });

  const brandProductsQuery = useInfiniteQuery({
    queryKey: ["catalog", "brand", slug, "products", sort, normalizedSearchQuery, filterParams],
    queryFn: ({ pageParam }) => getBrandProducts(slug, {
      page: Number(pageParam),
      limit: PRODUCT_LIST_PAGE_SIZE,
      sort,
      q: normalizedSearchQuery,
      ...filterParams,
    }),
    enabled: Boolean(slug),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
  });

  const pages = brandProductsQuery.data?.pages ?? [];
  const brandProducts = useMemo(
    () => pages.flatMap((page) => page.products),
    [pages]
  );
  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];
  const brand = structureQuery.data?.page.brands[0] ?? firstPage?.section;
  const brandProductCount = Number(brand?.productCount);
  const productLoading = brandProductsQuery.isLoading && !brandProductsQuery.data;

  const loadMore = useCallback(() => {
    if (!brandProductsQuery.hasNextPage || brandProductsQuery.isFetchingNextPage) return;
    void brandProductsQuery.fetchNextPage();
  }, [brandProductsQuery]);

  return (
    <ProductListingPage
      title={brand?.title || slug}
      emptyText="محصولی برای این برند پیدا نشد."
      loading={productLoading}
      headerLoading={structureQuery.isLoading && !brand}
      products={brandProducts}
      totalProducts={lastPage?.pagination.total ?? firstPage?.pagination.total ?? (!normalizedSearchQuery && !filtersActive && Number.isFinite(brandProductCount) ? brandProductCount : undefined)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sort={sort}
      onSortChange={setSort}
      filters={filters}
      onFiltersChange={setFilters}
      loadingMore={brandProductsQuery.isFetchingNextPage}
      hasMore={Boolean(brandProductsQuery.hasNextPage)}
      onLoadMore={loadMore}
    />
  );
}
