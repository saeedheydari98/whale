"use client";

import React, { useState } from "react";
import { IoStar, IoStarHalf, IoStarOutline } from "react-icons/io5";
import { cx } from "../../variants/shared.variant";

type StarRatingProps = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  disabled?: boolean;
  onChange?: (value: number) => void;
  className?: string;
  ariaLabel?: string;
};

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 28,
};

function getStarState(value: number, index: number) {
  const threshold = index + 1;
  if (value >= threshold) return "full";
  if (value >= threshold - 0.5) return "half";
  return "empty";
}

export function StarRating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  disabled = false,
  onChange,
  className,
  ariaLabel,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const iconSize = sizeMap[size];
  const displayValue = interactive && hoverValue !== null ? hoverValue : value;
  const emptyStarClassName = displayValue === 0 ? "text-primary-text" : "text-primary-border";

  const renderStar = (index: number) => {
    const starNumber = index + 1;
    const state = getStarState(displayValue, index);

    const icon =
      state === "full" ? (
        <IoStar size={iconSize} className="text-amber-400" aria-hidden="true" />
      ) : state === "half" ? (
        <IoStarHalf size={iconSize} className="text-amber-400" aria-hidden="true" />
      ) : (
        <IoStarOutline size={iconSize} className={emptyStarClassName} aria-hidden="true" />
      );

    if (!interactive) {
      return (
        <span key={starNumber} className="inline-flex">
          {icon}
        </span>
      );
    }

    return (
      <button
        key={starNumber}
        type="button"
        disabled={disabled}
        className={cx(
          "inline-flex items-center justify-center rounded-sm transition-transform",
          !disabled && "cursor-pointer hover:scale-110",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onMouseEnter={() => !disabled && setHoverValue(starNumber)}
        onMouseLeave={() => setHoverValue(null)}
        onClick={() => !disabled && onChange?.(starNumber)}
        aria-label={`امتیاز ${starNumber} از ${max} ستاره`}
      >
        {icon}
      </button>
    );
  };

  return (
    <div
      className={cx("inline-flex items-center gap-0.5", className)}
      role={interactive ? "group" : "img"}
      aria-label={ariaLabel ?? `${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, index) => renderStar(index))}
    </div>
  );
}
