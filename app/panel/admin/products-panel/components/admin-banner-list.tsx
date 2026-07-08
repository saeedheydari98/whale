"use client";

import { IoCreateOutline, IoImageOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import Loading from "@/app/design-system/components/loading/loading";
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
      className={`flex flex-col gap-3 rounded-lg border bg-primary-soft p-4 ${
        isLoading ? "border-border-default" : "border-primary-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <Loading loading="skeleton-item" isLoading={isLoading}>
          <div className="text-xl font-bold text-primary-text">{banner.title || "بنر بدون عنوان"}</div>
        </Loading>
        <div className="flex justify-center items-center gap-2">
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <span className="text-xs font-semibold text-secondary-text">{banner.imageUrls.length} تصویر</span>
          </Loading>
          <Loading loading="skeleton-item" isLoading={isLoading}>
            <CustomButton
              variant="edit"
              rounded="full"
              size="sm"
              icon={<IoCreateOutline />}
              onClick={() => onEdit(banner)}
            >
              ویرایش
            </CustomButton>
          </Loading>
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
          <Loading loading="skeleton-item" isLoading={isLoading} className="h-full w-full">
            <div className="flex h-full w-full items-center justify-center">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={banner.title || "بنر"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <IoImageOutline className="text-2xl text-primary" aria-hidden="true" />
              )}
            </div>
          </Loading>
        </button>
      </div>
    </div>
  );
}
