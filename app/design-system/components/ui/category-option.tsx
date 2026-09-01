"use client";

import React from "react";
import { GiSpermWhale } from "react-icons/gi";
import { cx } from "../../variants/shared.variant";
import { AppImage } from "./app-image";

type CategoryOptionProps = {
  label: string;
  imageUrl?: string | null;
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "rounded";
  className?: string;
  onClick?: () => void;
  onImageClick?: () => void;
};

const sizeClasses = {
  sm: {
    image: "h-14 w-14",
    text: "text-xs",
    frame: "h-27 w-28",
  },
  md: {
    image: "h-20 w-20",
    text: "text-sm",
    frame: "h-32 w-28",
  },
  lg: {
    image: "h-24 w-24",
    text: "text-base",
    frame: "h-36 w-28",
  },
};

export function CategoryOption({
  label,
  imageUrl,
  selected = false,
  disabled = false,
  size = "md",
  shape = "circle",
  className,
  onClick,
  onImageClick,
}: CategoryOptionProps) {
  const imageContent = (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center overflow-hidden border bg-primary-media text-primary transition",
        shape === "circle" ? "rounded-full" : "rounded-xl",
        selected ? "border-primary bg-primary-soft ring-2 ring-primary-border" : "border-primary-border",
        sizeClasses[size].image
      )}
    >
      {imageUrl ? (
        <AppImage src={imageUrl} alt={label} width={96} height={96} className="h-full w-full object-cover" />
      ) : (
        <GiSpermWhale className="text-3xl" aria-hidden="true" />
      )}
    </span>
  );
  const content = (
    <>
      {onImageClick && !onClick && imageUrl ? (
        <button type="button" className={shape === "circle" ? "rounded-full" : "rounded-xl"} onClick={onImageClick} aria-label="باز کردن تصویر">
          {imageContent}
        </button>
      ) : imageContent}
      <span className={cx("line-clamp-1 min-h-5 w-full max-w-24 text-center font-bold text-primary-text", sizeClasses[size].text)}>
        {label}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div className={cx("flex shrink-0 flex-col items-center gap-2 overflow-hidden p-2", sizeClasses[size].frame, className)}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cx(
        "flex shrink-0 cursor-pointer flex-col items-center gap-2 overflow-hidden rounded-lg border border-transparent p-2 transition hover:scale-[1.03] hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60",
        sizeClasses[size].frame,
        selected ? "border-primary-border bg-primary-soft" : "bg-transparent",
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export default CategoryOption;
