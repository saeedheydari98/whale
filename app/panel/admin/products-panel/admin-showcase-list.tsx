"use client";

import { IoCreateOutline, IoImageOutline, IoTrashOutline } from "react-icons/io5";
import type { MouseEvent } from "react";
import { CustomButton } from "../../../design-system/components/ui/button";
import Loading from "@/app/design-system/components/loading/loading";
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
  isLoading?: boolean;
};

function priceValue(value?: string) {
  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortedByRule(products: ProductForm[], sort: string) {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "cheapest":
        return priceValue(a.discountPrice || a.price) - priceValue(b.discountPrice || b.price);
      case "expensive":
        return priceValue(b.discountPrice || b.price) - priceValue(a.discountPrice || a.price);
      case "oldest":
        return Number(a.id) - Number(b.id);
      case "bestseller":
        return b.salesCount - a.salesCount;
      case "mostDiscounted":
        return Number(b.discountPercent || 0) - Number(a.discountPercent || 0);
      case "newest":
      default:
        return Number(b.id) - Number(a.id);
    }
  });
}

function getShowcaseProducts(products: ProductForm[], showcase: ShowcaseForm) {
  const activeProducts = products.filter((product) => product.isActive !== false);
  if (showcase.mode === "auto") {
    const filtered = activeProducts.filter((product) => !showcase.categoryId || product.categoryId === showcase.categoryId);
    return sortedByRule(filtered, showcase.autoSort).slice(0, Math.max(1, showcase.limit));
  }

  const manualIds = showcase.manualProductIds.map((item) => String(item));
  if (manualIds.length > 0) {
    return manualIds
      .map((id) => activeProducts.find((product) => String(product.id) === id))
      .filter(Boolean) as ProductForm[];
  }

  return activeProducts.filter((product) => product.showcaseId === showcase.id);
}

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
  isLoading = false,
}: AdminShowcaseListProps) {
  return (
    <div className="flex flex-col gap-5">
      {showcases.map((showcase) => {
        const showcaseProducts = getShowcaseProducts(products, showcase);

        return (
          <div
            key={showcase.id}
            className={`flex w-full flex-col gap-3 rounded-xl border bg-primary-soft p-4 ${
              isLoading ? "border-border-default" : "border-primary-border"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <div className="text-xl font-bold text-primary-text">{showcase.title || "Untitled showcase"}</div>
                </Loading>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <span className="text-xs font-semibold text-primary-text">{showcaseProducts.length} items</span>
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
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
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <CustomButton
                    variant="danger"
                    rounded="full"
                    size="sm"
                    border="base"
                    icon={<IoTrashOutline />}
                    onClick={() => onDeleteShowcase(showcase)}
                  >
                    Delete
                  </CustomButton>
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
              {showcaseProducts.length === 0 && (
                <div
                  className={`flex min-h-48 min-w-90 max-w-90 shrink-0 flex-col justify-center gap-2 rounded-lg border border-dashed bg-primary-card p-5 ${
                    isLoading ? "border-border-default" : "border-primary-border"
                  }`}
                >
                  <Loading loading="skeleton-item" isLoading={isLoading}>
                    <div className="text-xs font-bold text-primary-text">Empty showcase</div>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading={isLoading}>
                    <span className="text-[11px] text-secondary-text">Add a product to this showcase.</span>
                  </Loading>
                </div>
              )}

              {showcaseProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={`flex min-h-48 min-w-90 max-w-90 shrink-0 flex-col overflow-hidden rounded-lg border bg-primary-card shadow-sm ${
                    isLoading ? "border-border-default" : "border-primary-border"
                  }`}
                >
                  <div className="flex min-h-36 flex-1 gap-3 p-3">
                    <button
                      type="button"
                      className="flex min-h-28 w-1/3 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
                      onClick={() => onPreview(product.imageUrl)}
                      disabled={isLoading || !product.imageUrl}
                      aria-label="Open product image"
                    >
                      <Loading loading="skeleton-item" isLoading={isLoading} className="h-full w-full">
                        <div className="flex h-full w-full items-center justify-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title || `Product ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <IoImageOutline className="text-4xl text-primary" aria-hidden="true" />
                          )}
                        </div>
                      </Loading>
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <div className="line-clamp-1 text-sm font-bold text-primary-text">
                          {product.title || `Product ${index + 1}`}
                        </div>
                      </Loading>
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <span className="line-clamp-2 text-xs leading-5 text-secondary-text">
                          {product.description || "No description"}
                        </span>
                      </Loading>
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <div className="text-sm font-semibold text-primary">
                          {formatPrice(product.discountPrice || product.price) || "No price"}
                        </div>
                      </Loading>
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <span className="text-xs font-semibold text-secondary-text">
                          {product.isActive ? "Active" : "Hidden"}{product.isFeatured ? " / Featured" : ""}
                        </span>
                      </Loading>
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <span className="text-xs font-semibold text-secondary-text">
                          Stock: {product.stockQuantity} / {product.stockStatus}
                        </span>
                      </Loading>
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <span className="text-xs font-semibold text-secondary-text">
                          Category: {product.categoryId}
                        </span>
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
                        fullWidth
                        border="base"
                        rounded="md"
                        size="sm"
                        variant={product.isActive ? "primary" : "neutral"}
                        icon={<IoCreateOutline />}
                        onClick={() => onEditProduct(product)}
                      >
                        Open
                      </CustomButton>
                    </Loading>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
