"use client";

import { IoCreateOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import type { BrandForm, ProductForm, ProductRelationMode } from "../types";
import { formatPrice } from "../utils";

type ProductsSectionProps = {
  products: ProductForm[];
  brands: BrandForm[];
  draggingProductId: number | string | null;
  setDraggingProductId: (id: number | string | null) => void;
  onEditProduct: (product: ProductForm) => void;
  onOpenRelations: (product: ProductForm, mode: ProductRelationMode) => void;
  onReorderProducts: (sourceId: number | string, targetId: number | string) => void;
};

export function ProductsSection({
  products,
  brands,
  draggingProductId,
  setDraggingProductId,
  onEditProduct,
  onOpenRelations,
  onReorderProducts,
}: ProductsSectionProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {products.map((product) => {
        const productBrand = brands.find((brand) => brand.id === product.brand || brand.title === product.brand);

        return (
          <div
            key={product.id}
            draggable
            onDragStart={(event) => {
              setDraggingProductId(product.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(product.id));
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = event.dataTransfer.getData("text/plain") || draggingProductId;
              if (sourceId) void onReorderProducts(sourceId, product.id);
              setDraggingProductId(null);
            }}
            onDragEnd={() => setDraggingProductId(null)}
            className={`flex w-full max-w-80 cursor-grab flex-col gap-3 rounded-lg border bg-primary-card p-3 active:cursor-grabbing ${
              draggingProductId === product.id ? "border-primary opacity-70" : "border-primary-border"
            }`}
          >
            <button type="button" className="flex gap-3 text-right" onClick={() => onEditProduct(product)}>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-secondary-text">بدون تصویر</span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="line-clamp-1 text-sm font-bold text-primary-text">{product.title || "محصول بدون عنوان"}</div>
                <span className="text-xs text-secondary-text">{formatPrice(product.discountPrice || product.price) || "بدون قیمت"}</span>
                <span className="text-xs text-secondary-text">{productBrand ? productBrand.title : "بدون برند"}</span>
                <span className="text-xs text-secondary-text">{product.categoryIds.length} دسته‌بندی / {product.showcaseIds.length} ویترین</span>
              </div>
            </button>
            <div className="flex flex-wrap gap-2">
              <CustomButton size="sm" rounded="full" variant="edit" icon={<IoCreateOutline />} onClick={() => onEditProduct(product)}>
                ویرایش
              </CustomButton>
              <CustomButton size="sm" rounded="full" variant="neutral" onClick={() => onOpenRelations(product, "category")}>
                دسته‌بندی
              </CustomButton>
              <CustomButton size="sm" rounded="full" variant="neutral" onClick={() => onOpenRelations(product, "showcase")}>
                ویترین
              </CustomButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
