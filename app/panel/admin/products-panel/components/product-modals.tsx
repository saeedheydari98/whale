"use client";

import { IoCloudUploadOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import type { BrandForm, CategoryForm, ProductForm, ShowcaseForm } from "../types";
import { InventoryControls, ProductAdvancedFields, ProductPlacementFields } from "./product-form-fields";

type ProductModalsProps = {
  showcases: ShowcaseForm[];
  categories: CategoryForm[];
  brands: BrandForm[];
  draftProduct: ProductForm;
  editingProduct: ProductForm | null;
  isCreateOpen: boolean;
  isEditOpen: boolean;
  saving: boolean;
  hasRequiredError: (key: string) => boolean;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  updateDraftProduct: (patch: Partial<ProductForm>) => void;
  updateEditingProduct: (patch: Partial<ProductForm>) => void;
  updateDraftPricing: (patch: Partial<ProductForm>) => void;
  updateEditingPricing: (patch: Partial<ProductForm>) => void;
  onDraftImageUpload: (file: File | null) => void;
  onEditImageUpload: (file: File | null) => void;
  onPreview: (imageUrl?: string) => void;
  onSubmitDraft: () => void;
  onSubmitEdit: () => void;
  onDeleteEdit: () => void;
};

export function ProductModals(props: ProductModalsProps) {
  return (
    <>
      <ProductModal
        open={props.isCreateOpen}
        onClose={props.onCloseCreate}
        title="ثبت محصول"
        product={props.draftProduct}
        showcases={props.showcases}
        categories={props.categories}
        brands={props.brands}
        saving={props.saving}
        titleErrorKey="draftProduct.title"
        priceErrorKey="draftProduct.discountPrice"
        categoryErrorKey="draftProduct.categoryId"
        hasRequiredError={props.hasRequiredError}
        onPatch={props.updateDraftProduct}
        onPricingPatch={props.updateDraftPricing}
        onImageUpload={props.onDraftImageUpload}
        onPreview={props.onPreview}
        onSubmit={props.onSubmitDraft}
        submitLabel="ثبت محصول"
      />
      <ProductModal
        open={props.isEditOpen}
        onClose={props.onCloseEdit}
        title={props.editingProduct?.title || "ویرایش محصول"}
        product={props.editingProduct}
        showcases={props.showcases}
        categories={props.categories}
        brands={props.brands}
        saving={props.saving}
        titleErrorKey="editingProduct.title"
        priceErrorKey="editingProduct.discountPrice"
        categoryErrorKey="editingProduct.categoryId"
        hasRequiredError={props.hasRequiredError}
        onPatch={props.updateEditingProduct}
        onPricingPatch={props.updateEditingPricing}
        onImageUpload={props.onEditImageUpload}
        onPreview={props.onPreview}
        onSubmit={props.onSubmitEdit}
        onDelete={props.onDeleteEdit}
        submitLabel="ذخیره تغییرات"
      />
    </>
  );
}

type ProductModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  product: ProductForm | null;
  showcases: ShowcaseForm[];
  categories: CategoryForm[];
  brands: BrandForm[];
  saving: boolean;
  titleErrorKey: string;
  priceErrorKey: string;
  categoryErrorKey: string;
  hasRequiredError: (key: string) => boolean;
  onPatch: (patch: Partial<ProductForm>) => void;
  onPricingPatch: (patch: Partial<ProductForm>) => void;
  onImageUpload: (file: File | null) => void;
  onPreview: (imageUrl?: string) => void;
  onSubmit: () => void;
  onDelete?: () => void;
  submitLabel: string;
};

function ProductModal({
  open,
  onClose,
  title,
  product,
  showcases,
  categories,
  brands,
  saving,
  titleErrorKey,
  priceErrorKey,
  categoryErrorKey,
  hasRequiredError,
  onPatch,
  onPricingPatch,
  onImageUpload,
  onPreview,
  onSubmit,
  onDelete,
  submitLabel,
}: ProductModalProps) {
  return (
    <CustomModal open={open} onClose={onClose} title={title} rounded="lg" shadow="lg">
      {product ? (
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <CustomInput value={product.title} placeholder="نام" invalid={hasRequiredError(titleErrorKey) && !product.title.trim()} onChange={(event) => onPatch({ title: event.target.value })} />
            <CustomInput value={product.slug} placeholder="اسلاگ" onChange={(event) => onPatch({ slug: event.target.value })} />
            <CustomInput value={product.originalPrice} placeholder="قیمت قبل از تخفیف" onChange={(event) => onPricingPatch({ originalPrice: event.target.value })} />
            <CustomInput value={product.discountPrice} placeholder="قیمت با تخفیف" invalid={hasRequiredError(priceErrorKey) && !product.discountPrice.trim()} onChange={(event) => onPricingPatch({ discountPrice: event.target.value })} />
            <CustomInput value={product.badge} placeholder="برچسب" onChange={(event) => onPatch({ badge: event.target.value })} />
            <ProductPlacementFields
              product={product}
              showcases={showcases}
              categories={categories}
              brands={brands}
              onChange={onPatch}
              hasRequiredError={hasRequiredError}
              categoryErrorKey={categoryErrorKey}
            />
            <InventoryControls product={product} onChange={onPatch} />
            <ProductAdvancedFields product={product} onChange={onPatch} />
            <CustomInput type="number" value={product.sortOrder} placeholder="ترتیب نمایش" onChange={(event) => onPatch({ sortOrder: Number(event.target.value) })} />
            <CustomInput value={product.ctaHref} placeholder="لینک دکمه" onChange={(event) => onPatch({ ctaHref: event.target.value })} />
          </div>

          <div className="flex min-h-10 items-center rounded-md border border-primary-border bg-primary-card">
            <span className="text-xs text-secondary-text">
              فرمول تخفیف: ((قیمت قبل از تخفیف - قیمت با تخفیف) / قیمت قبل از تخفیف) × ۱۰۰
            </span>
          </div>

          <RequiredLabel className="text-primary-text">توضیحات</RequiredLabel>
          <textarea
            value={product.description}
            placeholder="توضیحات"
            onChange={(event) => onPatch({ description: event.target.value })}
            className="min-h-24 rounded-md border border-primary-border bg-primary-card p-3 text-sm text-primary-text outline-none focus:ring-2 focus:ring-primary-border"
          />

          <div className="flex flex-col gap-3 rounded-lg border border-primary-border">
            <div className="text-sm font-bold">تصویر محصول</div>
            <CustomInput value={product.imageUrl} placeholder="آدرس تصویر یا داده تصویر بارگذاری‌شده" onChange={(event) => onPatch({ imageUrl: event.target.value })} />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">بارگذاری تصویر</span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => onImageUpload(event.target.files?.[0] ?? null)} />
            </label>
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-primary-border bg-primary-media">
              {product.imageUrl ? (
                <button type="button" className="h-full w-full" onClick={() => onPreview(product.imageUrl)} aria-label="باز کردن تصویر محصول">
                  <img src={product.imageUrl} alt="پیش‌نمایش محصول" className="h-full w-full object-cover" />
                </button>
              ) : (
                <span className="text-sm text-secondary-text">پیش‌نمایش تصویر</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <CustomButton isLoading={saving} loading="dots" loadingText="در حال ذخیره..." fullWidth icon={<IoSaveOutline />} onClick={onSubmit}>
              {submitLabel}
            </CustomButton>
            {onDelete ? (
              <CustomButton variant="danger" fullWidth icon={<IoTrashOutline />} onClick={onDelete}>
                حذف
              </CustomButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </CustomModal>
  );
}
