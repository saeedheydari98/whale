"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductListingPage } from "@/app/products/product-listing-page";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import { decodeCatalogSegment, getBrandProducts, slugifyCatalogValue } from "@/lib/products-client";

export default function BrandProductsPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const slug = decodeCatalogSegment(Array.isArray(rawSlug) ? rawSlug[0] : rawSlug);
  const { brands, loading: structureLoading } = useProductsCatalog();

  const brand = useMemo(
    () => brands.find((item) =>
      slugifyCatalogValue(item.slug || "") === slugifyCatalogValue(slug)
      || slugifyCatalogValue(item.id) === slugifyCatalogValue(slug)
      || slugifyCatalogValue(item.title) === slugifyCatalogValue(slug)
    ),
    [brands, slug]
  );

  const brandProductsQuery = useQuery({
    queryKey: ["catalog", "brand", brand?.id ?? slug, "products"],
    queryFn: () => getBrandProducts(brand?.id ?? slug, { limit: 100 }),
    enabled: !structureLoading,
  });
  const brandTitle = brand?.title || brandProductsQuery.data?.section?.title || slug;
  const brandProducts = brandProductsQuery.data?.products ?? [];

  return (
    <ProductListingPage
      title={brandTitle}
      emptyText="محصولی برای این برند پیدا نشد."
      loading={structureLoading || brandProductsQuery.isLoading}
      products={brandProducts}
    />
  );
}
