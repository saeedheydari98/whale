"use client";

import { IoSaveOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import type { CategoryForm, ProductForm, ProductRelationMode, ShowcaseForm } from "../types";

type ProductRelationModalProps = {
  product: ProductForm | null;
  mode: ProductRelationMode;
  categories: CategoryForm[];
  showcases: ShowcaseForm[];
  categoryIds: string[];
  showcaseIds: string[];
  onClose: () => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleShowcase: (showcaseId: string) => void;
  onSubmit: () => void;
};

export function ProductRelationModal({
  product,
  mode,
  categories,
  showcases,
  categoryIds,
  showcaseIds,
  onClose,
  onToggleCategory,
  onToggleShowcase,
  onSubmit,
}: ProductRelationModalProps) {
  return (
    <CustomModal
      open={Boolean(product)}
      onClose={onClose}
      title={mode === "category" ? "دسته‌بندی‌های محصول" : "ویترین‌های محصول"}
      rounded="lg"
      shadow="lg"
    >
      {product ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-bold text-primary-text">{product.title || "محصول بدون عنوان"}</div>
            <span className="text-xs text-secondary-text">
              {mode === "category" ? "حداقل یک دسته‌بندی باید فعال بماند." : "انتخاب ویترین اختیاری است."}
            </span>
          </div>

          {mode === "category" ? (
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => {
                const selected = categoryIds.includes(category.id);
                const isLastCategory = selected && categoryIds.length <= 1;
                return (
                  <CategoryOption
                    key={category.id}
                    label={category.title}
                    imageUrl={category.imageUrl}
                    selected={selected}
                    size="sm"
                    disabled={isLastCategory}
                    onClick={() => onToggleCategory(category.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {showcases.length === 0 ? (
                <div className="rounded-md border border-primary-border bg-primary-card p-3 text-sm text-secondary-text">
                  ویترینی وجود ندارد.
                </div>
              ) : null}
              {showcases.map((showcase) => {
                const selected = showcaseIds.includes(showcase.id);
                return (
                  <CustomButton
                    key={showcase.id}
                    variant={selected ? "primary" : "neutral"}
                    unstyled={!selected}
                    className={!selected ? "border-primary-border bg-primary-card text-secondary-text" : undefined}
                    onClick={() => onToggleShowcase(showcase.id)}
                  >
                    {showcase.title || "ویترین بدون عنوان"}
                  </CustomButton>
                );
              })}
            </div>
          )}

          <CustomButton fullWidth icon={<IoSaveOutline />} onClick={() => void onSubmit()}>
            تایید
          </CustomButton>
        </div>
      ) : null}
    </CustomModal>
  );
}
