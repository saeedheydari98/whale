"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ImagePreviewModalProps = {
  imageUrl: string;
  onClose: () => void;
};

export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!imageUrl) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="پیش‌نمایش تصویر"
    >
      <img
        src={imageUrl}
        alt=""
        className="max-h-[100vh] max-w-[100vw] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );

  return mounted ? createPortal(modal, document.body) : modal;
}
