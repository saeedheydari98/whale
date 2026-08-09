"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HiMiniXMark } from "react-icons/hi2";
import { CustomButton } from "@/app/design-system/components/ui/button";

type ImagePreviewModalProps = {
  imageUrl: string;
  onClose: () => void;
};

export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!imageUrl) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-3 bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="پیش‌نمایش تصویر"
    >
      <div className="flex w-full justify-end">
        <CustomButton variant="danger" size="sm" icon={<HiMiniXMark size={22} />} onClick={onClose} aria-label="بستن پیش‌نمایش تصویر" />
      </div>
      <img
        src={imageUrl}
        alt=""
        className="max-h-[100vh] max-w-[100vw] object-contain"
      />
    </div>
  );

  return mounted ? createPortal(modal, document.body) : modal;
}
