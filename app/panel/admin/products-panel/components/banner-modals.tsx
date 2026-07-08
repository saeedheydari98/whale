"use client";

import { IoAdd, IoCloudUploadOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import type { BannerForm, ShowcaseForm } from "../types";

type BannerModalsProps = {
  showcases: ShowcaseForm[];
  draftBanner: BannerForm;
  editingBanner: BannerForm | null;
  isBannerOpen: boolean;
  isEditBannerOpen: boolean;
  draftBannerImageUrl: string;
  editingBannerImageUrl: string;
  hasRequiredError: (key: string) => boolean;
  setDraftBannerImageUrl: (value: string) => void;
  setEditingBannerImageUrl: (value: string) => void;
  onCloseBanner: () => void;
  onCloseEditBanner: () => void;
  updateDraftBanner: (patch: Partial<BannerForm>) => void;
  updateEditingBanner: (patch: Partial<BannerForm>) => void;
  onUploadBannerImages: (files: FileList | null, mode: "draft" | "edit") => void;
  onAddBannerImageUrl: (mode: "draft" | "edit") => void;
  onRemoveBannerImage: (imageUrl: string, mode: "draft" | "edit") => void;
  onPreview: (imageUrl?: string) => void;
  onSubmitBanner: () => void;
  onSubmitEditBanner: () => void;
  onDeleteBanner: () => void;
};

export function BannerModals(props: BannerModalsProps) {
  return (
    <>
      <BannerModal
        open={props.isBannerOpen}
        onClose={props.onCloseBanner}
        title="Register banner"
        banner={props.draftBanner}
        showcases={props.showcases}
        imageUrl={props.draftBannerImageUrl}
        setImageUrl={props.setDraftBannerImageUrl}
        errorKey="draftBanner.images"
        hasRequiredError={props.hasRequiredError}
        onPatch={props.updateDraftBanner}
        onUpload={(files) => props.onUploadBannerImages(files, "draft")}
        onAddImageUrl={() => props.onAddBannerImageUrl("draft")}
        onRemoveImage={(imageUrl) => props.onRemoveBannerImage(imageUrl, "draft")}
        onPreview={props.onPreview}
        onSubmit={props.onSubmitBanner}
        submitLabel="Register banner"
        emptyPreviewLabel="Banner preview"
      />
      <BannerModal
        open={props.isEditBannerOpen}
        onClose={props.onCloseEditBanner}
        title={props.editingBanner?.title || "ویرایش بنر"}
        banner={props.editingBanner}
        showcases={props.showcases}
        imageUrl={props.editingBannerImageUrl}
        setImageUrl={props.setEditingBannerImageUrl}
        errorKey="editingBanner.images"
        hasRequiredError={props.hasRequiredError}
        onPatch={props.updateEditingBanner}
        onUpload={(files) => props.onUploadBannerImages(files, "edit")}
        onAddImageUrl={() => props.onAddBannerImageUrl("edit")}
        onRemoveImage={(imageUrl) => props.onRemoveBannerImage(imageUrl, "edit")}
        onPreview={props.onPreview}
        onSubmit={props.onSubmitEditBanner}
        onDelete={props.onDeleteBanner}
        submitLabel="ذخیره بنر"
      />
    </>
  );
}

type BannerModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  banner: BannerForm | null;
  showcases: ShowcaseForm[];
  imageUrl: string;
  setImageUrl: (value: string) => void;
  errorKey: string;
  hasRequiredError: (key: string) => boolean;
  onPatch: (patch: Partial<BannerForm>) => void;
  onUpload: (files: FileList | null) => void;
  onAddImageUrl: () => void;
  onRemoveImage: (imageUrl: string) => void;
  onPreview: (imageUrl?: string) => void;
  onSubmit: () => void;
  onDelete?: () => void;
  submitLabel: string;
  emptyPreviewLabel?: string;
};

