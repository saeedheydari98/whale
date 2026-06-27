"use client";

import { IoCreateOutline, IoImageOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../../../design-system/components/ui/button";
import Loading from "@/app/design-system/components/loading/loading";
import type { ProductForm, ShowcaseForm } from "./types";

type AdminShowcaseListProps = {
  products: ProductForm[];
  showcases: ShowcaseForm[];
  onEditShowcase: (showcase: ShowcaseForm) => void;
  onDeleteShowcase: (showcase: ShowcaseForm) => void;
  onReorderProducts: (showcase: ShowcaseForm, sourceProductId: number | string, targetProductId: number | string) => void;
  onPreview: (imageUrl?: string) => void;
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
  onReorderProducts,
  onPreview,
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
                  draggable={!isLoading}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(product.id));
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = event.dataTransfer.getData("text/plain");
                    if (sourceId) onReorderProducts(showcase, sourceId, product.id);
                  }}
                  className={`flex min-w-56 max-w-56 shrink-0 cursor-grab flex-col overflow-hidden rounded-lg border bg-primary-card shadow-sm active:cursor-grabbing ${
                    isLoading ? "border-border-default" : "border-primary-border"
                  }`}
                >
                  <div className="flex gap-2 p-2">
                    <button
                      type="button"
                      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
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
                            <IoImageOutline className="text-3xl text-primary" aria-hidden="true" />
                          )}
                        </div>
                      </Loading>
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <div className="line-clamp-1 text-xs font-bold text-primary-text">
                          {product.title || `Product ${index + 1}`}
                        </div>
                      </Loading>
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <span className="line-clamp-1 text-[11px] leading-4 text-secondary-text">
                          {product.description || "No description"}
                        </span>
                      </Loading>
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <div className="text-xs font-semibold text-primary">
                          {formatPrice(product.discountPrice || product.price) || "No price"}
                        </div>
                      </Loading>
                    </div>
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
