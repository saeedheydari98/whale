"use client";

import { useEffect, useMemo, useState } from "react";
import { IoCreateOutline, IoSearchOutline } from "react-icons/io5";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { AppImage } from "@/app/design-system/components/ui/app-image";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
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
  isLoadingMore?: boolean;
  totalCount?: number;
  hasMore?: boolean;
  onCapacityChange?: (capacity: number) => void;
  onLoadMore?: () => void;
  onNeedAllItems?: () => void;
};

const loadingProduct: ProductForm = {
  id: "loading-product", showcaseId: "", showcaseIds: [], title: "محصول", description: "", slug: "loading-product",
  price: "0", originalPrice: "", discountPrice: "", discountPercent: "", imageUrl: "", images: [], videoUrl: "",
  badge: "", ctaLabel: "", ctaHref: "", active: true, isActive: true, isFeatured: false, isAvailable: true,
  stockQuantity: 0, stockStatus: "", minOrder: 1, maxOrder: 1, weight: "", length: "", width: "", height: "",
  salesCount: 0, views: 0, wishlistCount: 0, ratingAverage: "0", ratingCount: 0, discountStartAt: "", discountEndAt: "",
  categoryId: "", categoryIds: [], manufactureYear: "", brand: "", vendor: "", sku: "", barcode: "", metaTitle: "",
  metaDescription: "", metaKeywords: "", placement: "", publishedAt: "", deletedAt: "", colorStock: {}, sortOrder: 0,
};

export function ProductsSection({ products, brands, draggingProductId, setDraggingProductId, onEditProduct, onPreview, onReorderProducts, isLoading = false, isLoadingMore = false, totalCount, hasMore = false, onCapacityChange, onLoadMore, onNeedAllItems }: ProductsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const brandTitleById = useMemo(() => new Map(brands.flatMap((brand): Array<[string, string]> => [[brand.id, brand.title], [brand.title, brand.title]])), [brands]);
  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) return products;
    return products.filter((product) => {
      const searchText = [product.id, product.title, product.description, product.slug, product.price, product.discountPrice, product.originalPrice, product.badge, product.vendor, product.sku, product.barcode, product.categoryId, product.categoryIds.join(" "), product.showcaseId, product.showcaseIds.join(" "), brandTitleById.get(product.brand), product.brand].filter(Boolean).join(" ").toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [brandTitleById, products, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim() && hasMore) onNeedAllItems?.();
  }, [hasMore, onNeedAllItems, searchQuery]);

  const renderCard = (product: ProductForm) => (
    <ProductAdminCard product={product} productBrandTitle={brandTitleById.get(product.brand)} draggingProductId={draggingProductId} setDraggingProductId={setDraggingProductId} onEditProduct={onEditProduct} onPreview={onPreview} onReorderProducts={onReorderProducts} />
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <CustomInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="جستجو..." aria-label="جستجو در محصولات" showLabel={false} fullWidth={false} size="sm" rounded="full" icon={<IoSearchOutline />} className="min-w-56" />
        {searchQuery.trim() ? <CustomButton size="sm" rounded="full" variant="neutral" onClick={() => setSearchQuery("")}><span>پاک کردن</span></CustomButton> : null}
        <span className="text-xs font-semibold text-secondary-text">{visibleProducts.length} محصول</span>
      </div>

      {!isLoading && visibleProducts.length === 0 ? <CustomEmptyState description={searchQuery.trim() ? "نتیجه‌ای با این جست‌وجو پیدا نشد." : "هنوز محصولی ثبت نشده است."} /> : null}

      <DynamicLoadingCollection
        items={visibleProducts}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        totalCount={searchQuery.trim() ? visibleProducts.length : totalCount}
        hasMore={searchQuery.trim() ? false : hasMore}
        onCapacityChange={searchQuery.trim() ? undefined : onCapacityChange}
        onLoadMore={searchQuery.trim() ? undefined : onLoadMore}
        className="flex flex-wrap gap-2.5"
        getKey={(product) => product.id}
        lazy
        renderItem={renderCard}
        renderSkeleton={() => (
          <Loading loading="skeleton-structure" isLoading>
            <ProductAdminCard product={loadingProduct} productBrandTitle="برند" draggingProductId={null} setDraggingProductId={() => undefined} onEditProduct={() => undefined} onPreview={() => undefined} onReorderProducts={() => undefined} />
          </Loading>
        )}
      />
    </div>
  );
}

function ProductAdminCard({ product, productBrandTitle, draggingProductId, setDraggingProductId, onEditProduct, onPreview, onReorderProducts }: {
  product: ProductForm; productBrandTitle?: string; draggingProductId: number | string | null;
  setDraggingProductId: (id: number | string | null) => void; onEditProduct: (product: ProductForm) => void;
  onPreview: (imageUrl?: string) => void; onReorderProducts: (sourceId: number | string, targetId: number | string) => void;
}) {
  return (
    <div draggable onDragStart={(event) => { setDraggingProductId(product.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(product.id)); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain") || draggingProductId; if (sourceId) void onReorderProducts(sourceId, product.id); setDraggingProductId(null); }} onDragEnd={() => setDraggingProductId(null)} className={`flex h-16 w-64 shrink-0 overflow-hidden rounded-lg border bg-primary-card p-2 shadow-sm ${draggingProductId === product.id ? "cursor-grab border-primary opacity-70 active:cursor-grabbing" : "cursor-grab border-primary-border active:cursor-grabbing"}`}>
      <div className="flex w-full items-center gap-2.5 text-right">
        <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media" onClick={() => onPreview(product.imageUrl)} disabled={!product.imageUrl} aria-label="باز کردن تصویر محصول">
          {product.imageUrl ? <AppImage src={product.imageUrl} alt={product.title} width={112} height={112} className="h-full w-full object-cover" /> : <span className="text-[10px] text-secondary-text">بدون تصویر</span>}
        </button>
        <button type="button" className="flex min-w-0 flex-1 flex-col gap-0.5 text-right" onClick={() => onEditProduct(product)} aria-label={`ویرایش ${product.title || "محصول"}`}>
          <div className="line-clamp-1 text-sm font-bold text-primary-text">{product.title || "محصول بدون عنوان"}</div>
          <span className="line-clamp-1 text-xs text-secondary-text">{formatPrice(product.discountPrice || product.price) || "بدون قیمت"}{productBrandTitle ? ` · ${productBrandTitle}` : ""}</span>
        </button>
        <button type="button" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-border bg-primary-soft text-primary" onClick={() => onEditProduct(product)} aria-label={`ویرایش ${product.title || "محصول"}`}><IoCreateOutline aria-hidden="true" /></button>
      </div>
    </div>
  );
}
