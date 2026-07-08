"use client";

import { IoCreateOutline, IoImageOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import Loading from "@/app/design-system/components/loading/loading";
import type { ProductForm, ShowcaseForm } from "../types";
import { getShowcaseProductsForAdmin } from "../utils";

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
        const showcaseProducts = getShowcaseProductsForAdmin(products, showcase);

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
                  <div className="text-xl font-bold text-primary-text">{showcase.title || "ویترین بدون عنوان"}</div>
                </Loading>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <span className="text-xs font-semibold text-primary-text">{showcaseProducts.length} محصول</span>
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <CustomButton
                    variant="edit"
                    rounded="full"
                    size="sm"
                    icon={<IoCreateOutline />}
                    onClick={() => onEditShowcase(showcase)}
                  >
                    ویرایش
                  </CustomButton>
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <CustomButton
                    variant="danger"
                    rounded="full"
                    size="sm"
                    icon={<IoTrashOutline />}
                    onClick={() => onDeleteShowcase(showcase)}
                  >
                    حذف
                  </CustomButton>
                </Loading>
              </div>
            </div>

            <div className="flex cursor-grab gap-3 overflow-x-auto overscroll-x-contain pb-2 active:cursor-grabbing">
              {showcaseProducts.length === 0 && (
                <div
                  className={`flex min-h-36 min-w-56 max-w-56 shrink-0 flex-col justify-center gap-2 rounded-lg border border-dashed bg-primary-card p-4 ${
                    isLoading ? "border-border-default" : "border-primary-border"
                  }`}
                >
                  <Loading loading="skeleton-item" isLoading={isLoading}>
                    <div className="text-xs font-bold text-primary-text">ویترین خالی است</div>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading={isLoading}>
                    <span className="text-[11px] text-secondary-text">یک محصول به این ویترین اضافه کنید.</span>
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
                      aria-label="باز کردن تصویر محصول"
                    >
                      <Loading loading="skeleton-item" isLoading={isLoading} className="h-full w-full">
                        <div className="flex h-full w-full items-center justify-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title || `محصول ${index + 1}`}
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
                          {product.title || `محصول ${index + 1}`}
                        </div>
                      </Loading>
                      <Loading loading="skeleton-item" isLoading={isLoading}>
                        <div className="text-xs font-semibold text-primary">
                          {formatPrice(product.discountPrice || product.price) || "بدون قیمت"}
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
