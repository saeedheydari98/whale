"use client";

import { useEffect, useRef } from "react";
import { LazyViewportSection } from "@/app/design-system/components/ui/lazy-viewport-section";
import { type ProductRecord } from "@/lib/products-client";
import { ProductShowcaseCard } from "./product-showcase/showcase-section";
import type { Product } from "./product-showcase/types";

export const PRODUCT_LIST_PAGE_SIZE = 12;

function getFinalPrice(product: Product) {
  return product.discountPrice || product.price;
}

function formatPrice(value?: string) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || !normalized) {
    return value || "";
  }

  return `$${parsed.toLocaleString("en-US")}`;
}

function getDiscountPercent(product: Product) {
  const percent = Number(product.discountPercent);
  return Number.isFinite(percent) && percent > 0 ? Math.round(percent) : 0;
}

type LoadMoreOnViewProps = {
  enabled: boolean;
  onLoadMore: () => void;
};

function LoadMoreOnView({ enabled, onLoadMore }: LoadMoreOnViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      onLoadMore();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        onLoadMore();
      },
      { root: null, rootMargin: "0px 0px 280px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, onLoadMore]);

  return <div ref={ref} className="h-8 w-full" aria-hidden="true" />;
}

type ProductListGridProps = {
  products: ProductRecord[];
  loading: boolean;
  loadingCount: number;
  loadingMore?: boolean;
  loadingMoreCount?: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onAddToCart: (product: ProductRecord) => void;
  onPreview?: (imageUrl?: string) => void;
};

export function ProductListGrid({
  products,
  loading,
  loadingCount,
  loadingMore = false,
  loadingMoreCount = 0,
  hasMore = false,
  onLoadMore,
  onAddToCart,
  onPreview,
}: ProductListGridProps) {
  const canLoadMore = Boolean(onLoadMore && hasMore && !loading && !loadingMore);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {loading
          ? Array.from({ length: loadingCount }, (_, index) => (
              <ProductShowcaseCard
                key={`loading-product-${index + 1}`}
                isLoading
                onAddToCart={onAddToCart}
                onPreview={onPreview}
                formatPrice={formatPrice}
                getFinalPrice={getFinalPrice}
                getDiscountPercent={getDiscountPercent}
              />
            ))
          : products.map((product) => (
              <LazyViewportSection
                key={product.id ?? product.title}
                className="flex w-full max-w-72"
                minHeight={184}
                fallback={(
                  <ProductShowcaseCard
                    product={product}
                    isLoading
                    onAddToCart={onAddToCart}
                    onPreview={onPreview}
                    formatPrice={formatPrice}
                    getFinalPrice={getFinalPrice}
                    getDiscountPercent={getDiscountPercent}
                  />
                )}
              >
                <ProductShowcaseCard
                  product={product}
                  onAddToCart={onAddToCart}
                  onPreview={onPreview}
                  formatPrice={formatPrice}
                  getFinalPrice={getFinalPrice}
                  getDiscountPercent={getDiscountPercent}
                />
              </LazyViewportSection>
            ))}

        {!loading && loadingMore
          ? Array.from({ length: loadingMoreCount }, (_, index) => (
              <ProductShowcaseCard
                key={`loading-more-product-${index + 1}`}
                isLoading
                onAddToCart={onAddToCart}
                onPreview={onPreview}
                formatPrice={formatPrice}
                getFinalPrice={getFinalPrice}
                getDiscountPercent={getDiscountPercent}
              />
            ))
          : null}
      </div>

      {onLoadMore ? <LoadMoreOnView enabled={canLoadMore} onLoadMore={onLoadMore} /> : null}
    </>
  );
}
