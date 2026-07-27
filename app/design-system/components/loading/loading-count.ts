"use client";

import { useEffect, useState } from "react";

export type LoadingCountLayout =
  | "product-grid"
  | "product-rail"
  | "admin-product-card"
  | "admin-banner-card"
  | "admin-showcase-card"
  | "admin-catalog-item"
  | "admin-order-card"
  | "storefront-row";

type LoadingCountMetrics = {
  itemWidth: number;
  itemHeight: number;
  gap: number;
  max: number;
  reservedHeight: number;
  defaultCount: number;
  singleColumn?: boolean;
  singleRow?: boolean;
};

const loadingCountMetrics: Record<LoadingCountLayout, LoadingCountMetrics> = {
  "product-grid": { itemWidth: 288, itemHeight: 184, gap: 12, max: 12, reservedHeight: 280, defaultCount: 8 },
  "product-rail": { itemWidth: 288, itemHeight: 184, gap: 12, max: 6, reservedHeight: 0, defaultCount: 4, singleRow: true },
  "admin-product-card": { itemWidth: 256, itemHeight: 68, gap: 10, max: 12, reservedHeight: 260, defaultCount: 8 },
  "admin-banner-card": { itemWidth: 640, itemHeight: 240, gap: 20, max: 1, reservedHeight: 260, defaultCount: 1, singleColumn: true },
  "admin-showcase-card": { itemWidth: 640, itemHeight: 220, gap: 20, max: 2, reservedHeight: 260, defaultCount: 1, singleColumn: true },
  "admin-catalog-item": { itemWidth: 176, itemHeight: 116, gap: 12, max: 6, reservedHeight: 360, defaultCount: 4, singleRow: true },
  "admin-order-card": { itemWidth: 320, itemHeight: 230, gap: 12, max: 4, reservedHeight: 320, defaultCount: 4 },
  "storefront-row": { itemWidth: 640, itemHeight: 86, gap: 12, max: 6, reservedHeight: 260, defaultCount: 4, singleColumn: true },
};

function clampCount(value: number, max: number) {
  return Math.max(1, Math.min(max, Math.round(value)));
}

function getViewportCount(layout: LoadingCountLayout) {
  const metrics = loadingCountMetrics[layout];
  if (typeof window === "undefined") return metrics.defaultCount;

  const width = Math.max(320, window.innerWidth - 32);
  const height = Math.max(metrics.itemHeight, window.innerHeight - metrics.reservedHeight);
  const columns = metrics.singleColumn
    ? 1
    : Math.max(1, Math.floor((width + metrics.gap) / (metrics.itemWidth + metrics.gap)));
  const rows = metrics.singleRow
    ? 1
    : Math.max(1, Math.floor((height + metrics.gap) / (metrics.itemHeight + metrics.gap)));

  return clampCount(columns * rows, metrics.max);
}

export function resolveLoadingItemCount(itemCount: number | undefined, viewportCount: number) {
  if (Number.isFinite(itemCount)) {
    return Math.max(0, Math.min(Math.max(0, Math.round(Number(itemCount))), viewportCount));
  }

  return viewportCount;
}

export function useLoadingViewportCount(layout: LoadingCountLayout) {
  const [count, setCount] = useState(() => getViewportCount(layout));

  useEffect(() => {
    const updateCount = () => setCount(getViewportCount(layout));
    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, [layout]);

  return count;
}
