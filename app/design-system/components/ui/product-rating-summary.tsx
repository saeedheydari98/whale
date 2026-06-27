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
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <StarRating
        value={ratingAverage}
        size={size}
        ariaLabel={`Average rating ${ratingAverage} out of 5`}
      />
      <span className="text-xs font-semibold text-primary-text">
        {ratingAverage > 0 ? ratingAverage.toFixed(1) : "No ratings"}
      </span>
      <span className="text-xs text-secondary-text">
        ({ratingCount})
      </span>
    </div>
  );
}

export default ProductRatingSummary;
