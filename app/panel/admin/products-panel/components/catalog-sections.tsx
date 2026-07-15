"use client";

import { IoAdd } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import type { BrandForm, CatalogLinkGroupForm, CategoryForm, ProductForm } from "../types";

type CategoriesSectionProps = {
  groups: CatalogLinkGroupForm[];
  categories: CategoryForm[];
  products: ProductForm[];
  onEditGroup: (group: CatalogLinkGroupForm) => void;
  onAddCategory: (groupId?: string) => void;
  onEditCategory: (category: CategoryForm) => void;
};

export function CategoriesSection({ groups, categories, products, onEditGroup, onAddCategory, onEditCategory }: CategoriesSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const groupCategories = categories.filter((category) => category.groupId === group.id);

        return (
          <div key={group.id} className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-bold text-primary-text">{group.title}</div>
                <span className="text-xs text-secondary-text">{groupCategories.length} دسته بندی</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <CustomButton size="sm" variant="edit" onClick={() => onEditGroup(group)}>
                  ویرایش بخش
                </CustomButton>
                <CustomButton size="sm" icon={<IoAdd />} onClick={() => onAddCategory(group.id)}>
                  افزودن دسته بندی
                </CustomButton>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1">
              {groupCategories.length === 0 ? (
                <div className="rounded-md border border-dashed border-primary-border bg-primary-card p-3 text-xs text-secondary-text">
                  لینکی در این بخش نیست.
                </div>
              ) : null}
              {groupCategories.map((category) => (
                <div key={category.id} className="flex min-w-44 shrink-0 flex-col gap-2 rounded-lg border border-primary-border bg-primary-card p-2 shadow-sm">
                  <CategoryOption label={category.title} imageUrl={category.imageUrl} size="sm" />
                  <div className="flex gap-2">
                    <CustomButton size="sm" variant="edit" onClick={() => onEditCategory(category)}>
                      ویرایش
                    </CustomButton>
                    <div className="flex items-center rounded-md border border-primary-border px-2 text-xs font-semibold text-secondary-text">
                      {products.length > 0
                        ? products.filter((product) => product.categoryIds.includes(category.id)).length
                        : category.productCount ?? 0} محصول
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

type BrandsSectionProps = {
  groups: CatalogLinkGroupForm[];
  brands: BrandForm[];
  products: ProductForm[];
  onEditGroup: (group: CatalogLinkGroupForm) => void;
  onAddBrand: (groupId?: string) => void;
  onEditBrand: (brand: BrandForm) => void;
};

export function BrandsSection({ groups, brands, products, onEditGroup, onAddBrand, onEditBrand }: BrandsSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const groupBrands = brands.filter((brand) => brand.groupId === group.id);

        return (
          <div key={group.id} className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-bold text-primary-text">{group.title}</div>
                <span className="text-xs text-secondary-text">{groupBrands.length} برند</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <CustomButton size="sm" variant="edit" onClick={() => onEditGroup(group)}>
                  ویرایش بخش
                </CustomButton>
                <CustomButton size="sm" icon={<IoAdd />} onClick={() => onAddBrand(group.id)}>
                  افزودن برند
                </CustomButton>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1">
              {groupBrands.length === 0 ? (
                <div className="rounded-md border border-dashed border-primary-border bg-primary-card p-3 text-xs text-secondary-text">
                  لینکی در این بخش نیست.
                </div>
              ) : null}
              {groupBrands.map((brand) => (
                <div key={brand.id} className="flex min-w-44 shrink-0 flex-col gap-2 rounded-lg border border-primary-border bg-primary-card p-2 shadow-sm">
                  <CategoryOption label={brand.title} imageUrl={brand.imageUrl} size="sm" />
                  <div className="flex gap-2">
                    <CustomButton size="sm" variant="edit" onClick={() => onEditBrand(brand)}>
                      ویرایش
                    </CustomButton>
                    <div className="flex items-center rounded-md border border-primary-border px-2 text-xs font-semibold text-secondary-text">
                      {products.length > 0
                        ? products.filter((product) => product.brand === brand.id).length
                        : brand.productCount ?? 0} محصول
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
