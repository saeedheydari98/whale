"use client";

import { IoAdd } from "react-icons/io5";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { AppHeading } from "@/app/design-system/components/ui/text";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import type { AdminCountItem } from "@/lib/admin-structure";
import type { BrandForm, CatalogLinkGroupForm, CategoryForm, ProductForm } from "../types";

type GroupCount = AdminCountItem;

type CategoriesSectionProps = {
  groups: CatalogLinkGroupForm[];
  categories: CategoryForm[];
  products: ProductForm[];
  draggingCategoryId: string | null;
  setDraggingCategoryId: (id: string | null) => void;
  onEditGroup: (group: CatalogLinkGroupForm) => void;
  onAddCategory: (groupId?: string) => void;
  onEditCategory: (category: CategoryForm) => void;
  onPreview: (imageUrl?: string) => void;
  onReorderCategories: (sourceId: string, targetId: string) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  totalCount?: number;
  hasMore?: boolean;
  onCapacityChange?: (capacity: number) => void;
  onLoadMore?: () => void;
  groupCounts?: GroupCount[];
};

const loadingGroup: CatalogLinkGroupForm = { id: "loading-group", title: "بخش", active: true, sortOrder: 0 };
const loadingCategory: CategoryForm = {
  id: "loading-category",
  groupId: "loading-group",
  title: "دسته بندی",
  slug: "loading-category",
  imageUrl: "",
  active: true,
  sortOrder: 0,
  pageSortOrder: 0,
};
const loadingBrand: BrandForm = {
  id: "loading-brand",
  groupId: "loading-group",
  title: "برند",
  slug: "loading-brand",
  imageUrl: "",
  active: true,
  sortOrder: 0,
  homeSortOrder: 0,
};

export function CategoriesSection({
  groups,
  categories,
  products,
  draggingCategoryId,
  setDraggingCategoryId,
  onEditGroup,
  onAddCategory,
  onEditCategory,
  onPreview,
  onReorderCategories,
  isLoading = false,
  isLoadingMore = false,
  totalCount,
  hasMore = false,
  onCapacityChange,
  onLoadMore,
  groupCounts,
}: CategoriesSectionProps) {
  const renderGroup = (group: CatalogLinkGroupForm, loadingCard = false) => {
    const visibleGroupCategories = loadingCard ? [] : categories.filter((category) => category.groupId === group.id);
    const groupLoading = loadingCard || isLoading;
    const groupTotal = groupCounts?.find((item) => item.id === group.id)?.count ?? (visibleGroupCategories.length > 0 ? visibleGroupCategories.length : undefined);

    return (
      <div className="flex w-full flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <AppHeading level={3} className="text-sm font-bold text-primary-text">{group.title}</AppHeading>
              <span className="text-xs text-secondary-text">{groupTotal ?? visibleGroupCategories.length} دسته بندی</span>
            </div>
          <div className="flex flex-wrap gap-2">
            <CustomButton size="sm" variant="edit" disabled={groupLoading} onClick={() => onEditGroup(group)}>
              <span>ویرایش بخش</span>
            </CustomButton>
            <CustomButton size="sm" icon={<IoAdd />} disabled={groupLoading} onClick={() => onAddCategory(group.id)}>
              <span>افزودن دسته بندی</span>
            </CustomButton>
          </div>
        </div>
        {!groupLoading && visibleGroupCategories.length === 0 ? (
          <div className="rounded-md border border-dashed border-primary-border bg-primary-card p-3 text-xs text-secondary-text">
            لینکی در این بخش نیست.
          </div>
        ) : (
          <DynamicLoadingCollection
            items={visibleGroupCategories}
            isLoading={groupLoading}
            totalCount={groupTotal}
            className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1"
            getKey={(category) => category.id}
            lazy
            renderItem={(category) => (
              <CategoryAdminCard
                category={category}
                products={products}
                draggingCategoryId={draggingCategoryId}
                isLoading={false}
                setDraggingCategoryId={setDraggingCategoryId}
                onEditCategory={onEditCategory}
                onPreview={onPreview}
                onReorderCategories={onReorderCategories}
              />
            )}
            renderSkeleton={() => (
              <Loading loading="skeleton-structure" isLoading>
                <CategoryAdminCard
                  category={loadingCategory}
                  products={[]}
                  draggingCategoryId={null}
                  isLoading
                  setDraggingCategoryId={() => undefined}
                  onEditCategory={() => undefined}
                  onPreview={() => undefined}
                  onReorderCategories={() => undefined}
                />
              </Loading>
            )}
          />
        )}
      </div>
    );
  };

  return (
    <DynamicLoadingCollection
      items={groups}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      totalCount={totalCount}
      hasMore={hasMore}
      onCapacityChange={onCapacityChange}
      onLoadMore={onLoadMore}
      className="flex flex-col gap-4"
      getKey={(group) => group.id}
      lazy
      renderItem={(group) => renderGroup(group)}
      renderSkeleton={(index) => (
        <Loading loading="skeleton-structure" isLoading>
          {renderGroup(groupCounts?.[index] ? { ...loadingGroup, id: groupCounts[index].id } : loadingGroup, true)}
        </Loading>
      )}
    />
  );
}

