"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TransitionEvent } from "react";
import { IoBagHandleOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { useHorizontalDrag } from "@/hooks/use-horizontal-drag";

type ProductImageGalleryProps = {
  imageUrls: string[];
  title: string;
  isLoading?: boolean;
};

type GalleryMoveDirection = "previous" | "next";

export function ProductImageGallery({ imageUrls, title, isLoading = false }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [snapDirection, setSnapDirection] = useState<GalleryMoveDirection | null>(null);
  const [isResettingRail, setIsResettingRail] = useState(false);
  const resetFrameRef = useRef<number | null>(null);
  const images = useMemo(
    () => imageUrls.map((imageUrl) => String(imageUrl).trim()).filter(Boolean),
    [imageUrls]
  );
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
  const imageCount = images.length;
  const moveGallery = useCallback((direction: GalleryMoveDirection) => {
    if (imageCount <= 1) return;
    setActiveIndex((current) =>
      direction === "next"
        ? (current + 1) % imageCount
        : (current - 1 + imageCount) % imageCount
    );
  }, [imageCount]);
  const handleGalleryDragEnd = useCallback(({ direction }: { direction: GalleryMoveDirection | null }) => {
    if (!direction) return;
    setSnapDirection((current) => current ?? direction);
  }, []);
  const handleRailTransitionEnd = useCallback((event: TransitionEvent<HTMLDivElement>) => {
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
    disabled: isLoading || imageCount <= 1 || snapDirection !== null || isResettingRail,
    mode: "swipe",
    dragStartThreshold: 3,
    threshold: 14,
    ignoreSelector: "[data-drag-ignore='true']",
    onDragEnd: handleGalleryDragEnd,
  });
  const visibleImages = useMemo(() => {
    if (imageCount <= 1) return activeImage ? [activeImage] : [];
    const previousImage = images[(activeIndex - 1 + imageCount) % imageCount];
    const nextImage = images[(activeIndex + 1) % imageCount];
    return [previousImage, activeImage, nextImage].filter(Boolean) as string[];
  }, [activeImage, activeIndex, images, imageCount]);
  const railTransform = imageCount > 1
    ? snapDirection === "next"
      ? "translateX(-200%)"
      : snapDirection === "previous"
        ? "translateX(0%)"
        : `translateX(calc(-100% + ${galleryDrag.dragDelta}px))`
    : undefined;
  const shouldAnimateRail = imageCount > 1 && !galleryDrag.isDragging && !galleryDrag.isPointerActive && !isResettingRail;

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-2">
        <Loading loading="skeleton-item" isLoading className="flex aspect-square w-full">
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-primary-border bg-primary-media" />
        </Loading>
      </div>
    );
  }

  if (!activeImage) {
    return (
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-primary-border bg-primary-media">
        <IoBagHandleOutline className="text-6xl text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
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
        <div
          className={`flex h-full w-full will-change-transform ${shouldAnimateRail ? "transition-transform duration-300 ease-out" : ""}`}
          style={{
            direction: "ltr",
            transform: railTransform,
          }}
          onTransitionEnd={handleRailTransitionEnd}
        >
          {visibleImages.map((imageUrl, index) => (
            <img
              key={`${imageUrl}-${index}`}
              src={imageUrl}
              alt={title || "محصول"}
              draggable={false}
              className="h-full w-full min-w-full flex-none object-cover"
            />
          ))}
        </div>
      </div>
      {images.length > 1 ? (
        <div className="flex justify-center gap-2">
          {images.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              data-drag-ignore="true"
              className={`h-2 w-2 rounded-full transition ${
                index === activeIndex ? "bg-primary w-4" : "bg-primary-border"
              } cursor-pointer hover:scale-125`}
              onClick={() => setActiveIndex(index)}
              aria-label={`نمایش تصویر محصول ${index + 1}`}
            >
              <span className="sr-only">{index + 1}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
