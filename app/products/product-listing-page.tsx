"use client";

import { useState } from "react";
import { CustomModal } from "@/app/design-system/components/ui/modal";
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
} from "./product-list-grid";

type ProductListingPageProps = {
  title: string;
  emptyText: string;
  loading: boolean;
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
  const [previewImage, setPreviewImage] = useState("");
  const resolvedHeaderLoading = headerLoading ?? loading;
  const totalProductCount = Number(totalProducts);
  const hasKnownTotalProducts = Number.isFinite(totalProductCount);
  const resolvedTotalProducts = hasKnownTotalProducts ? totalProductCount : products.length;
  const loadingCount = hasKnownTotalProducts ? Math.max(0, Math.min(PRODUCT_LIST_PAGE_SIZE, totalProductCount)) : 0;
  const loadingMoreCount = hasKnownTotalProducts
    ? Math.max(0, Math.min(PRODUCT_LIST_PAGE_SIZE, totalProductCount - products.length))
    : 0;
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

  return (
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-5 px-4 py-6">
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
          {!loading && products.length === 0 ? (
            <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">{emptyText}</div>
          ) : null}

          {cartMessage ? (
            <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">{cartMessage}</div>
          ) : null}

          <ProductListGrid
            products={products}
            loading={loading}
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
      <CustomModal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage("")}
        title="تصویر محصول"
        rounded="lg"
        shadow="lg"
      >
        <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-md bg-primary-base">
          {previewImage ? (
            <img
              src={previewImage}
              alt="پیش نمایش تصویر محصول"
              className="max-h-[75vh] w-full object-contain"
            />
          ) : null}
        </div>
      </CustomModal>
    </main>
  );
}
