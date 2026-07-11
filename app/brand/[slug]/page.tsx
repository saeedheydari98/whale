"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductListingPage } from "@/app/products/product-listing-page";
import { getPageBootstrap } from "@/lib/page-bootstrap-client";
import { decodeCatalogSegment, getBrandPageStructure, getBrandProducts } from "@/lib/products-client";

export default function BrandProductsPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const slug = decodeCatalogSegment(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);

  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "brand", slug],
    queryFn: () => getPageBootstrap(() => getBrandPageStructure(slug)),
    enabled: Boolean(slug),
  });

  const brandProductsQuery = useQuery({
    queryKey: ["catalog", "brand", slug, "products"],
    queryFn: () => getBrandProducts(slug, { limit: 100 }),
    enabled: Boolean(slug),
  });
  const brand = structureQuery.data?.page.brands[0] ?? brandProductsQuery.data?.section;
  const brandProducts = brandProductsQuery.data?.products ?? [];

  return (
    <ProductListingPage
      title={brand?.title || slug}
      emptyText="محصولی برای این برند پیدا نشد."
      loading={structureQuery.isLoading || brandProductsQuery.isLoading}
      products={brandProducts}
    />
  );
}
