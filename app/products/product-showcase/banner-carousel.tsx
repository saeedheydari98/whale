"use client";

import { useEffect, useState } from "react";
import type { Banner } from "./types";

type BannerCarouselProps = {
  banner: Banner;
  onPreview: (imageUrl?: string) => void;
};

export function BannerCarousel({ banner, onPreview }: BannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [banner.id, banner.imageUrls.length]);

  useEffect(() => {
    if (banner.imageUrls.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banner.imageUrls.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [banner.imageUrls.length]);

  const activeImage = banner.imageUrls[activeIndex] ?? banner.imageUrls[0];

  if (!activeImage) return null;

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        className="flex h-56 w-full items-center justify-center overflow-hidden rounded-xl border border-ui-primary/20"
        onClick={() => onPreview(activeImage)}
        aria-label="Open banner image"
      >
        <img
          src={activeImage}
          alt={banner.title || "Banner"}
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
                index === activeIndex ? "bg-ui-primary w-4" : "bg-ui-primary/25"
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show banner image ${index + 1}`}
            >
              <span className="sr-only">{index + 1}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
