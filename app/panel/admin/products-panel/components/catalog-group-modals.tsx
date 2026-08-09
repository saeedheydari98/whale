"use client";

import type { Dispatch, SetStateAction } from "react";
import { IoSaveOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import type { BrandForm, CatalogLinkGroupForm, CategoryForm } from "../types";
import { AdminModalSection } from "./admin-modal-section";

type CatalogGroupModalsProps = {
  categories: CategoryForm[];
  brands: BrandForm[];
  draftCategoryGroup: CatalogLinkGroupForm;
  draftBrandGroup: CatalogLinkGroupForm;
  editingCategoryGroup: CatalogLinkGroupForm | null;
  editingBrandGroup: CatalogLinkGroupForm | null;
  categoryGroupLinkIds: string[];
  brandGroupLinkIds: string[];
  isCategoryGroupOpen: boolean;
  isBrandGroupOpen: boolean;
  isEditCategoryGroupOpen: boolean;
  isEditBrandGroupOpen: boolean;
  hasRequiredError: (key: string) => boolean;
  setDraftCategoryGroup: Dispatch<SetStateAction<CatalogLinkGroupForm>>;
  setDraftBrandGroup: Dispatch<SetStateAction<CatalogLinkGroupForm>>;
  setEditingCategoryGroup: Dispatch<SetStateAction<CatalogLinkGroupForm | null>>;
  setEditingBrandGroup: Dispatch<SetStateAction<CatalogLinkGroupForm | null>>;
  setCategoryGroupLinkIds: Dispatch<SetStateAction<string[]>>;
  setBrandGroupLinkIds: Dispatch<SetStateAction<string[]>>;
  onCloseCategoryGroup: () => void;
  onCloseBrandGroup: () => void;
  onCloseEditCategoryGroup: () => void;
  onCloseEditBrandGroup: () => void;
  onSubmitCategoryGroup: () => void;
  onSubmitBrandGroup: () => void;
  onSubmitEditCategoryGroup: () => void;
  onSubmitEditBrandGroup: () => void;
};

export function CatalogGroupModals(props: CatalogGroupModalsProps) {
  return (
    <>
      <CatalogGroupModal
        open={props.isCategoryGroupOpen}
        onClose={props.onCloseCategoryGroup}
        title="ثبت بخش دسته‌بندی"
        item={props.draftCategoryGroup}
        titlePlaceholder="نام بخش دسته‌بندی"
        errorKey="draftCategoryGroup.title"
        hasRequiredError={props.hasRequiredError}
        linkOptions={props.categories}
        selectedIds={props.categoryGroupLinkIds}
        setSelectedIds={props.setCategoryGroupLinkIds}
        onPatch={(patch) => props.setDraftCategoryGroup((current) => ({ ...current, ...patch }))}
        onSubmit={props.onSubmitCategoryGroup}
      />
      <CatalogGroupModal
        open={props.isEditCategoryGroupOpen}
        onClose={props.onCloseEditCategoryGroup}
        title={props.editingCategoryGroup?.title || "ویرایش بخش دسته‌بندی"}
        item={props.editingCategoryGroup}
        titlePlaceholder="نام بخش دسته‌بندی"
        errorKey="editingCategoryGroup.title"
        hasRequiredError={props.hasRequiredError}
        linkOptions={props.categories}
        selectedIds={props.categoryGroupLinkIds}
        setSelectedIds={props.setCategoryGroupLinkIds}
        onPatch={(patch) => props.setEditingCategoryGroup((current) => current ? { ...current, ...patch } : current)}
        onSubmit={props.onSubmitEditCategoryGroup}
      />
      <CatalogGroupModal
        open={props.isBrandGroupOpen}
        onClose={props.onCloseBrandGroup}
        title="ثبت بخش برند"
        item={props.draftBrandGroup}
        titlePlaceholder="نام بخش برند"
        errorKey="draftBrandGroup.title"
        hasRequiredError={props.hasRequiredError}
        linkOptions={props.brands}
        selectedIds={props.brandGroupLinkIds}
        setSelectedIds={props.setBrandGroupLinkIds}
        onPatch={(patch) => props.setDraftBrandGroup((current) => ({ ...current, ...patch }))}
        onSubmit={props.onSubmitBrandGroup}
      />
      <CatalogGroupModal
        open={props.isEditBrandGroupOpen}
        onClose={props.onCloseEditBrandGroup}
        title={props.editingBrandGroup?.title || "ویرایش بخش برند"}
        item={props.editingBrandGroup}
        titlePlaceholder="نام بخش برند"
        errorKey="editingBrandGroup.title"
        hasRequiredError={props.hasRequiredError}
        linkOptions={props.brands}
        selectedIds={props.brandGroupLinkIds}
        setSelectedIds={props.setBrandGroupLinkIds}
        onPatch={(patch) => props.setEditingBrandGroup((current) => current ? { ...current, ...patch } : current)}
        onSubmit={props.onSubmitEditBrandGroup}
      />
    </>
  );
}

type LinkOption = Pick<CategoryForm | BrandForm, "id" | "title" | "imageUrl">;

type CatalogGroupModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  item: CatalogLinkGroupForm | null;
  titlePlaceholder: string;
  errorKey: string;
  hasRequiredError: (key: string) => boolean;
  linkOptions: LinkOption[];
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  onPatch: (patch: Partial<CatalogLinkGroupForm>) => void;
  onSubmit: () => void;
};

