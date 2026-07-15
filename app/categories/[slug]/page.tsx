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
import {
  decodeCatalogSegment,
  getCategoryPageStructure,
  getCategoryProducts,
} from "@/lib/products-client";

export default function CategoryProductsPage() {
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
    queryKey: ["catalog", "page-structure", "category", slug],
    queryFn: () => getPageBootstrap(() => getCategoryPageStructure(slug)),
    enabled: Boolean(slug),
  });

  const categoryProductsQuery = useInfiniteQuery({
    queryKey: ["catalog", "category", slug, "products", sort, normalizedSearchQuery, filterParams],
    queryFn: ({ pageParam }) => getCategoryProducts(slug, {
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

  const pages = categoryProductsQuery.data?.pages ?? [];
  const categoryProducts = useMemo(
    () => pages.flatMap((page) => page.products),
    [pages]
  );
  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];
  const category = structureQuery.data?.page.categories[0] ?? firstPage?.section;
  const categoryProductCount = Number(category?.productCount);
  const productLoading = categoryProductsQuery.isLoading && !categoryProductsQuery.data;

  const loadMore = useCallback(() => {
    if (!categoryProductsQuery.hasNextPage || categoryProductsQuery.isFetchingNextPage) return;
    void categoryProductsQuery.fetchNextPage();
  }, [categoryProductsQuery]);

  return (
    <ProductListingPage
      title={category?.title || "محصولات دسته بندی"}
      emptyText="محصولی برای این دسته بندی پیدا نشد."
      loading={productLoading}
      headerLoading={structureQuery.isLoading && !category}
      products={categoryProducts}
      totalProducts={lastPage?.pagination.total ?? firstPage?.pagination.total ?? (!normalizedSearchQuery && !filtersActive && Number.isFinite(categoryProductCount) ? categoryProductCount : undefined)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sort={sort}
      onSortChange={setSort}
      filters={filters}
      onFiltersChange={setFilters}
      loadingMore={categoryProductsQuery.isFetchingNextPage}
      hasMore={Boolean(categoryProductsQuery.hasNextPage)}
      onLoadMore={loadMore}
    />
  );
}
