"use client";

import { IoAdd, IoCloudUploadOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { WEBP_IMAGE_ACCEPT } from "@/lib/image-upload";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import type { BannerForm, ShowcaseForm } from "../types";
import { AdminModalSection } from "./admin-modal-section";

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
        title="ثبت بنر"
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
        submitLabel="ثبت بنر"
        emptyPreviewLabel="پیش‌نمایش بنر"
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
  const hasTitle = Boolean(banner?.title.trim());
  const hasTarget = Boolean(banner && (banner.showOnHome || banner.showOnCategories || banner.showOnProducts || banner.showOnShowcase));
  const timingComplete = Boolean(
    banner
    && Number.isFinite(Number(banner.intervalSeconds))
    && Number(banner.intervalSeconds) >= 1
    && Number.isFinite(Number(banner.heightPercent))
    && Number(banner.heightPercent) >= 10
    && Number(banner.heightPercent) <= 100
  );
  const hasImages = Boolean(banner && banner.imageUrls.length > 0);

  return (
    <CustomModal open={open} onClose={onClose} title={title} rounded="lg" shadow="lg" closeOnBackdrop={false}>
      {banner ? (
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
          <AdminModalSection
            title="اطلاعات بنر"
            status={hasTitle ? "complete" : "optional"}
            meta="عنوان و ترتیب اصلی"
            defaultOpen={!hasTitle}
          >
            <CustomInput value={banner.title} placeholder="عنوان بنر" onChange={(event) => onPatch({ title: event.target.value })} />
            <CustomInput
              type="number"
              value={banner.homeSortOrder}
              placeholder="ترتیب نمایش"
              onChange={(event) => onPatch({ homeSortOrder: Number(event.target.value), sortOrder: Number(event.target.value) })}
            />
          </AdminModalSection>

          <AdminModalSection
            title="محل نمایش بنر"
            status={hasTarget ? "complete" : "incomplete"}
            meta="خانه، دسته‌بندی یا ویترین"
            defaultOpen={!hasTarget}
          >
            <div className="flex flex-wrap gap-2">
              <BannerTargetCheckbox label="خانه" checked={banner.showOnHome} onChange={(showOnHome) => onPatch({ showOnHome })} />
              <BannerTargetCheckbox label="دسته‌بندی" checked={banner.showOnCategories} onChange={(showOnCategories) => onPatch({ showOnCategories })} />
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
          </AdminModalSection>

          <AdminModalSection
            title="زمان‌بندی و اندازه"
            status={timingComplete ? "complete" : "incomplete"}
            meta="تغییر خودکار و ارتفاع بنر"
            defaultOpen={!timingComplete}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
            <CustomInput name={`${errorKey}-interval-seconds`} type="number" min={1} max={60} step={1} value={banner.intervalSeconds} placeholder="زمان تغییر خودکار" onChange={(event) => onPatch({ intervalSeconds: Number(event.target.value) })} />
            <CustomInput name={`${errorKey}-height-percent`} type="number" min={10} max={100} step={1} value={banner.heightPercent} placeholder="درصد ارتفاع" onChange={(event) => onPatch({ heightPercent: Number(event.target.value) })} />
            </div>
          </AdminModalSection>

          <AdminModalSection
            title="تصاویر بنر"
            status={hasImages ? "complete" : "incomplete"}
            invalid={hasRequiredError(errorKey) && !hasImages}
            meta="گالری WebP بنر"
            defaultOpen={!hasImages}
          >
            <div className="text-xs font-semibold text-secondary-text">فقط فرمت WebP مجاز است.</div>
            <div className="flex gap-2">
              <CustomInput value={imageUrl} placeholder="آدرس تصویر WebP" onChange={(event) => setImageUrl(event.target.value)} />
              <CustomButton icon={<IoAdd />} onClick={onAddImageUrl}>
                <span>افزودن</span>
              </CustomButton>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">بارگذاری تصاویر WebP</span>
              <input type="file" accept={WEBP_IMAGE_ACCEPT} multiple className="hidden" onChange={(event) => onUpload(event.target.files)} />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {banner.imageUrls.length === 0 && emptyPreviewLabel ? <span className="text-sm text-secondary-text">{emptyPreviewLabel}</span> : null}
              {banner.imageUrls.map((item, index) => (
                <div key={`${item}-${index}`} className="flex min-w-40 flex-col gap-2">
                  <button type="button" className="h-24 overflow-hidden rounded-md border border-primary-border bg-primary-media" onClick={() => onPreview(item)} aria-label="باز کردن تصویر بنر">
                    <img src={item} alt={`تصویر بنر ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                  <CustomButton variant="danger" size="sm" icon={<IoTrashOutline />} onClick={() => onRemoveImage(item)}>
                    <span>حذف</span>
                  </CustomButton>
                </div>
              ))}
            </div>
          </AdminModalSection>

          <AdminModalSection title="وضعیت" status="optional" meta={banner.active ? "فعال" : "مخفی"}>
            <CustomSwitch checked={banner.active} onChange={(active) => onPatch({ active })} label={banner.active ? "فعال" : "مخفی"} size="sm" />
          </AdminModalSection>

          <div className="flex flex-col gap-2 sm:flex-row">
            <CustomButton fullWidth icon={<IoSaveOutline />} onClick={onSubmit}>
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
