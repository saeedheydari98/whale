"use client";

import { useMemo, useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import { IoBagAddOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import ProductRatingSummary from "@/app/design-system/components/ui/product-rating-summary";
import { addProductToCart } from "@/lib/cart-client";
import {
  isProductAvailable,
  normalizeColorStock,
  sortProductsBy,
  type ProductRecord,
} from "@/lib/products-client";

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی ترین" },
  { value: "cheapest", label: "ارزان ترین" },
  { value: "expensive", label: "گران ترین" },
  { value: "bestseller", label: "پرفروش ترین" },
  { value: "mostDiscounted", label: "بیشترین تخفیف" },
];

const LOADING_PRODUCTS: ProductRecord[] = Array.from({ length: 8 }, (_, index) => ({
  id: `loading-product-${index + 1}`,
  title: "عنوان محصول",
  description: "توضیح کوتاه محصول برای نمایش اسکلتون",
  price: "$0",
  active: true,
  isActive: true,
  isAvailable: true,
  stockQuantity: 1,
  sortOrder: index + 1,
}));

type ProductListingPageProps = {
  title: string;
  emptyText: string;
  loading: boolean;
  products: ProductRecord[];
};

export function ProductListingPage({ title, emptyText, loading, products }: ProductListingPageProps) {
  const [sort, setSort] = useState("newest");
  const [cartMessage, setCartMessage] = useState("");

  const visibleProducts = useMemo(() => sortProductsBy(products, sort), [products, sort]);
  const renderedProducts = loading ? LOADING_PRODUCTS : visibleProducts;

  const addToCart = async (product: ProductRecord) => {
    if (!isProductAvailable(product)) {
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-border pb-4">
          <div className="flex flex-col gap-1">
            <Loading loading="skeleton-item" isLoading={loading}>
              <div className="text-2xl font-bold">{title}</div>
            </Loading>
            <Loading loading="skeleton-item" isLoading={loading}>
              <span className="text-xs font-semibold text-secondary-text">{visibleProducts.length} محصول</span>
            </Loading>
          </div>
          <Loading loading="skeleton-item" isLoading={loading}>
            <CustomSelect value={sort} aria-label="مرتب سازی محصولات" onChange={(event) => setSort(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CustomSelect>
          </Loading>
        </div>

        {!loading && visibleProducts.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">{emptyText}</div>
        ) : null}

        {cartMessage ? (
          <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">{cartMessage}</div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {renderedProducts.map((product) => {
            const available = isProductAvailable(product);
            return (
              <div key={product.id} className="flex w-full max-w-72 flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
                <div className="flex gap-3">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-primary-media">
                    <Loading loading="skeleton-item" isLoading={loading} className="h-full w-full">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-secondary-text">بدون تصویر</div>
                      )}
                    </Loading>
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Loading loading="skeleton-item" isLoading={loading}>
                      <div className="line-clamp-1 text-sm font-bold">{product.title}</div>
                    </Loading>
                    <Loading loading="skeleton-item" isLoading={loading}>
                      <span className="line-clamp-2 text-xs text-secondary-text">{product.description}</span>
                    </Loading>
                    <Loading loading="skeleton-item" isLoading={loading}>
                      <div className="text-sm font-bold text-primary">{product.discountPrice || product.price}</div>
                    </Loading>
                    <Loading loading="skeleton-item" isLoading={loading}>
                      <ProductRatingSummary average={product.ratingAverage} count={product.ratingCount} />
                    </Loading>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-primary-border pt-3">
                  <Loading loading="skeleton-item" isLoading={loading} className="flex-1">
                    <CustomButton
                      type="button"
                      variant="success"
                      size="sm"
                      fullWidth
                      className="flex-1"
                      icon={<IoBagAddOutline />}
                      disabled={loading || !available}
                      onClick={() => void addToCart(product)}
                    >
                      {available ? "افزودن" : "ناموجود"}
                    </CustomButton>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading={loading} className="flex-1">
                    <ProductLink productId={product.id ?? ""} productTitle={product.slug || product.title} className="flex-1" iconAfter={<FiExternalLink />}>
                      مشاهده
                    </ProductLink>
                  </Loading>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
