"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductListingPage } from "@/app/products/product-listing-page";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import {
  decodeCatalogSegment,
  getCategoryProducts,
  slugifyCatalogValue,
} from "@/lib/products-client";

export default function CategoryProductsPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const slug = decodeCatalogSegment(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);
  const { categories, loading: structureLoading } = useProductsCatalog();

  const category = useMemo(
    () =>
      categories.find((item) =>
        item.id === slug
        || slugifyCatalogValue(item.slug || item.title || item.id) === slugifyCatalogValue(slug)
      ),
    [categories, slug]
  );

  const categoryProductsQuery = useQuery({
    queryKey: ["catalog", "category", category?.id ?? slug, "products"],
    queryFn: () => getCategoryProducts(category?.id ?? slug, { limit: 100 }),
    enabled: !structureLoading,
  });
  const categoryProducts = categoryProductsQuery.data?.products ?? [];

  return (
    <ProductListingPage
      title={category?.title || "محصولات دسته بندی"}
      emptyText="محصولی برای این دسته بندی پیدا نشد."
      loading={structureLoading || categoryProductsQuery.isLoading}
      products={categoryProducts}
    />
  );
}