function BannerModal({
  open,
  onClose,
  title,
  banner,
  showcases,
  imageUrl,
  setImageUrl,
  errorKey,
  hasRequiredError,
  onPatch,
  onUpload,
  onAddImageUrl,
  onRemoveImage,
  onPreview,
  onSubmit,
  onDelete,
  submitLabel,
  emptyPreviewLabel,
}: BannerModalProps) {
  return (
    <CustomModal open={open} onClose={onClose} title={title} rounded="lg" shadow="lg">
      {banner ? (
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-lg border border-primary-border bg-primary-card p-3">
          <CustomInput value={banner.title} placeholder="Banner title" onChange={(event) => onPatch({ title: event.target.value })} />
          <CustomInput
            type="number"
            value={banner.homeSortOrder}
            placeholder="ترتیب نمایش"
            onChange={(event) => onPatch({ homeSortOrder: Number(event.target.value), sortOrder: Number(event.target.value) })}
          />
          <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3">
            <div className="text-sm font-bold text-primary-text">محل نمایش بنر</div>
            <div className="flex flex-wrap gap-2">
              <BannerTargetCheckbox label="خانه" checked={banner.showOnHome} onChange={(showOnHome) => onPatch({ showOnHome })} />
              <BannerTargetCheckbox label="دسته بندی" checked={banner.showOnCategories} onChange={(showOnCategories) => onPatch({ showOnCategories })} />
              <BannerTargetCheckbox label="ویترین" checked={banner.showOnProducts} onChange={(showOnProducts) => onPatch({ showOnProducts })} />
              <label className="hidden cursor-pointer items-center gap-2 rounded-md border border-primary-border bg-primary-card px-3 py-2 text-sm font-semibold text-primary-text">
                <input
                  type="checkbox"
                  checked={banner.showOnShowcase}
                  onChange={(event) => {
                    const showOnShowcase = event.target.checked;
                    onPatch({
                      showOnShowcase,
                      showcaseId: showOnShowcase ? banner.showcaseId || showcases[0]?.id || "" : banner.showcaseId,
                    });
                  }}
                  className="h-4 w-4 accent-primary"
                />
                <span>ویترین</span>
              </label>
            </div>
            {banner.showOnShowcase ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <CustomSelect value={banner.showcaseId} aria-label="انتخاب ویترین بنر" onChange={(event) => onPatch({ showcaseId: event.target.value })}>
                  <option value="">انتخاب ویترین</option>
                  {showcases.map((showcase) => (
                    <option key={showcase.id} value={showcase.id}>
                      {showcase.title || showcase.id}
                    </option>
                  ))}
                </CustomSelect>
                <CustomInput
                  type="number"
                  value={banner.showcaseSortOrder}
                  placeholder="ترتیب در ویترین"
                  onChange={(event) => onPatch({ showcaseSortOrder: Number(event.target.value) })}
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CustomInput name={`${errorKey}-interval-seconds`} type="number" min={1} max={60} step={1} value={banner.intervalSeconds} placeholder="Auto advance seconds" onChange={(event) => onPatch({ intervalSeconds: Number(event.target.value) })} />
            <CustomInput name={`${errorKey}-height-percent`} type="number" min={10} max={100} step={1} value={banner.heightPercent} placeholder="Height percent" onChange={(event) => onPatch({ heightPercent: Number(event.target.value) })} />
          </div>
          <div
            data-invalid={hasRequiredError(errorKey) && banner.imageUrls.length === 0 ? "true" : undefined}
            tabIndex={-1}
            className={`flex flex-col gap-3 rounded-lg border bg-primary-soft p-3 outline-none ${
              hasRequiredError(errorKey) && banner.imageUrls.length === 0 ? "border-danger-border-nomode" : "border-primary-border"
            }`}
          >
            <RequiredLabel required className="text-primary-text">Banner images</RequiredLabel>
            <div className="flex gap-2">
              <CustomInput value={imageUrl} placeholder="آدرس تصویر" onChange={(event) => setImageUrl(event.target.value)} />
              <CustomButton icon={<IoAdd />} onClick={onAddImageUrl}>
                افزودن
              </CustomButton>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">بارگذاری تصاویر</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => onUpload(event.target.files)} />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {banner.imageUrls.length === 0 && emptyPreviewLabel ? <span className="text-sm text-secondary-text">{emptyPreviewLabel}</span> : null}
              {banner.imageUrls.map((item, index) => (
                <div key={`${item}-${index}`} className="flex min-w-40 flex-col gap-2">
                  <button type="button" className="h-24 overflow-hidden rounded-md border border-primary-border bg-primary-media" onClick={() => onPreview(item)} aria-label="باز کردن تصویر بنر">
                    <img src={item} alt={`Banner image ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                  <CustomButton variant="danger" size="sm" icon={<IoTrashOutline />} onClick={() => onRemoveImage(item)}>
                    Remove
                  </CustomButton>
                </div>
              ))}
            </div>
          </div>
          <CustomSwitch checked={banner.active} onChange={(active) => onPatch({ active })} label={banner.active ? "فعال" : "مخفی"} size="sm" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <CustomButton fullWidth icon={<IoSaveOutline />} onClick={onSubmit}>
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

type BannerTargetCheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function BannerTargetCheckbox({ label, checked, onChange }: BannerTargetCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-primary-border bg-primary-card px-3 py-2 text-sm font-semibold text-primary-text">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
