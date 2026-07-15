"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Loading from "@/app/design-system/components/loading/loading";
import { useHorizontalDrag } from "@/hooks/use-horizontal-drag";
import type { Banner } from "./types";

type BannerCarouselProps = {
  banner: Banner;
  onPreview: (imageUrl?: string) => void;
  isLoading?: boolean;
};

export function BannerCarousel({ banner, onPreview, isLoading = false }: BannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const imageUrls = useMemo(
    () => banner.imageUrls.map((imageUrl) => String(imageUrl)).filter(Boolean),
    [banner.imageUrls]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [banner.id, imageUrls.length]);

  useEffect(() => {
    if (imageUrls.length <= 1) return;
    const seconds = Number.isFinite(Number(banner.intervalSeconds)) ? Math.max(1, Number(banner.intervalSeconds)) : 5;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % imageUrls.length);
    }, seconds * 1000);

    return () => window.clearInterval(timer);
  }, [imageUrls.length, banner.intervalSeconds]);

  const activeImage = imageUrls[activeIndex] ?? imageUrls[0];
  const imageCount = imageUrls.length;
  const moveBanner = useCallback((direction: "previous" | "next") => {
    if (imageCount <= 1) return;
    setActiveIndex((current) =>
      direction === "next"
        ? (current + 1) % imageCount
        : (current - 1 + imageCount) % imageCount
    );
  }, [imageCount]);
  const bannerDrag = useHorizontalDrag<HTMLButtonElement>({
    disabled: isLoading || imageCount <= 1,
    mode: "swipe",
    threshold: 48,
    ignoreSelector: "[data-drag-ignore='true']",
    onSwipe: moveBanner,
  });
  const visibleImages = useMemo(() => {
    if (imageCount <= 1) return activeImage ? [activeImage] : [];
    const previousImage = imageUrls[(activeIndex - 1 + imageCount) % imageCount];
    const nextImage = imageUrls[(activeIndex + 1) % imageCount];
    return [previousImage, activeImage, nextImage].filter(Boolean) as string[];
  }, [activeImage, activeIndex, imageUrls, imageCount]);
  const heightPercent = Number.isFinite(Number(banner.heightPercent))
    ? Math.max(10, Math.min(100, Number(banner.heightPercent)))
    : 28;
  const bannerHeight = `${heightPercent}vh`;

  if (isLoading) {
    return (
      <section className="flex flex-col gap-2">
        <Loading loading="skeleton-item" isLoading className="w-full">
          <div className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-border-default bg-primary-media" style={{ height: bannerHeight }} />
        </Loading>
        <div className="flex justify-center gap-2">
          {imageUrls.map((imageUrl, index) => (
            <Loading key={`${imageUrl}-${index}`} loading="skeleton-item" isLoading>
              <div className={index === activeIndex ? "h-2 w-4 rounded-full" : "h-2 w-2 rounded-full"} />
            </Loading>
          ))}
        </div>
      </section>
    );
  }

  if (!activeImage) return null;

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        ref={bannerDrag.ref}
        className={`flex w-full cursor-pointer touch-pan-y select-none items-center justify-center overflow-hidden rounded-xl border border-primary-border bg-primary-media transition-transform hover:scale-[1.01] ${
          bannerDrag.isDragging ? "cursor-grabbing" : ""
        }`}
        style={{ height: bannerHeight }}
        onClick={() => {
          if (bannerDrag.shouldSuppressClick()) return;
          onPreview(activeImage);
        }}
        aria-label="باز کردن تصویر بنر"
        {...bannerDrag.dragHandlers}
      >
        <div
          className={`flex h-full w-full ${bannerDrag.isDragging ? "" : "transition-transform duration-200"}`}
          style={{
            direction: "ltr",
            transform: imageCount > 1
              ? `translateX(calc(-100% + ${bannerDrag.dragDelta}px))`
              : undefined,
          }}
        >
          {visibleImages.map((imageUrl, index) => (
            <img
              key={`${imageUrl}-${index}`}
              src={imageUrl}
              alt={banner.title || "بنر فروشگاه"}
              draggable={false}
              className="h-full w-full min-w-full flex-none object-cover"
            />
          ))}
        </div>
      </button>
      {imageUrls.length > 1 && (
        <div className="flex justify-center gap-2">
          {imageUrls.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              data-drag-ignore="true"
              className={`h-2 w-2 rounded-full transition ${
                index === activeIndex ? "bg-primary w-4" : "bg-primary-border"
              } cursor-pointer hover:scale-125`}
              onClick={() => setActiveIndex(index)}
              aria-label={`نمایش تصویر بنر ${index + 1}`}
            >
              <span className="sr-only">{index + 1}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
