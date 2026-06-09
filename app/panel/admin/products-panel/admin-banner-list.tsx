"use client";

import { IoCreateOutline, IoImageOutline } from "react-icons/io5";
import { CustomButton } from "../../../design-system/components/ui/button";
import type { BannerForm } from "./types";

type AdminBannerListProps = {
  banner: BannerForm;
  onEdit: (banner: BannerForm) => void;
  onPreview: (imageUrl?: string) => void;
};

export function AdminBannerList({ banner, onEdit, onPreview }: AdminBannerListProps) {
  const previewImage = banner.imageUrls[0];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ui-primary/30 bg-bg-base p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-text-primary">{banner.title || "Untitled banner"}</div>
        <div className="flex justify-center items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary">{banner.imageUrls.length} images</span>
          <CustomButton
            variant="neutral"
            rounded="full"
            size="sm"
            border="base"
            icon={<IoCreateOutline />}
            onClick={() => onEdit(banner)}
          >
            Edit
          </CustomButton>         
        </div>
      </div>

      <div className="flex min-h-36 items-center justify-center overflow-hidden rounded-lg border border-ui-primary/20 bg-bg-surface">
        <button
          type="button"
          className="h-36 w-full"
          onClick={() => onPreview(previewImage)}
          disabled={!previewImage}
          aria-label="Open banner image"
        >
          {previewImage ? (
            <img
              src={previewImage}
              alt={banner.title || "Banner"}
              className="h-full w-full object-cover"
            />
          ) : (
            <IoImageOutline className="text-2xl text-ui-primary" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
