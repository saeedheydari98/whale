"use client";

import { useState } from "react";
import Loading from "@/app/design-system/components/loading/loading";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { ImagePreview } from "@/app/design-system/components/ui/image-preview";
import { addProductToCart } from "@/lib/cart-client";
import { normalizeColorStock, type ProductRecord } from "@/lib/products-client";
import {
  EMPTY_PRODUCT_FILTERS,
  ProductListShell,
  type ProductFilterState,
} from "./product-list-controls";
import {
  ProductListGrid,
  PRODUCT_LIST_PAGE_SIZE,
  resolveProductListLoadingCount,
} from "./product-list-grid";

type ProductListingPageProps = {
  title: string;
  emptyText: string;
  loading: boolean;
  initialPageLoading?: boolean;
  headerLoading?: boolean;
  products: ProductRecord[];
  totalProducts?: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  filters: ProductFilterState;
  onFiltersChange: (filters: ProductFilterState) => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
};

export { PRODUCT_LIST_PAGE_SIZE };

export function ProductListingPage({
  title,
  emptyText,
  loading,
  initialPageLoading = false,
  headerLoading,
  products,
  totalProducts,
  searchQuery,
  onSearchChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
}: ProductListingPageProps) {
  const [cartMessage, setCartMessage] = useState("");
  useTransientAppMessage(cartMessage);
  const [previewImage, setPreviewImage] = useState("");
  const resolvedLoading = loading || initialPageLoading;
  const resolvedHeaderLoading = headerLoading ?? resolvedLoading;
  const totalProductCount = Number(totalProducts);
  const hasKnownTotalProducts = Number.isFinite(totalProductCount);
  const resolvedTotalProducts = hasKnownTotalProducts ? totalProductCount : (resolvedLoading ? 0 : products.length);
  const loadingCount = resolvedLoading
    ? resolveProductListLoadingCount(hasKnownTotalProducts ? totalProductCount : undefined)
    : 0;
  const loadingMoreCount = loadingMore
    ? resolveProductListLoadingCount(hasKnownTotalProducts ? totalProductCount : undefined, products.length)
    : 0;
  const shouldHoldLoadingWall = resolvedLoading && !hasKnownTotalProducts;
  const resolvedFilters = filters ?? EMPTY_PRODUCT_FILTERS;

  const addToCart = async (product: ProductRecord) => {
    if (product.isAvailable === false || Number(product.stockQuantity ?? 0) <= 0) {
      setCartMessage(`${product.title} ناموجود است.`);
      window.setTimeout(() => setCartMessage(""), 1800);
      return;
    }

    const colorStock = normalizeColorStock(product.colorStock);
    const selectedColor = Object.entries(colorStock).find(([, count]) => count > 0)?.[0] ?? "";

    try {
      await addProductToCart(product, 1, selectedColor);
      setCartMessage(`${product.title} به سبد خرید اضافه شد.`);
    } catch (error) {
      setCartMessage(error instanceof Error ? error.message : "افزودن به سبد خرید ناموفق بود.");
    }
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  return shouldHoldLoadingWall ? (
    <Loading loading="fullscreen" />
  ) : (
    <main className="min-h-full bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-5 px-4 pb-6">
        <ProductListShell
          title={title}
          count={resolvedTotalProducts}
          headerLoading={resolvedHeaderLoading}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          sort={sort}
          onSortChange={onSortChange}
          filters={resolvedFilters}
          onFiltersChange={onFiltersChange}
        >
          {!resolvedLoading && products.length === 0 ? (
            <CustomEmptyState description={emptyText} />
          ) : null}


          <ProductListGrid
            products={products}
            loading={resolvedLoading}
            loadingCount={loadingCount}
            loadingMore={loadingMore}
            loadingMoreCount={loadingMoreCount}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            onAddToCart={(product) => void addToCart(product)}
            onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")}
          />
        </ProductListShell>
      </div>
      <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />
    </main>
  );
}
