"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductListingPage } from "@/app/products/product-listing-page";
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

  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "category", slug],
    queryFn: () => getPageBootstrap(() => getCategoryPageStructure(slug)),
    enabled: Boolean(slug),
  });

  const categoryProductsQuery = useQuery({
    queryKey: ["catalog", "category", slug, "products"],
    queryFn: () => getCategoryProducts(slug, { limit: 100 }),
    enabled: Boolean(slug),
  });
  const category = structureQuery.data?.page.categories[0] ?? categoryProductsQuery.data?.section;
  const categoryProducts = categoryProductsQuery.data?.products ?? [];

  return (
    <ProductListingPage
      title={category?.title || "محصولات دسته بندی"}
      emptyText="محصولی برای این دسته بندی پیدا نشد."
      loading={structureQuery.isLoading || categoryProductsQuery.isLoading}
      products={categoryProducts}
    />
  );
}
