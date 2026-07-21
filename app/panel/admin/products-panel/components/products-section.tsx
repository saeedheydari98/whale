"use client";

import { useMemo, useState } from "react";
import { IoCreateOutline, IoSearchOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
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
  onPreview: (imageUrl?: string) => void;
  onReorderProducts: (sourceId: number | string, targetId: number | string) => void;
  isLoading?: boolean;
};

export function ProductsSection({
  products,
  brands,
  draggingProductId,
  setDraggingProductId,
  onEditProduct,
  onPreview,
  onReorderProducts,
  isLoading = false,
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
  const shouldShowSkeletonCards = isLoading && visibleProducts.length === 0;

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
          disabled={isLoading}
          icon={<IoSearchOutline />}
          className="min-w-56"
        />
        {searchQuery.trim() ? (
          <CustomButton size="sm" rounded="full" variant="neutral" onClick={() => setSearchQuery("")}>
            <span>پاک کردن</span>
          </CustomButton>
        ) : null}
        <Loading loading="skeleton-item" isLoading={isLoading}>
          <span className="text-xs font-semibold text-secondary-text">{visibleProducts.length} محصول</span>
        </Loading>
      </div>

      {!isLoading && visibleProducts.length === 0 ? (
        <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
          {searchQuery.trim() ? "محصولی با این جستجو پیدا نشد." : "هنوز محصولی ثبت نشده است."}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        {shouldShowSkeletonCards ? (
          [0, 1, 2, 3, 4, 5].map((item) => (
            <Loading key={item} loading="skeleton-card" isLoading className="h-16 w-full max-w-64">
              <div className="h-16 w-full max-w-64 rounded-lg border border-primary-border bg-primary-card" />
            </Loading>
          ))
        ) : null}

        {visibleProducts.map((product) => {
          const productBrandTitle = brandTitleById.get(product.brand);

          return (
            <div
              key={product.id}
              draggable={!isLoading}
              onDragStart={(event) => {
                if (isLoading) return;
                setDraggingProductId(product.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(product.id));
              }}
              onDragOver={(event) => {
                if (isLoading) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                if (isLoading) return;
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("text/plain") || draggingProductId;
                if (sourceId) void onReorderProducts(sourceId, product.id);
                setDraggingProductId(null);
              }}
              onDragEnd={() => setDraggingProductId(null)}
              className={`flex w-full max-w-64 rounded-lg border bg-primary-card p-2 shadow-sm ${
                isLoading
                  ? "cursor-default border-border-default"
                  : draggingProductId === product.id
                    ? "cursor-grab border-primary opacity-70 active:cursor-grabbing"
                    : "cursor-grab border-primary-border active:cursor-grabbing"
              }`}
            >
              <div className="flex w-full items-center gap-2.5 text-right">
                <Loading loading="skeleton-item" isLoading={isLoading} className="h-12 w-12 shrink-0">
                  <button
                    type="button"
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
                    onClick={() => onPreview(product.imageUrl)}
                    disabled={isLoading || !product.imageUrl}
                    aria-label="باز کردن تصویر محصول"
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-secondary-text">بدون تصویر</span>
                    )}
                  </button>
                </Loading>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col gap-0.5 text-right"
                  onClick={() => onEditProduct(product)}
                  disabled={isLoading}
                  aria-label={`ویرایش ${product.title || "محصول"}`}
                >
                  <Loading loading="skeleton-item" isLoading={isLoading}>
                    <div className="line-clamp-1 text-sm font-bold text-primary-text">{product.title || "محصول بدون عنوان"}</div>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading={isLoading}>
                    <span className="text-xs text-secondary-text">{formatPrice(product.discountPrice || product.price) || "بدون قیمت"}</span>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading={isLoading}>
                    <span className="text-xs text-secondary-text">{productBrandTitle || "بدون برند"}</span>
                  </Loading>
                </button>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <button
                    type="button"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-border bg-primary-soft text-primary"
                    onClick={() => onEditProduct(product)}
                    disabled={isLoading}
                    aria-label={`ویرایش ${product.title || "محصول"}`}
                  >
                    <IoCreateOutline aria-hidden="true" />
                  </button>
                </Loading>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
