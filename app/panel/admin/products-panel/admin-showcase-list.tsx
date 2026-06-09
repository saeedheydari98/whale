"use client";

import { IoCreateOutline, IoImageOutline, IoTrashOutline } from "react-icons/io5";
import type { MouseEvent } from "react";
import { CustomButton } from "../../../design-system/components/ui/button";
import type { ProductForm, ShowcaseForm } from "./types";

type AdminShowcaseListProps = {
  products: ProductForm[];
  showcases: ShowcaseForm[];
  onEditShowcase: (showcase: ShowcaseForm) => void;
  onDeleteShowcase: (showcase: ShowcaseForm) => void;
  onEditProduct: (product: ProductForm) => void;
  onPreview: (imageUrl?: string) => void;
  onDragStart: (event: MouseEvent<HTMLDivElement>) => void;
  onDragMove: (event: MouseEvent<HTMLDivElement>) => void;
  onDragStop: () => void;
  formatPrice: (value?: string) => string;
};

export function AdminShowcaseList({
  products,
  showcases,
  onEditShowcase,
  onDeleteShowcase,
  onEditProduct,
  onPreview,
  onDragStart,
  onDragMove,
  onDragStop,
  formatPrice,
}: AdminShowcaseListProps) {
  return (
    <div className="flex flex-col gap-5">
      {showcases.map((showcase) => {
        const showcaseProducts = products.filter((product) => product.showcaseId === showcase.id);

        return (
          <div
            key={showcase.id}
            className="flex w-full flex-col gap-3 rounded-xl border border-ui-primary/30 bg-bg-base p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-text-primary">{showcase.title || "Untitled showcase"}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary">{showcaseProducts.length} items</span>
                <CustomButton
                  variant="neutral"
                  rounded="full"
                  size="sm"
                  border="base"
                  icon={<IoCreateOutline />}
                  onClick={() => onEditShowcase(showcase)}
                >
                  Edit
                </CustomButton>
              </div>
            </div>

            <div
              className="flex cursor-grab gap-2 overflow-x-auto overscroll-x-contain pb-2 active:cursor-grabbing"
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragStop}
              onMouseLeave={onDragStop}
            >
              {showcaseProducts.length === 0 && (
                <div className="flex min-h-28 min-w-44 flex-col justify-center gap-1 rounded-lg border border-dashed border-ui-primary/30 bg-bg-base p-3">
                  <div className="text-xs font-bold text-text-primary">Empty showcase</div>
                  <span className="text-[11px] text-text-secondary">Add a product to this showcase.</span>
                </div>
              )}

              {showcaseProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex min-h-44 min-w-36 max-w-36 shrink-0 flex-col gap-2 rounded-md border border-ui-primary/20 bg-bg-base p-2 shadow-sm"
                >
                  <button
                    type="button"
                    className="flex h-20 items-center justify-center overflow-hidden rounded bg-ui-primary/10"
                    onClick={() => onPreview(product.imageUrl)}
                    disabled={!product.imageUrl}
                    aria-label="Open product image"
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title || `Product ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <IoImageOutline className="text-2xl text-ui-primary" aria-hidden="true" />
                    )}
                  </button>
                  <div className="line-clamp-2 min-h-8 text-xs font-bold text-text-primary">
                    {product.title || `Product ${index + 1}`}
                  </div>
                  <div className="text-xs font-bold text-ui-primary">
                    {formatPrice(product.discountPrice || product.price) || "No price"}
                  </div>
                  <CustomButton
                    fullWidth
                    border="base"
                    rounded="sm"
                    size="sm"
                    variant={product.active ? "primary" : "neutral"}
                    icon={<IoCreateOutline />}
                    onClick={() => onEditProduct(product)}
                  >
                    Open
                  </CustomButton>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
