"use client";

import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import {
  formatAmount as formatPrice,
  getDiscountPercentValue as getDiscountPercent,
  getFinalPriceValue as getFinalPrice,
} from "@/lib/price-format";
import { type ProductRecord } from "@/lib/products-client";
import { ProductShowcaseCard } from "./product-showcase/showcase-section";

type ProductListGridProps = {
  products: ProductRecord[];
  loading: boolean;
  loadingMore?: boolean;
  totalProducts?: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onCapacityChange?: (capacity: number) => void;
  onAddToCart: (product: ProductRecord) => void;
  onPreview?: (imageUrl?: string) => void;
};

export function ProductListGrid({
  products,
  loading,
  loadingMore = false,
  totalProducts,
  hasMore = false,
  onLoadMore,
  onCapacityChange,
  onAddToCart,
  onPreview,
}: ProductListGridProps) {
  return (
    <DynamicLoadingCollection
      items={products}
      getKey={(product, index) => product.id ?? index}
      isLoading={loading}
      isLoadingMore={loadingMore}
      totalCount={Number.isFinite(Number(totalProducts)) ? Number(totalProducts) : undefined}
      structure={Number.isFinite(Number(totalProducts)) ? { count: Number(totalProducts) } : undefined}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      onCapacityChange={onCapacityChange}
      className="flex flex-wrap gap-3"
      renderSkeleton={() => (
        <Loading loading="skeleton-structure" isLoading>
          <ProductShowcaseCard
            isLoading
            onAddToCart={onAddToCart}
            onPreview={onPreview}
            formatPrice={formatPrice}
            getFinalPrice={getFinalPrice}
            getDiscountPercent={getDiscountPercent}
          />
        </Loading>
      )}
      renderItem={(product) => (
        <ProductShowcaseCard
          product={product}
          onAddToCart={onAddToCart}
          onPreview={onPreview}
          formatPrice={formatPrice}
          getFinalPrice={getFinalPrice}
          getDiscountPercent={getDiscountPercent}
        />
      )}
    />
  );
}
