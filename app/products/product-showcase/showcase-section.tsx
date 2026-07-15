"use client";

import { FiExternalLink } from "react-icons/fi";
import { IoBagAddOutline, IoBagHandleOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import ProductRatingSummary from "@/app/design-system/components/ui/product-rating-summary";
import { useHorizontalDrag } from "@/hooks/use-horizontal-drag";
import { CustomButton } from "../../design-system/components/ui/button";
import ShowcaseLink from "../../design-system/components/ui/ShowcaseLink";
import { CustomTag } from "../../design-system/components/ui/tag";
import { isProductAvailable } from "@/lib/products-client";
import type { Product, Showcase } from "./types";

type ShowcaseSectionProps = {
  showcase: Showcase;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onPreview: (imageUrl?: string) => void;
  formatPrice: (value?: string) => string;
  getFinalPrice: (product: Product) => string;
  getDiscountPercent: (product: Product) => number;
  isLoading?: boolean;
  loadingCount?: number;
  hideShowcaseLink?: boolean;
};

type ProductShowcaseCardProps = {
  product?: Product;
  isLoading?: boolean;
  onAddToCart: (product: Product) => void;
  onPreview?: (imageUrl?: string) => void;
  formatPrice: (value?: string) => string;
  getFinalPrice: (product: Product) => string;
  getDiscountPercent: (product: Product) => number;
};

export function ProductShowcaseCard({
  product,
  isLoading = false,
  onAddToCart,
  onPreview,
  formatPrice,
  getFinalPrice,
  getDiscountPercent,
}: ProductShowcaseCardProps) {
  const productTitle = product?.title || "محصول";
  const productId = product?.id ?? productTitle;
  const available = product ? isProductAvailable(product) : true;
  const discountPercent = product ? getDiscountPercent(product) : 0;

  return (
    <article
      className={`flex min-h-40 min-w-72 max-w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-primary-card shadow-sm ${
        isLoading ? "border-border-default" : "border-primary-border"
      }`}
    >
      <div className="flex min-h-28 flex-1 gap-3 p-3">
        <button
          type="button"
          className="relative flex min-h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
          onClick={() => onPreview?.(product?.imageUrl)}
          disabled={isLoading || !product?.imageUrl || !onPreview}
          aria-label="باز کردن تصویر محصول"
        >
          <Loading loading="skeleton-item" isLoading={isLoading} className="h-full w-full">
            <div className="flex h-full w-full items-center justify-center">
              {product?.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={productTitle}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <IoBagHandleOutline className="text-4xl text-primary" aria-hidden="true" />
              )}
            </div>
          </Loading>
          {product?.badge && !isLoading ? (
            <div className="absolute left-2 top-2">
              <CustomTag size="xs" rounded="full">
                <span>{product.badge}</span>
              </CustomTag>
            </div>
          ) : null}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <div className="line-clamp-1 text-sm font-bold">{productTitle}</div>
          </Loading>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              {product?.originalPrice && discountPercent > 0 ? (
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <div className="text-xs text-danger-text-nomode line-through">
                    {formatPrice(product.originalPrice)}
                  </div>
                </Loading>
              ) : null}
              <Loading loading="skeleton-item" isLoading={isLoading}>
                <div className="text-sm font-semibold text-primary">
                  {product ? formatPrice(getFinalPrice(product)) : "۰ تومان"}
                </div>
              </Loading>
            </div>
            {discountPercent > 0 && !isLoading ? (
              <CustomTag size="xs" rounded="full">
                <span>{discountPercent}٪ تخفیف</span>
              </CustomTag>
            ) : null}
          </div>
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <ProductRatingSummary average={product?.ratingAverage} count={product?.ratingCount} />
          </Loading>
        </div>
      </div>
      <div
        className={`flex min-h-12 gap-2 border-t p-3 ${
          isLoading ? "border-border-default" : "border-primary-border"
        }`}
      >
        <Loading loading="skeleton-item" isLoading={isLoading} className="flex-1">
          <CustomButton
            type="button"
            variant="success"
            rounded="md"
            size="sm"
            className="flex-1"
            fullWidth
            icon={<IoBagAddOutline />}
            disabled={isLoading || !product || !available}
            onClick={() => product ? onAddToCart(product) : undefined}
          >
            <span>{available ? "افزودن" : "ناموجود"}</span>
          </CustomButton>
        </Loading>
        <Loading loading="skeleton-item" isLoading={isLoading} className="flex-1">
          <div className="flex flex-1 gap-2 w-full">
            <ProductLink
              iconAfter={<FiExternalLink size={18} />}
              className="w-full flex justify-center items-center gap-1"
              productId={productId}
              productTitle={productTitle}
            >
              <span>مشاهده</span>
            </ProductLink>
          </div>
        </Loading>
      </div>
    </article>
  );
}

export function ShowcaseSection({
  showcase,
  products,
  onAddToCart,
  onPreview,
  formatPrice,
  getFinalPrice,
  getDiscountPercent,
  isLoading = false,
  loadingCount,
  hideShowcaseLink = false,
}: ShowcaseSectionProps) {
  const visibleProductCount = isLoading ? Math.max(0, loadingCount ?? products.length) : products.length;
  const railDrag = useHorizontalDrag<HTMLDivElement>();

  return (
    <section
      className={`flex flex-col gap-3 rounded-xl border bg-primary-soft p-4 ${
        isLoading ? "border-border-default" : "border-primary-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <div className="text-xl font-bold">{showcase.title || "ویترین بدون عنوان"}</div>
          </Loading>
        </div>
        <div className="flex items-center gap-2">
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <span className="text-xs font-semibold text-secondary-text">{visibleProductCount} محصول</span>
          </Loading>
          {!hideShowcaseLink ? (
            <Loading loading="skeleton-item" isLoading={isLoading}>
              <ShowcaseLink showcaseId={showcase.id} showcaseTitle={showcase.title}>
                <span>مشاهده همه</span>
              </ShowcaseLink>
            </Loading>
          ) : null}
        </div>
      </div>

      <div
        ref={railDrag.ref}
        className={`flex gap-3 overflow-x-auto overscroll-x-contain pb-2 ${
          railDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        {...railDrag.dragHandlers}
      >
        {isLoading
          ? Array.from({ length: visibleProductCount }, (_, index) => (
              <ProductShowcaseCard
                key={`product-card-skeleton-${showcase.id}-${index + 1}`}
                isLoading
                onAddToCart={onAddToCart}
                onPreview={onPreview}
                formatPrice={formatPrice}
                getFinalPrice={getFinalPrice}
                getDiscountPercent={getDiscountPercent}
              />
            ))
          : products.map((product, index) => (
              <ProductShowcaseCard
                key={product.id ?? `${product.title}-${index}`}
                product={product}
                onAddToCart={onAddToCart}
                onPreview={onPreview}
                formatPrice={formatPrice}
                getFinalPrice={getFinalPrice}
                getDiscountPercent={getDiscountPercent}
              />
            ))}
      </div>
    </section>
  );
}
