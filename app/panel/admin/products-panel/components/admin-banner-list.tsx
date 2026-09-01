"use client";

import { IoCreateOutline, IoImageOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { AppImage } from "@/app/design-system/components/ui/app-image";
import { AppHeading } from "@/app/design-system/components/ui/text";
import type { BannerForm } from "../types";

type AdminBannerListProps = {
  banner: BannerForm;
  onEdit: (banner: BannerForm) => void;
  onPreview: (imageUrl?: string) => void;
  isLoading?: boolean;
};

export function AdminBannerList({ banner, onEdit, onPreview, isLoading = false }: AdminBannerListProps) {
  const previewImage = banner.imageUrls[0];

  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-lg border bg-primary-soft p-4 ${
        isLoading ? "border-border-default" : "border-primary-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <AppHeading level={3} className="text-xl font-bold text-primary-text">{banner.title || "بنر بدون عنوان"}</AppHeading>
        <div className="flex justify-center items-center gap-2">
          <span className="text-xs font-semibold text-secondary-text">{banner.imageUrls.length} تصویر</span>
          <CustomButton
            variant="edit"
            rounded="full"
            size="sm"
            icon={<IoCreateOutline />}
            disabled={isLoading}
            onClick={() => onEdit(banner)}
          >
            <span>ویرایش</span>
          </CustomButton>
        </div>
      </div>

      <div
        className={`flex min-h-36 items-center justify-center overflow-hidden rounded-lg border bg-primary-media ${
          isLoading ? "border-border-default" : "border-primary-border"
        }`}
      >
        <button
          type="button"
          className="h-36 w-full"
          onClick={() => onPreview(previewImage)}
          disabled={isLoading || !previewImage}
          aria-label="باز کردن تصویر بنر"
        >
          {previewImage ? (
            <AppImage src={previewImage} alt={banner.title || "بنر"} width={800} height={450} className="h-full w-full object-cover" />
          ) : (
            <IoImageOutline className="text-2xl text-primary" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