function CatalogGroupModal({
  open,
  onClose,
  title,
  item,
  titlePlaceholder,
  errorKey,
  hasRequiredError,
  linkOptions,
  selectedIds,
  setSelectedIds,
  onPatch,
  onSubmit,
}: CatalogGroupModalProps) {
  const hasTitle = Boolean(item?.title.trim());
  const hasLinks = selectedIds.length > 0;

  return (
    <CustomModal open={open} onClose={onClose} title={title} rounded="lg" shadow="lg" closeOnBackdrop={false}>
      {item ? (
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
          <AdminModalSection
            title="اطلاعات بخش"
            status={hasTitle ? "complete" : "incomplete"}
            invalid={hasRequiredError(errorKey) && !hasTitle}
            meta="نام و ترتیب نمایش"
            defaultOpen={!hasTitle}
          >
            <CustomInput
              value={item.title}
              placeholder={titlePlaceholder}
              invalid={hasRequiredError(errorKey) && !item.title.trim()}
              onChange={(event) => onPatch({ title: event.target.value })}
            />
            <CustomInput
              type="number"
              value={item.sortOrder}
              placeholder="ترتیب نمایش بخش"
              onChange={(event) => onPatch({ sortOrder: Number(event.target.value) })}
            />
          </AdminModalSection>

          <AdminModalSection
            title="لینک‌های داخل بخش"
            status={hasLinks ? "complete" : "incomplete"}
            meta={`${selectedIds.length} انتخاب`}
            defaultOpen={!hasLinks}
          >
            <div className="flex flex-wrap gap-3 rounded-md border border-primary-border p-2">
              {linkOptions.length === 0 ? (
                <span className="text-xs text-secondary-text">بعد از ساخت بخش می‌توانید لینک جدید اضافه کنید.</span>
              ) : null}
              {linkOptions.map((option) => (
                <CategoryOption
                  key={option.id}
                  label={option.title}
                  imageUrl={option.imageUrl}
                  selected={selectedIds.includes(option.id)}
                  size="sm"
                  onClick={() =>
                    setSelectedIds((current) =>
                      current.includes(option.id)
                        ? current.filter((id) => id !== option.id)
                        : [...current, option.id]
                    )
                  }
                />
              ))}
            </div>
          </AdminModalSection>

          <AdminModalSection title="وضعیت" status="optional" meta={item.active ? "فعال" : "مخفی"}>
            <CustomSwitch
              checked={item.active}
              onChange={(active) => onPatch({ active })}
              label={item.active ? "فعال" : "مخفی"}
              size="sm"
            />
          </AdminModalSection>
          <CustomButton fullWidth icon={<IoSaveOutline />} onClick={onSubmit}>
            <span>ذخیره بخش</span>
          </CustomButton>
        </div>
      ) : null}
    </CustomModal>
  );
}
