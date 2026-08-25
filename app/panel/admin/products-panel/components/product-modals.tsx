"use client";

import { useEffect, useState } from "react";
import { IoAdd, IoCloudUploadOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { WEBP_IMAGE_ACCEPT } from "@/lib/image-upload";
import type { BrandForm, CategoryForm, ProductForm, ShowcaseForm } from "../types";
import { formatAmount, getProductImageUrls, hasMatchingColorStock } from "../utils";
import { AdminModalSection } from "./admin-modal-section";
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
  onDraftImageUpload: (files: FileList | null) => void;
  onEditImageUpload: (files: FileList | null) => void;
  onDraftImageUrlAdd: (imageUrl: string) => boolean;
  onEditImageUrlAdd: (imageUrl: string) => boolean;
  onDraftImageRemove: (imageUrl: string) => void;
  onEditImageRemove: (imageUrl: string) => void;
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
        inventoryErrorKey="draftProduct.colorStock"
        hasRequiredError={props.hasRequiredError}
        onPatch={props.updateDraftProduct}
        onPricingPatch={props.updateDraftPricing}
        onImageUpload={props.onDraftImageUpload}
        onAddImageUrl={props.onDraftImageUrlAdd}
        onRemoveImage={props.onDraftImageRemove}
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
        inventoryErrorKey="editingProduct.colorStock"
        hasRequiredError={props.hasRequiredError}
        onPatch={props.updateEditingProduct}
        onPricingPatch={props.updateEditingPricing}
        onImageUpload={props.onEditImageUpload}
        onAddImageUrl={props.onEditImageUrlAdd}
        onRemoveImage={props.onEditImageRemove}
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
  inventoryErrorKey: string;
  hasRequiredError: (key: string) => boolean;
  onPatch: (patch: Partial<ProductForm>) => void;
  onPricingPatch: (patch: Partial<ProductForm>) => void;
  onImageUpload: (files: FileList | null) => void;
  onAddImageUrl: (imageUrl: string) => boolean;
  onRemoveImage: (imageUrl: string) => void;
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
  inventoryErrorKey,
  hasRequiredError,
  onPatch,
  onPricingPatch,
  onImageUpload,
  onAddImageUrl,
  onRemoveImage,
  onPreview,
  onSubmit,
  onDelete,
  submitLabel,
}: ProductModalProps) {
  const [pendingImageUrl, setPendingImageUrl] = useState("");
  const productImages = product ? getProductImageUrls(product) : [];
  const hasTitle = Boolean(product?.title.trim());
  const hasPrice = Boolean(product?.discountPrice.trim());
  const hasPlacement = Boolean(product && product.categoryIds.length > 0);
  const inventoryComplete = Boolean(product && Number(product.stockQuantity) > 0 && hasMatchingColorStock(product));
  const hasDescription = Boolean(product?.description.trim());
  const hasImages = productImages.length > 0;

  useEffect(() => {
    setPendingImageUrl("");
  }, [open, product?.id]);

  const addPendingImageUrl = () => {
    const imageUrl = pendingImageUrl.trim();
    if (!imageUrl) return;
    if (onAddImageUrl(imageUrl)) setPendingImageUrl("");
  };

  return (
    <CustomModal open={open} onClose={onClose} title={title} rounded="lg" shadow="lg" closeOnBackdrop={false}>
      {product ? (
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
          <AdminModalSection
            title="اطلاعات محصول"
            status={hasTitle ? "complete" : "incomplete"}
            invalid={hasRequiredError(titleErrorKey) && !hasTitle}
            meta="نام، اسلاگ، برچسب و لینک دکمه"
            defaultOpen={!hasTitle}
          >
            <CustomInput value={product.title} placeholder="نام" invalid={hasRequiredError(titleErrorKey) && !product.title.trim()} onChange={(event) => onPatch({ title: event.target.value })} />
            <CustomInput value={product.slug} placeholder="اسلاگ" onChange={(event) => onPatch({ slug: event.target.value })} />
            <CustomInput value={product.badge} placeholder="برچسب" onChange={(event) => onPatch({ badge: event.target.value })} />
            <CustomInput value={product.ctaHref} placeholder="لینک دکمه" onChange={(event) => onPatch({ ctaHref: event.target.value })} />
          </AdminModalSection>

          <AdminModalSection
            title="قیمت"
            status={hasPrice ? "complete" : "incomplete"}
            invalid={hasRequiredError(priceErrorKey) && !hasPrice}
            meta="قیمت قبل از تخفیف و قیمت فروش"
            defaultOpen={!hasPrice}
          >
            <CustomInput
              value={formatAmount(product.originalPrice)}
              placeholder="قیمت قبل از تخفیف"
              inputMode="numeric"
              onChange={(event) => onPricingPatch({ originalPrice: event.target.value })}
            />
            <CustomInput
              value={formatAmount(product.discountPrice)}
              placeholder="قیمت با تخفیف"
              inputMode="numeric"
              invalid={hasRequiredError(priceErrorKey) && !product.discountPrice.trim()}
              onChange={(event) => onPricingPatch({ discountPrice: event.target.value })}
            />
            <div className="flex min-h-10 items-center rounded-md border border-primary-border bg-primary-card p-3">
              <span className="text-xs text-secondary-text">
                درصد تخفیف از اختلاف دو قیمت محاسبه می‌شود.
              </span>
            </div>
          </AdminModalSection>

          <AdminModalSection
            title="محل نمایش"
            status={hasPlacement ? "complete" : "incomplete"}
            invalid={hasRequiredError(categoryErrorKey) && !hasPlacement}
            meta="دسته‌بندی، ویترین، برند و ترتیب"
            defaultOpen={!hasPlacement}
          >
            <ProductPlacementFields
              product={product}
              showcases={showcases}
              categories={categories}
              brands={brands}
              onChange={onPatch}
              hasRequiredError={hasRequiredError}
              categoryErrorKey={categoryErrorKey}
            />
            <CustomInput type="number" value={product.sortOrder} placeholder="ترتیب نمایش" onChange={(event) => onPatch({ sortOrder: Number(event.target.value) })} />
          </AdminModalSection>

          <AdminModalSection
            title="موجودی"
            status={inventoryComplete ? "complete" : "incomplete"}
            invalid={hasRequiredError(inventoryErrorKey) && !inventoryComplete}
            meta="موجودی کل و سهم رنگ‌ها"
            defaultOpen={!inventoryComplete}
          >
            <InventoryControls product={product} onChange={onPatch} />
          </AdminModalSection>

          <AdminModalSection title="جزئیات و وضعیت" status="optional" meta="وزن، ابعاد، سال تولید، کد کالا و وضعیت انتشار">
            <ProductAdvancedFields product={product} onChange={onPatch} />
          </AdminModalSection>

          <AdminModalSection
            title="توضیحات"
            status={hasDescription ? "complete" : "optional"}
            meta="متن معرفی محصول"
          >
            <CustomInput
              multiline
              value={product.description}
              placeholder="توضیحات"
              onChange={(event) => onPatch({ description: event.target.value })}
            />
          </AdminModalSection>

          <AdminModalSection
            title="تصاویر محصول"
            status={hasImages ? "complete" : "incomplete"}
            meta="گالری محصول و تصویر اصلی کارت"
            defaultOpen={!hasImages}
          >
            <div className="text-xs font-semibold text-secondary-text">فقط فرمت WebP مجاز است. اولین تصویر روی کارت محصول نمایش داده می‌شود.</div>
            <div className="flex gap-2">
              <CustomInput value={pendingImageUrl} placeholder="آدرس تصویر WebP" onChange={(event) => setPendingImageUrl(event.target.value)} />
              <CustomButton icon={<IoAdd />} onClick={addPendingImageUrl}>
                <span>افزودن</span>
              </CustomButton>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">بارگذاری تصاویر WebP</span>
              <input type="file" accept={WEBP_IMAGE_ACCEPT} multiple className="hidden" onChange={(event) => onImageUpload(event.target.files)} />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {productImages.length === 0 ? <span className="text-sm text-secondary-text">پیش‌نمایش تصویر</span> : null}
              {productImages.map((item, index) => (
                <div key={`${item}-${index}`} className="flex min-w-40 flex-col gap-2">
                  <button type="button" className="h-24 overflow-hidden rounded-md border border-primary-border bg-primary-media" onClick={() => onPreview(item)} aria-label="باز کردن تصویر محصول">
                    <img src={item} alt={`تصویر محصول ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-secondary-text">{index === 0 ? "اصلی" : index + 1}</span>
                    <CustomButton variant="danger" size="sm" icon={<IoTrashOutline />} onClick={() => onRemoveImage(item)}>
                      <span>حذف</span>
                    </CustomButton>
                  </div>
                </div>
              ))}
            </div>
          </AdminModalSection>

          <div className="flex flex-col gap-2 sm:flex-row">
            <CustomButton isLoading={saving} loading="dots" loadingText="در حال ذخیره…" fullWidth icon={<IoSaveOutline />} onClick={onSubmit}>
              <span>{submitLabel}</span>
            </CustomButton>
            {onDelete ? (
              <CustomButton variant="danger" fullWidth icon={<IoTrashOutline />} onClick={onDelete}>
                <span>حذف</span>
              </CustomButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </CustomModal>
  );
}
