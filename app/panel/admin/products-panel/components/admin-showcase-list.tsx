"use client";

import { IoCreateOutline, IoImageOutline, IoTrashOutline } from "react-icons/io5";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { AppImage } from "@/app/design-system/components/ui/app-image";
import { AppHeading } from "@/app/design-system/components/ui/text";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import type { AdminCountItem } from "@/lib/admin-structure";
import type { ProductForm, ShowcaseForm } from "../types";
import { getShowcaseProductsForAdmin } from "../utils";

type AdminShowcaseListProps = {
  products: ProductForm[]; showcases: ShowcaseForm[]; onEditShowcase: (showcase: ShowcaseForm) => void;
  onDeleteShowcase: (showcase: ShowcaseForm) => void;
  onReorderProducts: (showcase: ShowcaseForm, sourceProductId: number | string, targetProductId: number | string) => void;
  onPreview: (imageUrl?: string) => void; formatPrice: (value?: string) => string; isLoading?: boolean;
  isLoadingMore?: boolean;
  totalCount?: number;
  hasMore?: boolean;
  onCapacityChange?: (capacity: number) => void;
  onLoadMore?: () => void;
  showcaseCounts?: AdminCountItem[];
};

const loadingShowcase: ShowcaseForm = { id: "loading-showcase", title: "ویترین", active: true, mode: "manual", autoSort: "", limit: 1, categoryId: "", manualProductIds: [], sortOrder: 0 };
const loadingProduct = { id: "loading-product", title: "محصول", price: "0", discountPrice: "", imageUrl: "" } as ProductForm;

export function AdminShowcaseList({ products, showcases, onEditShowcase, onDeleteShowcase, onReorderProducts, onPreview, formatPrice, isLoading = false, isLoadingMore = false, totalCount, hasMore = false, onCapacityChange, onLoadMore, showcaseCounts }: AdminShowcaseListProps) {
  const renderShowcase = (showcase: ShowcaseForm, loadingCard = false) => (
    <ShowcaseCard showcase={showcase} products={loadingCard ? [] : getShowcaseProductsForAdmin(products, showcase)} isLoading={loadingCard} productCount={showcaseCounts?.find((item) => item.id === showcase.id)?.count ?? showcase.productCount} onEditShowcase={onEditShowcase} onDeleteShowcase={onDeleteShowcase} onReorderProducts={onReorderProducts} onPreview={onPreview} formatPrice={formatPrice} />
  );

  return (
    <DynamicLoadingCollection
      items={showcases}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      totalCount={totalCount}
      hasMore={hasMore}
      onCapacityChange={onCapacityChange}
      onLoadMore={onLoadMore}
      className="flex flex-col gap-5"
      getKey={(showcase) => showcase.id}
      lazy
      renderItem={(showcase) => renderShowcase(showcase)}
      renderSkeleton={(index) => {
        const counted = showcaseCounts?.[index];
        return (
          <Loading loading="skeleton-structure" isLoading>
            {renderShowcase({ ...loadingShowcase, id: counted?.id ?? loadingShowcase.id, productCount: counted?.count }, true)}
          </Loading>
        );
      }}
    />
  );
}

function ShowcaseCard({ showcase, products, isLoading, productCount, onEditShowcase, onDeleteShowcase, onReorderProducts, onPreview, formatPrice }: {
  showcase: ShowcaseForm; products: ProductForm[]; isLoading: boolean; productCount?: number; onEditShowcase: (showcase: ShowcaseForm) => void;
  onDeleteShowcase: (showcase: ShowcaseForm) => void;
  onReorderProducts: (showcase: ShowcaseForm, sourceProductId: number | string, targetProductId: number | string) => void;
  onPreview: (imageUrl?: string) => void; formatPrice: (value?: string) => string;
}) {
  const knownProductCount = Number.isFinite(Number(productCount)) ? Number(productCount) : products.length;
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <AppHeading level={3} className="text-xl font-bold text-primary-text">{showcase.title || "ویترین بدون عنوان"}</AppHeading>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs font-semibold text-primary-text">{Math.max(products.length, knownProductCount)} محصول</span>
          <CustomButton variant="edit" rounded="full" size="sm" icon={<IoCreateOutline />} disabled={isLoading} onClick={() => onEditShowcase(showcase)}><span>ویرایش</span></CustomButton>
          <CustomButton variant="danger" rounded="full" size="sm" icon={<IoTrashOutline />} disabled={isLoading} onClick={() => onDeleteShowcase(showcase)}><span>حذف</span></CustomButton>
        </div>
      </div>

      {!isLoading && products.length === 0 ? <CustomEmptyState description="یک محصول به این ویترین اضافه کنید." size="sm" className="min-h-36 min-w-56 max-w-56 shrink-0 justify-center border-dashed" /> : null}
      <DynamicLoadingCollection
        items={products}
        isLoading={isLoading}
        totalCount={Number.isFinite(knownProductCount) ? knownProductCount : (isLoading ? undefined : products.length)}
        className="flex cursor-grab gap-3 overflow-x-auto overscroll-x-contain pb-2 active:cursor-grabbing"
        getKey={(product) => product.id}
        lazy
        renderItem={(product, index) => <ShowcaseProductCard product={product} index={index} showcase={showcase} onReorderProducts={onReorderProducts} onPreview={onPreview} formatPrice={formatPrice} />}
        renderSkeleton={(index) => <Loading loading="skeleton-structure" isLoading><ShowcaseProductCard product={loadingProduct} index={index} showcase={showcase} onReorderProducts={() => undefined} onPreview={() => undefined} formatPrice={formatPrice} /></Loading>}
      />
    </div>
  );
}

function ShowcaseProductCard({ product, index, showcase, onReorderProducts, onPreview, formatPrice }: {
  product: ProductForm; index: number; showcase: ShowcaseForm;
  onReorderProducts: (showcase: ShowcaseForm, sourceProductId: number | string, targetProductId: number | string) => void;
  onPreview: (imageUrl?: string) => void; formatPrice: (value?: string) => string;
}) {
  return (
    <div draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(product.id)); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain"); if (sourceId) onReorderProducts(showcase, sourceId, product.id); }} className="flex min-w-56 max-w-56 shrink-0 cursor-grab flex-col overflow-hidden rounded-lg border border-primary-border bg-primary-card shadow-sm active:cursor-grabbing">
      <div className="flex gap-2 p-2">
        <button type="button" className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media" onClick={() => onPreview(product.imageUrl)} disabled={!product.imageUrl} aria-label="باز کردن تصویر محصول">
          {product.imageUrl ? <AppImage src={product.imageUrl} alt={product.title || `محصول ${index + 1}`} width={96} height={96} className="h-full w-full object-cover" /> : <IoImageOutline className="text-3xl text-primary" aria-hidden="true" />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <AppHeading level={4} className="line-clamp-1 text-xs font-bold text-primary-text">{product.title || `محصول ${index + 1}`}</AppHeading>
          <div className="text-xs font-semibold text-primary">{formatPrice(product.discountPrice || product.price) || "بدون قیمت"}</div>
        </div>
      </div>
    </div>
  );
}
