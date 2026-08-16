"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ImagePreviewProps = {
  imageUrl?: string | null;
  onClose: () => void;
};

export function ImagePreview({ imageUrl, onClose }: ImagePreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!imageUrl) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageUrl, onClose]);

  if (!mounted || !imageUrl) return null;

  return createPortal(
    <button
      type="button"
      className="fixed inset-0 z-[10000] flex cursor-zoom-out items-center justify-center bg-black/80 p-0 outline-none"
      onClick={onClose}
      aria-label="بستن تصویر"
    >
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        className="max-h-[100dvh] max-w-[100vw] object-contain"
      />
    </button>,
    document.body
  );
}
