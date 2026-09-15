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
import { ProductListingPage } from "@/app/products/product-listing-page";
import { getPageBootstrap } from "@/lib/page-bootstrap-client";
import {
  decodeCatalogSegment,
  getCategoryGroupPageStructure,
  getCategoryGroupProducts,
} from "@/lib/products-client";
import { useStructureRouteLoading } from "@/app/design-system/components/loading/loading";

export default function CategoryGroupProductsPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const slug = decodeCatalogSegment(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim();
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<ProductFilterState>(EMPTY_PRODUCT_FILTERS);
  const [pageSize, setPageSize] = useState(0);
  const filterParams = useMemo(() => productFilterParams(filters), [filters]);
  const filtersActive = hasProductFilters(filters);

  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "category-group", slug],
    queryFn: () => getPageBootstrap(() => getCategoryGroupPageStructure(slug)),
    enabled: Boolean(slug),
  });

  const categoryGroupProductsQuery = useInfiniteQuery({
    queryKey: ["catalog", "category-group", slug, "products", sort, normalizedSearchQuery, filterParams, pageSize],
    queryFn: ({ pageParam }) => getCategoryGroupProducts(slug, {
      page: Number(pageParam),
      limit: Math.max(1, pageSize),
      sort,
      q: normalizedSearchQuery,
      ...filterParams,
    }),
    enabled: Boolean(slug) && pageSize > 0,
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
  const categoryGroup = structureQuery.data?.page.categoryGroups[0] ?? firstPage?.section;
  const categoryGroupProductCount = Number(categoryGroup?.productCount);
  const productLoading = pageSize === 0 || (categoryGroupProductsQuery.isLoading && !categoryGroupProductsQuery.data);
  const initialPageLoading = structureQuery.isLoading && !categoryGroup && !categoryGroupProductsQuery.data;
  useStructureRouteLoading(structureQuery.isLoading && !structureQuery.data);

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
      initialPageLoading={initialPageLoading}
      headerLoading={structureQuery.isLoading && !categoryGroup}
      products={products}
      totalProducts={lastPage?.pagination.total ?? firstPage?.pagination.total ?? (!normalizedSearchQuery && !filtersActive && Number.isFinite(categoryGroupProductCount) ? categoryGroupProductCount : undefined)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sort={sort}
      onSortChange={setSort}
      filters={filters}
      onFiltersChange={setFilters}
      loadingMore={categoryGroupProductsQuery.isFetchingNextPage}
      hasMore={Boolean(categoryGroupProductsQuery.hasNextPage)}
      onLoadMore={loadMore}
      onCapacityChange={setPageSize}
    />
  );
}
