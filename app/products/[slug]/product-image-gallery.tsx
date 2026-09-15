"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TransitionEvent } from "react";
import { IoBagHandleOutline } from "react-icons/io5";
import { AppImage } from "@/app/design-system/components/ui/app-image";
import { ImagePreview } from "@/app/design-system/components/ui/image-preview";
import { useHorizontalDrag } from "@/hooks/use-horizontal-drag";

type ProductImageGalleryProps = {
  imageUrls: string[];
  title: string;
  isLoading?: boolean;
  imageCount?: number;
};

type GalleryMoveDirection = "previous" | "next";

export function ProductImageGallery({ imageUrls, title, isLoading = false, imageCount: structureImageCount }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [snapDirection, setSnapDirection] = useState<GalleryMoveDirection | null>(null);
  const [isResettingRail, setIsResettingRail] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const resetFrameRef = useRef<number | null>(null);
  const images = useMemo(
    () => imageUrls.map((imageUrl) => String(imageUrl).trim()).filter(Boolean),
    [imageUrls]
  );
  const knownImageCount = Number.isFinite(Number(structureImageCount))
    ? Math.max(images.length, Math.round(Number(structureImageCount)))
    : images.length;
  const displayCount = Math.max(images.length, isLoading ? knownImageCount : 0);
  const imageKey = images.join("\n");

  useEffect(() => {
    setActiveIndex(0);
    setSnapDirection(null);
    setIsResettingRail(false);
  }, [imageKey, title]);

  useEffect(() => {
    return () => {
      if (resetFrameRef.current !== null) {
        window.cancelAnimationFrame(resetFrameRef.current);
      }
    };
  }, []);

  const activeImage = images[activeIndex] ?? images[0];
  const imageCount = Math.max(1, displayCount || 1);
  const moveGallery = useCallback((direction: GalleryMoveDirection) => {
    if (imageCount <= 1 || isLoading) return;
    setActiveIndex((current) =>
      direction === "next"
        ? (current + 1) % images.length
        : (current - 1 + images.length) % images.length
    );
  }, [imageCount, images.length, isLoading]);
  const handleGalleryDragEnd = useCallback(({ direction }: { direction: GalleryMoveDirection | null }) => {
    if (!direction || isLoading) return;
    setSnapDirection((current) => current ?? direction);
  }, [isLoading]);
  const handleRailTransitionEnd = useCallback((event: TransitionEvent<HTMLButtonElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform" || !snapDirection) return;

    setIsResettingRail(true);
    moveGallery(snapDirection);
    setSnapDirection(null);

    if (resetFrameRef.current !== null) {
      window.cancelAnimationFrame(resetFrameRef.current);
    }
    resetFrameRef.current = window.requestAnimationFrame(() => {
      resetFrameRef.current = window.requestAnimationFrame(() => {
        resetFrameRef.current = null;
        setIsResettingRail(false);
      });
    });
  }, [moveGallery, snapDirection]);
  const galleryDrag = useHorizontalDrag<HTMLDivElement>({
    disabled: isLoading || images.length <= 1 || snapDirection !== null || isResettingRail,
    mode: "swipe",
    dragStartThreshold: 3,
    threshold: 14,
    ignoreSelector: "[data-drag-ignore='true']",
    onDragEnd: handleGalleryDragEnd,
  });
  const visibleImages = useMemo(() => {
    if (images.length <= 1) return activeImage ? [activeImage] : [];
    const previousImage = images[(activeIndex - 1 + images.length) % images.length];
    const nextImage = images[(activeIndex + 1) % images.length];
    return [previousImage, activeImage, nextImage].filter(Boolean) as string[];
  }, [activeImage, activeIndex, images]);
  const railTransform = images.length > 1
    ? snapDirection === "next"
      ? "translateX(-200%)"
      : snapDirection === "previous"
        ? "translateX(0%)"
        : `translateX(calc(-100% + ${galleryDrag.dragDelta}px))`
    : undefined;
  const shouldAnimateRail = images.length > 1 && !galleryDrag.isDragging && !galleryDrag.isPointerActive && !isResettingRail;
  const showDots = knownImageCount > 1 || images.length > 1;

  return (
    <div className="flex w-full flex-col gap-2" data-loading-item="true">
      <div
        ref={galleryDrag.ref}
        className={`flex aspect-square w-full cursor-grab touch-pan-y select-none items-center justify-center overflow-hidden rounded-2xl border border-primary-border bg-primary-media ${
          galleryDrag.isDragging ? "cursor-grabbing" : ""
        }`}
        onDragStart={(event) => event.preventDefault()}
        aria-label="نمایش تصاویر محصول"
        role="region"
        aria-roledescription="carousel"
        {...galleryDrag.dragHandlers}
      >
        {activeImage && !isLoading ? (
          <button
            type="button"
            className={`flex h-full w-full will-change-transform ${shouldAnimateRail ? "transition-transform duration-300 ease-out" : ""}`}
            style={{
              direction: "ltr",
              transform: railTransform,
            }}
            onTransitionEnd={handleRailTransitionEnd}
            onClick={() => {
              if (!galleryDrag.shouldSuppressClick()) setPreviewImage(activeImage);
            }}
            aria-label="باز کردن تصویر محصول"
          >
            {visibleImages.map((imageUrl, index) => (
              <AppImage
                key={`${imageUrl}-${index}`}
                src={imageUrl}
                alt={title || "محصول"}
                width={800}
                height={800}
                priority={visibleImages.length === 1 || index === 1}
                draggable={false}
                className="h-full w-full min-w-full flex-none object-cover"
              />
            ))}
          </button>
        ) : (
          <IoBagHandleOutline className="text-6xl text-primary" aria-hidden="true" />
        )}
      </div>
      {showDots ? (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.max(images.length, knownImageCount) }, (_, index) => (
            <button
              key={`gallery-dot-${index}`}
              type="button"
              data-drag-ignore="true"
              disabled={isLoading || !images[index]}
              className={`h-2 rounded-full transition ${
                index === activeIndex ? "w-4 bg-primary" : "w-2 bg-primary-border"
              } ${isLoading || !images[index] ? "cursor-default" : "cursor-pointer hover:scale-125"}`}
              onClick={() => {
                if (!isLoading && images[index]) setActiveIndex(index);
              }}
              aria-label={`نمایش تصویر محصول ${index + 1}`}
            >
              <span className="sr-only">{index + 1}</span>
            </button>
          ))}
        </div>
      ) : null}
      <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />
    </div>
  );
}
