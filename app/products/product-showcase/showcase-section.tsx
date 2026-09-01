"use client";

import { FiExternalLink } from "react-icons/fi";
import { IoBagAddOutline, IoBagHandleOutline } from "react-icons/io5";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import ProductRatingSummary from "@/app/design-system/components/ui/product-rating-summary";
import { ProductCardBadge } from "@/app/design-system/components/ui/product-card-badge";
import { useHorizontalDrag } from "@/hooks/use-horizontal-drag";
import { CustomButton } from "../../design-system/components/ui/button";
import { AppImage } from "../../design-system/components/ui/app-image";
import ShowcaseLink from "../../design-system/components/ui/ShowcaseLink";
import { CustomTag } from "../../design-system/components/ui/tag";
import { AppHeading, type AppHeadingLevel } from "../../design-system/components/ui/text";
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
  totalCount?: number | string;
  onCapacityChange?: (capacity: number) => void;
  hideShowcaseLink?: boolean;
};

type ProductShowcaseCardProps = {
  product?: Product;
  isLoading?: boolean;
  titleLevel?: AppHeadingLevel;
  onAddToCart: (product: Product) => void;
  onPreview?: (imageUrl?: string) => void;
  formatPrice: (value?: string) => string;
  getFinalPrice: (product: Product) => string;
  getDiscountPercent: (product: Product) => number;
};

function getPrimaryProductImage(product?: Product) {
  if (!product) return "";
  const imageUrls = Array.isArray(product.images)
    ? product.images.map((item) => String(item).trim()).filter(Boolean)
    : [];
  return String(product.imageUrl ?? "").trim() || imageUrls[0] || "";
}

export function ProductShowcaseCard({
  product,
  isLoading = false,
  titleLevel = 3,
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
  const primaryImage = getPrimaryProductImage(product);

  return (
    <article
      className={`relative flex min-h-40 min-w-72 max-w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-primary-card shadow-sm ${
        isLoading ? "border-border-default" : "border-primary-border"
      }`}
    >
      {!isLoading ? <ProductCardBadge label={product?.badge} /> : null}
      <div className="flex min-h-28 flex-1 gap-3 p-3">
        <button
          type="button"
          className="relative flex min-h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
          onClick={() => onPreview?.(primaryImage)}
          disabled={isLoading || !primaryImage || !onPreview}
          aria-label="باز کردن تصویر محصول"
        >
          {primaryImage ? (
            <AppImage
              src={primaryImage}
              alt={productTitle}
              width={192}
              height={192}
              className="h-full w-full object-cover"
            />
          ) : (
            <IoBagHandleOutline className="text-4xl text-primary" aria-hidden="true" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <AppHeading level={titleLevel} className="line-clamp-1 text-sm font-bold">{productTitle}</AppHeading>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              {product?.originalPrice && discountPercent > 0 && !isLoading ? (
                <div className="text-xs text-danger-text-nomode line-through">
                  {formatPrice(product.originalPrice)}
                </div>
              ) : null}
              <div className="text-sm font-semibold text-primary">
                {product ? formatPrice(getFinalPrice(product)) : formatPrice("0")}
              </div>
            </div>
            {discountPercent > 0 && !isLoading ? (
              <CustomTag size="xs" rounded="full">
                <span>{discountPercent}٪ تخفیف</span>
              </CustomTag>
            ) : null}
          </div>
          <ProductRatingSummary average={product?.ratingAverage} count={product?.ratingCount} />
        </div>
      </div>
      <div
        className={`flex min-h-12 gap-2 border-t p-3 ${
          isLoading ? "border-border-default" : "border-primary-border"
        }`}
      >
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
  totalCount,
  onCapacityChange,
  hideShowcaseLink = false,
}: ShowcaseSectionProps) {
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
            <AppHeading level={2} className="text-xl font-bold">{showcase.title || "ویترین بدون عنوان"}</AppHeading>
          </Loading>
        </div>
        <div className="flex items-center gap-2">
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <span className="text-xs font-semibold text-secondary-text">{totalCount ?? products.length} محصول</span>
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

      <DynamicLoadingCollection
        items={products}
        getKey={(product, index) => product.id ?? index}
        isLoading={isLoading}
        totalCount={Number.isFinite(Number(totalCount)) ? Number(totalCount) : undefined}
        structure={Number.isFinite(Number(totalCount)) ? { count: Number(totalCount) } : undefined}
        onCapacityChange={onCapacityChange}
        containerRef={railDrag.ref}
        containerProps={railDrag.dragHandlers}
        className={`flex gap-3 overflow-x-auto overscroll-x-contain pb-2 ${
          railDrag.isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
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
    </section>
  );
}
