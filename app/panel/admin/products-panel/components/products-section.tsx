"use client";

import { useMemo, useState } from "react";
import { IoCreateOutline, IoSearchOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import type { BrandForm, ProductForm } from "../types";
import { formatPrice } from "../utils";

type ProductsSectionProps = {
  products: ProductForm[];
  brands: BrandForm[];
  draggingProductId: number | string | null;
  setDraggingProductId: (id: number | string | null) => void;
  onEditProduct: (product: ProductForm) => void;
  onReorderProducts: (sourceId: number | string, targetId: number | string) => void;
};

export function ProductsSection({
  products,
  brands,
  draggingProductId,
  setDraggingProductId,
  onEditProduct,
  onReorderProducts,
}: ProductsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const brandTitleById = useMemo(() => {
    const entries: Array<[string, string]> = brands.flatMap((brand) => [
      [brand.id, brand.title],
      [brand.title, brand.title],
    ]);
    return new Map(entries);
  }, [brands]);
  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) return products;

    return products.filter((product) => {
      const brandTitle = brandTitleById.get(product.brand) ?? "";
      const searchText = [
        product.id,
        product.title,
        product.description,
        product.slug,
        product.price,
        product.discountPrice,
        product.originalPrice,
        product.badge,
        product.vendor,
        product.sku,
        product.barcode,
        product.categoryId,
        product.categoryIds.join(" "),
        product.showcaseId,
        product.showcaseIds.join(" "),
        brandTitle,
        product.brand,
      ].filter(Boolean).join(" ").toLowerCase();

      return searchText.includes(normalizedSearch);
    });
  }, [brandTitleById, products, searchQuery]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <CustomInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="جستجو در محصولات"
          aria-label="جستجو در محصولات"
          showLabel={false}
          fullWidth={false}
          size="sm"
          rounded="full"
          icon={<IoSearchOutline />}
          className="min-w-56"
        />
        {searchQuery.trim() ? (
          <CustomButton size="sm" rounded="full" variant="neutral" onClick={() => setSearchQuery("")}>
            <span>پاک کردن</span>
          </CustomButton>
        ) : null}
        <span className="text-xs font-semibold text-secondary-text">{visibleProducts.length} محصول</span>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
          {searchQuery.trim() ? "محصولی با این جستجو پیدا نشد." : "هنوز محصولی ثبت نشده است."}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {visibleProducts.map((product) => {
          const productBrandTitle = brandTitleById.get(product.brand);

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
              className={`flex w-full max-w-80 cursor-grab flex-col gap-2 rounded-lg border bg-primary-card p-2.5 active:cursor-grabbing ${
                draggingProductId === product.id ? "border-primary opacity-70" : "border-primary-border"
              }`}
            >
              <button type="button" className="flex gap-3 text-right" onClick={() => onEditProduct(product)}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-secondary-text">بدون تصویر</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="line-clamp-1 text-sm font-bold text-primary-text">{product.title || "محصول بدون عنوان"}</div>
                  <span className="text-xs text-secondary-text">{formatPrice(product.discountPrice || product.price) || "بدون قیمت"}</span>
                  <span className="text-xs text-secondary-text">{productBrandTitle || "بدون برند"}</span>
                </div>
              </button>
              <div className="flex justify-end">
                <CustomButton size="sm" rounded="full" variant="edit" icon={<IoCreateOutline />} onClick={() => onEditProduct(product)}>
                  <span>ویرایش</span>
                </CustomButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
