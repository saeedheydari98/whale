"use client";

import { IoBagAddOutline, IoBagHandleOutline, IoOpenOutline } from "react-icons/io5";
import type { MouseEvent } from "react";
import { CustomButton } from "../../design-system/components/ui/button";
import { CustomTag } from "../../design-system/components/ui/tag";
import type { Product, Showcase } from "./types";

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
}: ShowcaseSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-ui-primary/30 bg-bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold">{showcase.title || "Untitled showcase"}</div>
        </div>
        <span className="text-xs font-semibold text-text-secondary">{products.length} items</span>
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
            className="flex min-h-48 min-w-[360px] max-w-[360px] shrink-0 flex-col overflow-hidden rounded-lg border border-ui-primary/25 bg-bg-surface shadow-sm"
          >
            <div className="flex min-h-36 flex-1 gap-3 p-3">
              <button
                type="button"
                className="relative flex min-h-28 w-1/3 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ui-primary/10"
                onClick={() => onPreview(product.imageUrl)}
                disabled={!product.imageUrl}
                aria-label="Open product image"
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <IoBagHandleOutline className="text-4xl text-ui-primary" aria-hidden="true" />
                )}
                {product.badge && (
                  <div className="absolute left-2 top-2">
                    <CustomTag size="sm" rounded="full" border="base">
                      {product.badge}
                    </CustomTag>
                  </div>
                )}
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="line-clamp-1 text-sm font-bold">{product.title}</div>
                <span className="line-clamp-2 text-xs leading-5 text-text-secondary">{product.description}</span>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    {product.originalPrice && getDiscountPercent(product) > 0 && (
                      <div className="text-xs text-red-admin-500 line-through">
                        {formatPrice(product.originalPrice)}
                      </div>
                    )}
                    <div className="text-sm font-semibold text-ui-primary">{formatPrice(getFinalPrice(product))}</div>
                  </div>
                  {getDiscountPercent(product) > 0 && (
                    <CustomTag size="sm" rounded="full" border="base">
                      {getDiscountPercent(product)}% off
                    </CustomTag>
                  )}
                </div>
              </div>
            </div>
            <div className="flex min-h-12 gap-2 border-t border-ui-primary/15 p-3">
              <CustomButton
                type="button"
                variant="success"
                border="base"
                rounded="md"
                size="sm"
                fullWidth
                icon={<IoBagAddOutline />}
                onClick={() => onAddToCart(product)}
              >
                Add
              </CustomButton>
              <a href={product.ctaHref || "#"} className="inline-flex flex-1">
                <CustomButton
                  type="button"
                  variant="primary"
                  border="base"
                  rounded="md"
                  size="sm"
                  fullWidth
                  iconAfter={<IoOpenOutline />}
                >
                  {product.ctaLabel || "View"}
                </CustomButton>
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
