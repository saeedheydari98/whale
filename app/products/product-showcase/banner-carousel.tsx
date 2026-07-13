"use client";

import { useEffect, useState } from "react";
import Loading from "@/app/design-system/components/loading/loading";
import type { Banner } from "./types";

type BannerCarouselProps = {
  banner: Banner;
  onPreview: (imageUrl?: string) => void;
  isLoading?: boolean;
};

export function BannerCarousel({ banner, onPreview, isLoading = false }: BannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [banner.id, banner.imageUrls.length]);

  useEffect(() => {
    if (banner.imageUrls.length <= 1) return;
    const seconds = Number.isFinite(Number(banner.intervalSeconds)) ? Math.max(1, Number(banner.intervalSeconds)) : 5;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banner.imageUrls.length);
    }, seconds * 1000);

    return () => window.clearInterval(timer);
  }, [banner.imageUrls.length, banner.intervalSeconds]);

  const activeImage = banner.imageUrls[activeIndex] ?? banner.imageUrls[0];
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
          {banner.imageUrls.map((imageUrl, index) => (
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
        className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-primary-border bg-primary-media"
        style={{ height: bannerHeight }}
        onClick={() => onPreview(activeImage)}
        aria-label="باز کردن تصویر بنر"
      >
        <img
          src={activeImage}
          alt={banner.title || "بنر فروشگاه"}
          className="h-full w-full object-cover"
        />
      </button>
      {banner.imageUrls.length > 1 && (
        <div className="flex justify-center gap-2">
          {banner.imageUrls.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              className={`h-2 w-2 rounded-full transition ${
                index === activeIndex ? "bg-primary w-4" : "bg-primary-border"
              }`}
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
