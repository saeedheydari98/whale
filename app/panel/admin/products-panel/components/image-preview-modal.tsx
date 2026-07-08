"use client";

import { CustomModal } from "@/app/design-system/components/ui/modal";

type ImagePreviewModalProps = {
  imageUrl: string;
  onClose: () => void;
};

export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  return (
    <CustomModal open={Boolean(imageUrl)} onClose={onClose} title="تصویر محصول" rounded="lg" shadow="lg">
      <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-md bg-primary-base">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="پیش‌نمایش تصویر محصول"
            className="max-h-[75vh] w-full object-contain"
          />
        ) : null}
      </div>
    </CustomModal>
  );
}
