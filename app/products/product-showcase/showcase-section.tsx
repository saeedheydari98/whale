"use client";

import { IoBagAddOutline, IoBagHandleOutline} from "react-icons/io5";
import type { MouseEvent } from "react";
import { CustomButton } from "../../design-system/components/ui/button";
import { CustomTag } from "../../design-system/components/ui/tag";
import type { Product, Showcase } from "./types";
import ShowcaseLink from "../../design-system/components/ui/ShowcaseLink";
import ProductLink from "../../design-system/components/ui/ProductLink";
import { FiExternalLink } from "react-icons/fi";
import Loading from "@/app/design-system/components/loading/loading";

type ShowcaseSectionProps = {
  showcase: Showcase;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onPreview: (imageUrl?: string) => void;
  onDragStart: (event: MouseEvent<HTMLDivElement>) => void;
  onDragMove: (event: MouseEvent<HTMLDivElement>) => void;
  onDragStop: () => void;
  formatPrice: (value?: string) => string;
  getFinalPrice: (product: Product) => string;
  getDiscountPercent: (product: Product) => number;
  isLoading?: boolean;
};

export function ShowcaseSection({
  showcase,
  products,
  onAddToCart,
  onPreview,
  onDragStart,
  onDragMove,
  onDragStop,
  formatPrice,
  getFinalPrice,
  getDiscountPercent,
  isLoading = false,
}: ShowcaseSectionProps) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-xl border bg-primary-soft p-4 ${
        isLoading ? "border-border-default" : "border-primary-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <div className="text-xl font-bold">{showcase.title || "Untitled showcase"}</div>
          </Loading>
        </div>
        <div className="flex items-center gap-2">
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <span className="text-xs font-semibold text-secondary-text">{products.length} items</span>
          </Loading>
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <ShowcaseLink showcaseId={showcase.id} showcaseTitle={showcase.title}>See all</ShowcaseLink>
          </Loading>
        </div>
      </div>

      <div
        className="flex cursor-grab gap-3 overflow-x-auto overscroll-x-contain pb-2 active:cursor-grabbing"
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragStop}
        onMouseLeave={onDragStop}
      >
        {products.map((product, index) => (
          <article
            key={product.id ?? `${product.title}-${index}`}
            className={`flex min-h-48 min-w-90 max-w-90 shrink-0 flex-col overflow-hidden rounded-lg border bg-primary-card shadow-sm ${
              isLoading ? "border-border-default" : "border-primary-border"
            }`}
          >
            <div className="flex min-h-36 flex-1 gap-3 p-3">
              <button
                type="button"
                className="relative flex min-h-28 w-1/3 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
                onClick={() => onPreview(product.imageUrl)}
                disabled={isLoading || !product.imageUrl}
                aria-label="Open product image"
              >
                <Loading loading="skeleton-item" isLoading={isLoading} className="h-full w-full">
                  <div className="flex h-full w-full items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <IoBagHandleOutline className="text-4xl text-primary" aria-hidden="true" />
                    )}
                  </div>
                </Loading>
                {product.badge && !isLoading ? (
                  <div className="absolute left-2 top-2">
                    <CustomTag size="xs" rounded="full" border="base">
                      {product.badge}
                    </CustomTag>
                  </div>
                ) : null}
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <div className="line-clamp-1 text-sm font-bold">{product.title}</div>
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <span className="line-clamp-2 text-xs leading-5 text-secondary-text">{product.description}</span>
                </Loading>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    {product.originalPrice && getDiscountPercent(product) > 0 && (
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <div className="text-xs text-danger-text-nomode line-through">
                          {formatPrice(product.originalPrice)}
                        </div>
                      </Loading>
                    )}
                    <Loading loading="skeleton-item" isLoading={isLoading}>
                      <div className="text-sm font-semibold text-primary">{formatPrice(getFinalPrice(product))}</div>
                    </Loading>
                  </div>
                  {getDiscountPercent(product) > 0 && !isLoading ? (
                    <CustomTag size="xs" rounded="full" border="base">
                      {getDiscountPercent(product)}% off
                    </CustomTag>
                  ) : null}
                </div>
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
                  border="base"
                  rounded="md"
                  size="sm"
                  className="flex-1"
                  fullWidth
                  icon={<IoBagAddOutline />}
                  onClick={() => onAddToCart(product)}
                >
                  Add to cart
                </CustomButton>
              </Loading>
              <Loading loading="skeleton-item" isLoading={isLoading} className="flex-1">
                <div className="flex flex-1 gap-2 w-full">
                  <ProductLink iconAfter={<FiExternalLink />} className="w-full flex justify-center items-center gap-1" productId={product.id ?? String(product.id)} productTitle={product.title}>
                    {product.ctaLabel || "View"}  
                  </ProductLink>
                </div>
              </Loading>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
