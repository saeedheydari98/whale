"use client";

import { IoCloudUploadOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import type { BrandForm, CatalogLinkGroupForm, CategoryForm } from "../types";

type CategoryBrandModalsProps = {
  categoryGroups: CatalogLinkGroupForm[];
  brandGroups: CatalogLinkGroupForm[];
  draftCategory: CategoryForm;
  draftBrand: BrandForm;
  editingCategory: CategoryForm | null;
  editingBrand: BrandForm | null;
  isCategoryOpen: boolean;
  isBrandOpen: boolean;
  isEditCategoryOpen: boolean;
  isEditBrandOpen: boolean;
  hasRequiredError: (key: string) => boolean;
  onCloseCategory: () => void;
  onCloseBrand: () => void;
  onCloseEditCategory: () => void;
  onCloseEditBrand: () => void;
  updateDraftCategory: (patch: Partial<CategoryForm>) => void;
  updateDraftBrand: (patch: Partial<BrandForm>) => void;
  updateEditingCategory: (patch: Partial<CategoryForm>) => void;
  updateEditingBrand: (patch: Partial<BrandForm>) => void;
  onCategoryImageUpload: (file: File | null, mode: "draft" | "edit") => void;
  onBrandImageUpload: (file: File | null, mode: "draft" | "edit") => void;
  onSubmitCategory: () => void;
  onSubmitBrand: () => void;
  onSubmitEditCategory: () => void;
  onSubmitEditBrand: () => void;
  onDeleteCategory: () => void;
  onDeleteBrand: () => void;
};

export function CategoryBrandModals(props: CategoryBrandModalsProps) {
  return (
    <>
      <TaxonomyModal
        open={props.isCategoryOpen}
        onClose={props.onCloseCategory}
        title="ثبت دسته‌بندی"
        item={props.draftCategory}
        groups={props.categoryGroups}
        requiredErrorKey="draftCategory.title"
        entityTitle="عنوان دسته‌بندی"
        groupAriaLabel="بخش دسته‌بندی"
        imagePlaceholder="آدرس تصویر دسته‌بندی"
        uploadLabel="بارگذاری تصویر دسته‌بندی"
        previewFallback="دسته‌بندی"
        sortPlaceholder="ترتیب نمایش"
        submitLabel="ثبت دسته‌بندی"
        onPatch={props.updateDraftCategory}
        onImageUpload={(file) => props.onCategoryImageUpload(file, "draft")}
        onSubmit={props.onSubmitCategory}
        hasRequiredError={props.hasRequiredError}
      />
      <TaxonomyModal
        open={props.isEditCategoryOpen}
        onClose={props.onCloseEditCategory}
        title={props.editingCategory?.title || "ویرایش دسته‌بندی"}
        item={props.editingCategory}
        groups={props.categoryGroups}
        requiredErrorKey="editingCategory.title"
        entityTitle="عنوان دسته‌بندی"
        groupAriaLabel="بخش دسته‌بندی"
        imagePlaceholder="آدرس تصویر دسته‌بندی"
        uploadLabel="بارگذاری تصویر دسته‌بندی"
        previewFallback="دسته‌بندی"
        sortPlaceholder="ترتیب نمایش"
        submitLabel="ذخیره دسته‌بندی"
        deleteLabel="حذف"
        onPatch={props.updateEditingCategory}
        onImageUpload={(file) => props.onCategoryImageUpload(file, "edit")}
        onSubmit={props.onSubmitEditCategory}
        onDelete={props.onDeleteCategory}
        hasRequiredError={props.hasRequiredError}
      />
      <TaxonomyModal
        open={props.isBrandOpen}
        onClose={props.onCloseBrand}
        title="ثبت برند"
        item={props.draftBrand}
        groups={props.brandGroups}
        requiredErrorKey="draftBrand.title"
        entityTitle="عنوان برند"
        groupAriaLabel="بخش برند"
        imagePlaceholder="آدرس تصویر برند"
        uploadLabel="بارگذاری تصویر برند"
        previewFallback="برند"
        sortPlaceholder="ترتیب داخل برندها"
        submitLabel="ذخیره برند"
        onPatch={props.updateDraftBrand}
        onImageUpload={(file) => props.onBrandImageUpload(file, "draft")}
        onSubmit={props.onSubmitBrand}
        hasRequiredError={props.hasRequiredError}
      />
      <TaxonomyModal
        open={props.isEditBrandOpen}
        onClose={props.onCloseEditBrand}
        title={props.editingBrand?.title || "ویرایش برند"}
        item={props.editingBrand}
        groups={props.brandGroups}
        requiredErrorKey="editingBrand.title"
        entityTitle="عنوان برند"
        groupAriaLabel="بخش برند"
        imagePlaceholder="آدرس تصویر برند"
        uploadLabel="بارگذاری تصویر برند"
        previewFallback="برند"
        sortPlaceholder="ترتیب داخل برندها"
        submitLabel="ذخیره تغییرات"
        deleteLabel="حذف برند"
        onPatch={props.updateEditingBrand}
        onImageUpload={(file) => props.onBrandImageUpload(file, "edit")}
        onSubmit={props.onSubmitEditBrand}
        onDelete={props.onDeleteBrand}
        hasRequiredError={props.hasRequiredError}
      />
    </>
  );
}

type TaxonomyItem = CategoryForm | BrandForm;

type TaxonomyModalProps<TItem extends TaxonomyItem> = {
  open: boolean;
  onClose: () => void;
  title: string;
  item: TItem | null;
  groups: CatalogLinkGroupForm[];
  requiredErrorKey: string;
  entityTitle: string;
  groupAriaLabel: string;
  imagePlaceholder: string;
  uploadLabel: string;
  previewFallback: string;
  sortPlaceholder: string;
  submitLabel: string;
  deleteLabel?: string;
  hasRequiredError: (key: string) => boolean;
  onPatch: (patch: Partial<TItem>) => void;
  onImageUpload: (file: File | null) => void;
  onSubmit: () => void;
  onDelete?: () => void;
};

function TaxonomyModal<TItem extends TaxonomyItem>({
  open,
  onClose,
  title,
  item,
  groups,
  requiredErrorKey,
  entityTitle,
  groupAriaLabel,
  imagePlaceholder,
  uploadLabel,
  previewFallback,
  sortPlaceholder,
  submitLabel,
  deleteLabel,
  hasRequiredError,
  onPatch,
  onImageUpload,
  onSubmit,
  onDelete,
}: TaxonomyModalProps<TItem>) {
  return (
    <CustomModal open={open} onClose={onClose} title={title} rounded="lg" shadow="lg">
      {item ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
          <RequiredLabel required className="text-primary-text">{entityTitle}</RequiredLabel>
          <CustomSelect value={item.groupId} aria-label={groupAriaLabel} onChange={(event) => onPatch({ groupId: event.target.value } as Partial<TItem>)}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title}
              </option>
            ))}
          </CustomSelect>
          <CustomInput
            value={item.title}
            placeholder={entityTitle}
            invalid={hasRequiredError(requiredErrorKey) && !item.title.trim()}
            onChange={(event) => onPatch({ title: event.target.value } as Partial<TItem>)}
          />
          <CustomInput value={item.slug} placeholder="Slug" onChange={(event) => onPatch({ slug: event.target.value } as Partial<TItem>)} />
          <CustomInput value={item.imageUrl} placeholder={imagePlaceholder} onChange={(event) => onPatch({ imageUrl: event.target.value } as Partial<TItem>)} />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-3 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
            <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
            <span className="text-sm font-semibold">{uploadLabel}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(event) => onImageUpload(event.target.files?.[0] ?? null)} />
          </label>
          <CategoryOption label={item.title || previewFallback} imageUrl={item.imageUrl} />
          <CustomInput type="number" value={item.sortOrder} placeholder={sortPlaceholder} onChange={(event) => onPatch({ sortOrder: Number(event.target.value) } as Partial<TItem>)} />
          <CustomSwitch checked={item.active} onChange={(active) => onPatch({ active } as Partial<TItem>)} label={item.active ? "فعال" : "مخفی"} size="sm" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <CustomButton fullWidth icon={<IoSaveOutline />} onClick={onSubmit}>
              {submitLabel}
            </CustomButton>
            {onDelete ? (
              <CustomButton variant="danger" fullWidth icon={<IoTrashOutline />} onClick={onDelete}>
                {deleteLabel}
              </CustomButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </CustomModal>
  );
}
