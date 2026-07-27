"use client";

import { IoAdd } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { resolveLoadingItemCount, useLoadingViewportCount } from "@/app/design-system/components/loading/loading-count";
import { CustomButton } from "@/app/design-system/components/ui/button";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import type { BrandForm, CatalogLinkGroupForm, CategoryForm, ProductForm } from "../types";

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
};

function createLoadingGroups(kind: "category" | "brand", count: number): CatalogLinkGroupForm[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `loading-${kind}-group-${index + 1}`,
    title: kind === "category" ? "بخش دسته‌بندی" : "بخش برند",
    active: true,
    sortOrder: index + 1,
  }));
}

function createLoadingCategories(groupId: string, count: number): CategoryForm[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${groupId}-loading-category-${index + 1}`,
    groupId,
    title: `دسته‌بندی ${index + 1}`,
    slug: "",
    imageUrl: "",
    active: true,
    productCount: 0,
    sortOrder: index + 1,
    pageSortOrder: index + 1,
  }));
}

function createLoadingBrands(groupId: string, count: number): BrandForm[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${groupId}-loading-brand-${index + 1}`,
    groupId,
    title: `برند ${index + 1}`,
    slug: "",
    imageUrl: "",
    active: true,
    productCount: 0,
    sortOrder: index + 1,
    homeSortOrder: index + 1,
  }));
}

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
}: CategoriesSectionProps) {
  const groupViewportCount = useLoadingViewportCount("admin-showcase-card");
  const itemViewportCount = useLoadingViewportCount("admin-catalog-item");
  const groupLoadingCount = resolveLoadingItemCount(groups.length || undefined, groupViewportCount);
  const displayGroups = isLoading
    ? groups.length > 0
      ? groups.slice(0, groupLoadingCount)
      : createLoadingGroups("category", groupLoadingCount)
    : groups;

  return (
    <div className="flex flex-col gap-4">
      {displayGroups.map((group) => {
        const groupCategories = categories.filter((category) => category.groupId === group.id);
        const categoryLoadingCount = resolveLoadingItemCount(groupCategories.length || undefined, itemViewportCount);
        const visibleGroupCategories = isLoading
          ? groupCategories.length > 0
            ? groupCategories.slice(0, categoryLoadingCount)
            : createLoadingCategories(group.id, categoryLoadingCount)
          : groupCategories;

        return (
          <div key={group.id} className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <div className="text-sm font-bold text-primary-text">{group.title}</div>
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <span className="text-xs text-secondary-text">{visibleGroupCategories.length} دسته بندی</span>
                </Loading>
              </div>
              <div className="flex flex-wrap gap-2">
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <CustomButton size="sm" variant="edit" disabled={isLoading} onClick={() => onEditGroup(group)}>
                    <span>ویرایش بخش</span>
                  </CustomButton>
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <CustomButton size="sm" icon={<IoAdd />} disabled={isLoading} onClick={() => onAddCategory(group.id)}>
                    <span>افزودن دسته بندی</span>
                  </CustomButton>
                </Loading>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1">
              {!isLoading && visibleGroupCategories.length === 0 ? (
                <div className="rounded-md border border-dashed border-primary-border bg-primary-card p-3 text-xs text-secondary-text">
                  لینکی در این بخش نیست.
                </div>
              ) : null}
              {visibleGroupCategories.map((category) => (
                <div
                  key={category.id}
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
                  className={`flex min-w-44 shrink-0 flex-col gap-2 rounded-lg border bg-primary-card p-2 shadow-sm ${
                    isLoading
                      ? "cursor-default border-border-default"
                      : draggingCategoryId === category.id
                        ? "cursor-grab border-primary opacity-70 active:cursor-grabbing"
                        : "cursor-grab border-primary-border active:cursor-grabbing"
                  }`}
                >
                  <Loading loading="skeleton-item" isLoading={isLoading} className="w-full">
                    <CategoryOption label={category.title} imageUrl={category.imageUrl} size="sm" onImageClick={() => onPreview(category.imageUrl)} />
                  </Loading>
                  <div className="flex gap-2">
                    <Loading loading="skeleton-item" isLoading={isLoading}>
                      <CustomButton size="sm" variant="edit" disabled={isLoading} onClick={() => onEditCategory(category)}>
                        <span>ویرایش</span>
                      </CustomButton>
                    </Loading>
                    <Loading loading="skeleton-item" isLoading={isLoading}>
                      <div className="flex items-center rounded-md border border-primary-border px-2 text-xs font-semibold text-secondary-text">
                        {products.length > 0
                          ? products.filter((product) => product.categoryIds.includes(category.id)).length
                          : category.productCount ?? 0} محصول
                      </div>
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
}: BrandsSectionProps) {
  const groupViewportCount = useLoadingViewportCount("admin-showcase-card");
  const itemViewportCount = useLoadingViewportCount("admin-catalog-item");
  const groupLoadingCount = resolveLoadingItemCount(groups.length || undefined, groupViewportCount);
  const displayGroups = isLoading
    ? groups.length > 0
      ? groups.slice(0, groupLoadingCount)
      : createLoadingGroups("brand", groupLoadingCount)
    : groups;

  return (
    <div className="flex flex-col gap-4">
      {displayGroups.map((group) => {
        const groupBrands = brands.filter((brand) => brand.groupId === group.id);
        const brandLoadingCount = resolveLoadingItemCount(groupBrands.length || undefined, itemViewportCount);
        const visibleGroupBrands = isLoading
          ? groupBrands.length > 0
            ? groupBrands.slice(0, brandLoadingCount)
            : createLoadingBrands(group.id, brandLoadingCount)
          : groupBrands;

        return (
          <div key={group.id} className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <div className="text-sm font-bold text-primary-text">{group.title}</div>
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <span className="text-xs text-secondary-text">{visibleGroupBrands.length} برند</span>
                </Loading>
              </div>
              <div className="flex flex-wrap gap-2">
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <CustomButton size="sm" variant="edit" disabled={isLoading} onClick={() => onEditGroup(group)}>
                    <span>ویرایش بخش</span>
                  </CustomButton>
                </Loading>
                <Loading loading="skeleton-item" isLoading={isLoading}>
                  <CustomButton size="sm" icon={<IoAdd />} disabled={isLoading} onClick={() => onAddBrand(group.id)}>
                    <span>افزودن برند</span>
                  </CustomButton>
                </Loading>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1">
              {!isLoading && visibleGroupBrands.length === 0 ? (
                <div className="rounded-md border border-dashed border-primary-border bg-primary-card p-3 text-xs text-secondary-text">
                  لینکی در این بخش نیست.
                </div>
              ) : null}
              {visibleGroupBrands.map((brand) => (
                <div
                  key={brand.id}
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
                  className={`flex min-w-44 shrink-0 flex-col gap-2 rounded-lg border bg-primary-card p-2 shadow-sm ${
                    isLoading
                      ? "cursor-default border-border-default"
                      : draggingBrandId === brand.id
                        ? "cursor-grab border-primary opacity-70 active:cursor-grabbing"
                        : "cursor-grab border-primary-border active:cursor-grabbing"
                  }`}
                >
                  <Loading loading="skeleton-item" isLoading={isLoading} className="w-full">
                    <CategoryOption label={brand.title} imageUrl={brand.imageUrl} size="sm" onImageClick={() => onPreview(brand.imageUrl)} />
                  </Loading>
                  <div className="flex gap-2">
                    <Loading loading="skeleton-item" isLoading={isLoading}>
                      <CustomButton size="sm" variant="edit" disabled={isLoading} onClick={() => onEditBrand(brand)}>
                        <span>ویرایش</span>
                      </CustomButton>
                    </Loading>
                    <Loading loading="skeleton-item" isLoading={isLoading}>
                      <div className="flex items-center rounded-md border border-primary-border px-2 text-xs font-semibold text-secondary-text">
                        {products.length > 0
                          ? products.filter((product) => product.brand === brand.id).length
                          : brand.productCount ?? 0} محصول
                      </div>
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
