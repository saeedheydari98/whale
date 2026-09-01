"use client";

import { StarRating } from "./star-rating";

type ProductRatingSummaryProps = {
  average?: number | string | null;
  count?: number | string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function normalizeAverage(value: ProductRatingSummaryProps["average"]) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(5, parsed)) : 0;
}

function normalizeCount(value: ProductRatingSummaryProps["count"]) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function ProductRatingSummary({
  average,
  count,
  size = "sm",
  className = "",
}: ProductRatingSummaryProps) {
  const ratingAverage = normalizeAverage(average);
  const ratingCount = normalizeCount(count);

  return (
    <div className={`flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden ${className}`}>
      <StarRating
        className="shrink-0"
        value={ratingAverage}
        size={size}
        ariaLabel={`میانگین امتیاز ${ratingAverage} از ۵`}
      />
      <span className="min-w-0 truncate text-xs font-semibold text-primary-text">
        {ratingAverage > 0 ? ratingAverage.toFixed(1) : "بدون امتیاز"}
      </span>
      <span className="shrink-0 text-xs text-secondary-text">
        ({ratingCount})
      </span>
    </div>
  );
}

export default ProductRatingSummary;
