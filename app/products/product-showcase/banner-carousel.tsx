"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TransitionEvent } from "react";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { useHorizontalDrag } from "@/hooks/use-horizontal-drag";
import type { Banner } from "./types";

type BannerCarouselProps = {
  banner: Banner;
  onPreview: (imageUrl?: string) => void;
  isLoading?: boolean;
};

type BannerMoveDirection = "previous" | "next";

export function BannerCarousel({ banner, onPreview, isLoading = false }: BannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [snapDirection, setSnapDirection] = useState<BannerMoveDirection | null>(null);
  const [isResettingRail, setIsResettingRail] = useState(false);
  const resetFrameRef = useRef<number | null>(null);
  const imageUrls = useMemo(
    () => banner.imageUrls.map((imageUrl) => String(imageUrl)).filter(Boolean),
    [banner.imageUrls]
  );

  useEffect(() => {
    setActiveIndex(0);
    setSnapDirection(null);
    setIsResettingRail(false);
  }, [banner.id, imageUrls.length]);

  useEffect(() => {
    return () => {
      if (resetFrameRef.current !== null) {
        window.cancelAnimationFrame(resetFrameRef.current);
      }
    };
  }, []);

  const activeImage = imageUrls[activeIndex] ?? imageUrls[0];
  const imageCount = imageUrls.length;
  const moveBanner = useCallback((direction: BannerMoveDirection) => {
    if (imageCount <= 1) return;
    setActiveIndex((current) =>
      direction === "next"
        ? (current + 1) % imageCount
        : (current - 1 + imageCount) % imageCount
    );
  }, [imageCount]);
  const handleBannerDragEnd = useCallback(({ direction }: { direction: BannerMoveDirection | null }) => {
    if (!direction) return;
    setSnapDirection((current) => current ?? direction);
  }, []);
  const handleRailTransitionEnd = useCallback((event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform" || !snapDirection) return;

    setIsResettingRail(true);
    moveBanner(snapDirection);
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
  }, [moveBanner, snapDirection]);
  const bannerDrag = useHorizontalDrag<HTMLButtonElement>({
    disabled: isLoading || imageCount <= 1 || snapDirection !== null || isResettingRail,
    mode: "swipe",
    dragStartThreshold: 3,
    threshold: 14,
    ignoreSelector: "[data-drag-ignore='true']",
    onDragEnd: handleBannerDragEnd,
  });
  const shouldPauseRotation = isHovered || bannerDrag.isPointerActive || bannerDrag.isDragging || snapDirection !== null || isResettingRail;

  useEffect(() => {
    if (imageUrls.length <= 1 || shouldPauseRotation) return;
    const seconds = Number.isFinite(Number(banner.intervalSeconds)) ? Math.max(1, Number(banner.intervalSeconds)) : 5;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % imageUrls.length);
    }, seconds * 1000);

    return () => window.clearInterval(timer);
  }, [imageUrls.length, banner.intervalSeconds, shouldPauseRotation]);

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
  const railTransform = imageCount > 1
    ? snapDirection === "next"
      ? "translateX(-200%)"
      : snapDirection === "previous"
        ? "translateX(0%)"
        : `translateX(calc(-100% + ${bannerDrag.dragDelta}px))`
    : undefined;
  const shouldAnimateRail = imageCount > 1 && !bannerDrag.isDragging && !bannerDrag.isPointerActive && !isResettingRail;

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
      <div
        className="relative flex w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
      >
        <button
          type="button"
          ref={bannerDrag.ref}
          className={`flex w-full cursor-grab touch-pan-y select-none items-center justify-center overflow-hidden rounded-xl border border-primary-border bg-primary-media transition-shadow hover:border-primary ${
            bannerDrag.isDragging ? "cursor-grabbing" : ""
          }`}
          style={{ height: bannerHeight }}
          onClick={() => {
            if (bannerDrag.shouldSuppressClick()) return;
            onPreview(activeImage);
          }}
          onDragStart={(event) => event.preventDefault()}
          aria-label="باز کردن تصویر بنر"
          aria-roledescription="carousel"
          {...bannerDrag.dragHandlers}
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
                alt={banner.title || "بنر فروشگاه"}
                draggable={false}
                className="h-full w-full min-w-full flex-none object-cover"
              />
            ))}
          </div>
        </button>
        {imageCount > 1 ? (
          <>
            <button
              type="button"
              data-drag-ignore="true"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-primary-border bg-primary-card/85 text-lg text-primary-text shadow-md backdrop-blur transition hover:bg-primary hover:text-primary-contrast"
              disabled={snapDirection !== null || isResettingRail}
              onClick={() => moveBanner("previous")}
              aria-label="تصویر قبلی"
            >
              <IoChevronBackOutline aria-hidden="true" />
            </button>
            <button
              type="button"
              data-drag-ignore="true"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-primary-border bg-primary-card/85 text-lg text-primary-text shadow-md backdrop-blur transition hover:bg-primary hover:text-primary-contrast"
              disabled={snapDirection !== null || isResettingRail}
              onClick={() => moveBanner("next")}
              aria-label="تصویر بعدی"
            >
              <IoChevronForwardOutline aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
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
