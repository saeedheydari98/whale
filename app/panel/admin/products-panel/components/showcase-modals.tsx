"use client";

import { IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { SHOWCASE_SORT_OPTIONS } from "../constants";
import type { CategoryForm, ProductForm, ShowcaseForm } from "../types";
import { toggleProductId } from "../utils";

type ShowcaseModalsProps = {
  products: ProductForm[];
  categories: CategoryForm[];
  draftShowcase: ShowcaseForm;
  editingShowcase: ShowcaseForm | null;
  isShowcaseOpen: boolean;
  isEditShowcaseOpen: boolean;
  hasRequiredError: (key: string) => boolean;
  onCloseShowcase: () => void;
  onCloseEditShowcase: () => void;
  updateDraftShowcase: (patch: Partial<ShowcaseForm>) => void;
  updateEditingShowcase: (patch: Partial<ShowcaseForm>) => void;
  onSubmitShowcase: () => void;
  onSubmitEditShowcase: () => void;
  onDeleteShowcase: () => void;
};

export function ShowcaseModals(props: ShowcaseModalsProps) {
  return (
    <>
      <ShowcaseModal
        open={props.isShowcaseOpen}
        onClose={props.onCloseShowcase}
        title="Register showcase"
        showcase={props.draftShowcase}
        products={props.products}
        categories={props.categories}
        requiredErrorKey="draftShowcase.title"
        hasRequiredError={props.hasRequiredError}
        onPatch={props.updateDraftShowcase}
        onSubmit={props.onSubmitShowcase}
        submitLabel="Register showcase"
      />
      <ShowcaseModal
        open={props.isEditShowcaseOpen}
        onClose={props.onCloseEditShowcase}
        title={props.editingShowcase?.title || "ویرایش ویترین"}
        showcase={props.editingShowcase}
        products={props.products}
        categories={props.categories}
        requiredErrorKey="editingShowcase.title"
        hasRequiredError={props.hasRequiredError}
        onPatch={props.updateEditingShowcase}
        onSubmit={props.onSubmitEditShowcase}
        onDelete={props.onDeleteShowcase}
        submitLabel="ذخیره ویترین"
      />
    </>
  );
}

type ShowcaseModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  showcase: ShowcaseForm | null;
  products: ProductForm[];
  categories: CategoryForm[];
  requiredErrorKey: string;
  hasRequiredError: (key: string) => boolean;
  onPatch: (patch: Partial<ShowcaseForm>) => void;
  onSubmit: () => void;
  onDelete?: () => void;
  submitLabel: string;
};

function ShowcaseModal({
  open,
  onClose,
  title,
  showcase,
  products,
  categories,
  requiredErrorKey,
  hasRequiredError,
  onPatch,
  onSubmit,
  onDelete,
  submitLabel,
}: ShowcaseModalProps) {
  return (
    <CustomModal open={open} onClose={onClose} title={title} rounded="lg" shadow="lg">
      {showcase ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
          <RequiredLabel required className="text-primary-text">عنوان ویترین</RequiredLabel>
          <CustomInput
            value={showcase.title}
            placeholder="عنوان ویترین"
            invalid={hasRequiredError(requiredErrorKey) && !showcase.title.trim()}
            onChange={(event) => onPatch({ title: event.target.value })}
          />
          <CustomInput type="number" value={showcase.sortOrder} placeholder="ترتیب نمایش" onChange={(event) => onPatch({ sortOrder: Number(event.target.value) })} />
          <CustomSelect value={showcase.mode} aria-label="حالت ویترین" onChange={(event) => onPatch({ mode: event.target.value === "auto" ? "auto" : "manual" })}>
            <option value="manual">Manual product selection</option>
            <option value="auto">Automatic by rule</option>
          </CustomSelect>
          {showcase.mode === "auto" ? (
            <AutoShowcaseFields showcase={showcase} categories={categories} onPatch={onPatch} />
          ) : (
            <ManualShowcaseProducts showcase={showcase} products={products} onPatch={onPatch} />
          )}
          <CustomSwitch checked={showcase.active} onChange={(active) => onPatch({ active })} label={showcase.active ? "فعال" : "مخفی"} size="sm" />
          <div className="flex flex-col gap-2 sm:flex-row">
            {onDelete ? (
              <CustomButton variant="danger" fullWidth icon={<IoTrashOutline />} onClick={onDelete}>
                حذف
              </CustomButton>
            ) : null}
            <CustomButton fullWidth icon={<IoSaveOutline />} onClick={onSubmit}>
              {submitLabel}
            </CustomButton>
          </div>
        </div>
      ) : null}
    </CustomModal>
  );
}

type ShowcaseFieldsProps = {
  showcase: ShowcaseForm;
  onPatch: (patch: Partial<ShowcaseForm>) => void;
};

function AutoShowcaseFields({ showcase, categories, onPatch }: ShowcaseFieldsProps & { categories: CategoryForm[] }) {
  return (
    <div className="flex flex-col gap-3">
      <CustomSelect value={showcase.autoSort} aria-label="Automatic showcase sort" onChange={(event) => onPatch({ autoSort: event.target.value })}>
        {SHOWCASE_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </CustomSelect>
      <CustomSelect value={showcase.categoryId} aria-label="Automatic showcase category" onChange={(event) => onPatch({ categoryId: event.target.value })}>
        <option value="">همه دسته‌بندی‌ها</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.title}
          </option>
        ))}
      </CustomSelect>
      <CustomInput type="number" value={showcase.limit} placeholder="تعداد محصول" onChange={(event) => onPatch({ limit: Number(event.target.value) })} />
    </div>
  );
}

function ManualShowcaseProducts({ showcase, products, onPatch }: ShowcaseFieldsProps & { products: ProductForm[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-bold text-secondary-text">محصولات دستی</div>
      <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
        {products.map((product) => (
          <CustomButton
            key={product.id}
            variant={showcase.manualProductIds.map(String).includes(String(product.id)) ? "primary" : "neutral"}
            size="sm"
            onClick={() => onPatch({ manualProductIds: toggleProductId(showcase.manualProductIds, product.id) })}
          >
            {product.title}
          </CustomButton>
        ))}
      </div>
    </div>
  );
}
