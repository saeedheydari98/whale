"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  EMPTY_PRODUCT_FILTERS,
  hasProductFilters,
  productFilterParams,
  type ProductFilterState,
} from "@/app/products/product-list-controls";
import { ProductListingPage, PRODUCT_LIST_PAGE_SIZE } from "@/app/products/product-listing-page";
import { decodeCatalogSegment, getCategoryGroupProducts } from "@/lib/products-client";

export default function CategoryGroupProductsPage() {
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

  const categoryGroupProductsQuery = useInfiniteQuery({
    queryKey: ["catalog", "category-group", slug, "products", sort, normalizedSearchQuery, filterParams],
    queryFn: ({ pageParam }) => getCategoryGroupProducts(slug, {
      page: Number(pageParam),
      limit: PRODUCT_LIST_PAGE_SIZE,
      sort,
      q: normalizedSearchQuery,
      ...filterParams,
    }),
    enabled: Boolean(slug),
    initialPageParam: 1,
    placeholderData: (previous) => previous,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
  });

  const pages = useMemo(
    () => categoryGroupProductsQuery.data?.pages ?? [],
    [categoryGroupProductsQuery.data?.pages]
  );
  const products = useMemo(() => pages.flatMap((page) => page.products), [pages]);
  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];
  const categoryGroup = firstPage?.section;
  const productLoading = categoryGroupProductsQuery.isLoading && !categoryGroupProductsQuery.data;

  const loadMore = useCallback(() => {
    if (categoryGroupProductsQuery.hasNextPage && !categoryGroupProductsQuery.isFetchingNextPage) {
      void categoryGroupProductsQuery.fetchNextPage();
    }
  }, [categoryGroupProductsQuery]);

  return (
    <ProductListingPage
      title={categoryGroup?.title ? `محصولات ${categoryGroup.title}` : "محصولات گروه دسته‌بندی"}
      emptyText={filtersActive || normalizedSearchQuery ? "محصولی با این فیلترها پیدا نشد." : "هنوز محصولی در این گروه دسته‌بندی ثبت نشده است."}
      loading={productLoading}
      initialPageLoading={productLoading}
      headerLoading={productLoading && !categoryGroup}
      products={products}
      totalProducts={lastPage?.pagination.total ?? firstPage?.pagination.total}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sort={sort}
      onSortChange={setSort}
      filters={filters}
      onFiltersChange={setFilters}
      loadingMore={categoryGroupProductsQuery.isFetchingNextPage}
      hasMore={Boolean(categoryGroupProductsQuery.hasNextPage)}
      onLoadMore={loadMore}
    />
  );
}