function CategoryAdminCard({
  category,
  products,
  draggingCategoryId,
  isLoading,
  setDraggingCategoryId,
  onEditCategory,
  onPreview,
  onReorderCategories,
}: {
  category: CategoryForm;
  products: ProductForm[];
  draggingCategoryId: string | null;
  isLoading: boolean;
  setDraggingCategoryId: (id: string | null) => void;
  onEditCategory: (category: CategoryForm) => void;
  onPreview: (imageUrl?: string) => void;
  onReorderCategories: (sourceId: string, targetId: string) => void;
}) {
  return (
    <div
      draggable={!isLoading}
      onDragStart={(event) => {
        if (isLoading) return;
        setDraggingCategoryId(category.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", category.id);
      }}
      onDragOver={(event) => {
        if (isLoading) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        if (isLoading) return;
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/plain") || draggingCategoryId;
        if (sourceId) void onReorderCategories(sourceId, category.id);
        setDraggingCategoryId(null);
      }}
      onDragEnd={() => setDraggingCategoryId(null)}
      className={`flex h-40 w-44 shrink-0 flex-col items-center gap-1 overflow-hidden rounded-lg border bg-primary-card p-2 shadow-sm ${
        isLoading
          ? "cursor-default border-border-default"
          : draggingCategoryId === category.id
            ? "cursor-grab border-primary opacity-70 active:cursor-grabbing"
            : "cursor-grab border-primary-border active:cursor-grabbing"
      }`}
    >
      <div className="flex w-full flex-col items-center">
        <CategoryOption label={category.title} imageUrl={category.imageUrl} size="sm" shape="rounded" onImageClick={() => onPreview(category.imageUrl)} />
      </div>
      <div className="flex w-full justify-center gap-2">
        <CustomButton size="sm" variant="edit" disabled={isLoading} onClick={() => onEditCategory(category)}>
          <span>ویرایش</span>
        </CustomButton>
        <div className="flex items-center rounded-md border border-primary-border px-2 text-xs font-semibold text-secondary-text">
          {products.length > 0
            ? products.filter((product) => product.categoryIds.includes(category.id)).length
            : category.productCount ?? 0} محصول
        </div>
      </div>
    </div>
  );
}

type BrandsSectionProps = {
  groups: CatalogLinkGroupForm[];
  brands: BrandForm[];
  products: ProductForm[];
  draggingBrandId: string | null;
  setDraggingBrandId: (id: string | null) => void;
  onEditGroup: (group: CatalogLinkGroupForm) => void;
  onAddBrand: (groupId?: string) => void;
  onEditBrand: (brand: BrandForm) => void;
  onPreview: (imageUrl?: string) => void;
  onReorderBrands: (sourceId: string, targetId: string) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  totalCount?: number;
  hasMore?: boolean;
  onCapacityChange?: (capacity: number) => void;
  onLoadMore?: () => void;
  groupCounts?: GroupCount[];
};

export function BrandsSection({
  groups,
  brands,
  products,
  draggingBrandId,
  setDraggingBrandId,
  onEditGroup,
  onAddBrand,
  onEditBrand,
  onPreview,
  onReorderBrands,
  isLoading = false,
  isLoadingMore = false,
  totalCount,
  hasMore = false,
  onCapacityChange,
  onLoadMore,
  groupCounts,
}: BrandsSectionProps) {
  const renderGroup = (group: CatalogLinkGroupForm, loadingCard = false) => {
    const visibleGroupBrands = loadingCard ? [] : brands.filter((brand) => brand.groupId === group.id);
    const groupLoading = loadingCard || isLoading;
    const groupTotal = groupCounts?.find((item) => item.id === group.id)?.count ?? (visibleGroupBrands.length > 0 ? visibleGroupBrands.length : undefined);

    return (
      <div className="flex w-full flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <AppHeading level={3} className="text-sm font-bold text-primary-text">{group.title}</AppHeading>
              <span className="text-xs text-secondary-text">{groupTotal ?? visibleGroupBrands.length} برند</span>
            </div>
          <div className="flex flex-wrap gap-2">
            <CustomButton size="sm" variant="edit" disabled={groupLoading} onClick={() => onEditGroup(group)}>
              <span>ویرایش بخش</span>
            </CustomButton>
            <CustomButton size="sm" icon={<IoAdd />} disabled={groupLoading} onClick={() => onAddBrand(group.id)}>
              <span>افزودن برند</span>
            </CustomButton>
          </div>
        </div>
        {!groupLoading && visibleGroupBrands.length === 0 ? (
          <div className="rounded-md border border-dashed border-primary-border bg-primary-card p-3 text-xs text-secondary-text">
            لینکی در این بخش نیست.
          </div>
        ) : (
          <DynamicLoadingCollection
            items={visibleGroupBrands}
            isLoading={groupLoading}
            totalCount={groupTotal}
            className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1"
            getKey={(brand) => brand.id}
            lazy
            renderItem={(brand) => (
              <BrandAdminCard
                brand={brand}
                products={products}
                draggingBrandId={draggingBrandId}
                isLoading={false}
                setDraggingBrandId={setDraggingBrandId}
                onEditBrand={onEditBrand}
                onPreview={onPreview}
                onReorderBrands={onReorderBrands}
              />
            )}
            renderSkeleton={() => (
              <Loading loading="skeleton-structure" isLoading>
                <BrandAdminCard
                  brand={loadingBrand}
                  products={[]}
                  draggingBrandId={null}
                  isLoading
                  setDraggingBrandId={() => undefined}
                  onEditBrand={() => undefined}
                  onPreview={() => undefined}
                  onReorderBrands={() => undefined}
                />
              </Loading>
            )}
          />
        )}
      </div>
    );
  };

  return (
    <DynamicLoadingCollection
      items={groups}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      totalCount={totalCount}
      hasMore={hasMore}
      onCapacityChange={onCapacityChange}
      onLoadMore={onLoadMore}
      className="flex flex-col gap-4"
      getKey={(group) => group.id}
      lazy
      renderItem={(group) => renderGroup(group)}
      renderSkeleton={(index) => (
        <Loading loading="skeleton-structure" isLoading>
          {renderGroup(groupCounts?.[index] ? { ...loadingGroup, id: groupCounts[index].id } : loadingGroup, true)}
        </Loading>
      )}
    />
  );
}

function BrandAdminCard({
  brand,
  products,
  draggingBrandId,
  isLoading,
  setDraggingBrandId,
  onEditBrand,
  onPreview,
  onReorderBrands,
}: {
  brand: BrandForm;
  products: ProductForm[];
  draggingBrandId: string | null;
  isLoading: boolean;
  setDraggingBrandId: (id: string | null) => void;
  onEditBrand: (brand: BrandForm) => void;
  onPreview: (imageUrl?: string) => void;
  onReorderBrands: (sourceId: string, targetId: string) => void;
}) {
  return (
    <div
      draggable={!isLoading}
      onDragStart={(event) => {
        if (isLoading) return;
        setDraggingBrandId(brand.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", brand.id);
      }}
      onDragOver={(event) => {
        if (isLoading) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        if (isLoading) return;
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/plain") || draggingBrandId;
        if (sourceId) void onReorderBrands(sourceId, brand.id);
        setDraggingBrandId(null);
      }}
      onDragEnd={() => setDraggingBrandId(null)}
      className={`flex h-40 w-44 shrink-0 flex-col items-center gap-1 overflow-hidden rounded-lg border bg-primary-card p-2 shadow-sm ${
        isLoading
          ? "cursor-default border-border-default"
          : draggingBrandId === brand.id
            ? "cursor-grab border-primary opacity-70 active:cursor-grabbing"
            : "cursor-grab border-primary-border active:cursor-grabbing"
      }`}
    >
      <div className="flex w-full flex-col items-center">
        <CategoryOption label={brand.title} imageUrl={brand.imageUrl} size="sm" onImageClick={() => onPreview(brand.imageUrl)} />
      </div>
      <div className="flex w-full justify-center gap-2">
        <CustomButton size="sm" variant="edit" disabled={isLoading} onClick={() => onEditBrand(brand)}>
          <span>ویرایش</span>
        </CustomButton>
        <div className="flex items-center rounded-md border border-primary-border px-2 text-xs font-semibold text-secondary-text">
          {products.length > 0
            ? products.filter((product) => product.brand === brand.id).length
            : brand.productCount ?? 0} محصول
        </div>
      </div>
    </div>
  );
}
