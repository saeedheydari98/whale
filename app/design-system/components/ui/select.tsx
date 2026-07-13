"use client";

import React from "react";
import { resolveControlCssVars, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, motionVariants, radiusVariants, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import Loading, { LoadingVariant } from "../loading/loading";

type CustomSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  fullWidth?: boolean;
  loading?: LoadingVariant;
  isLoading?: boolean;
  loadingText?: string;
};

export function CustomSelect({
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "borderB",
  shadow = "none",
  fullWidth = true,
  className,
  disabled,
  children,
  loading = "spinner",
  isLoading = false,
  loadingText,
  style,
  ...rest
}: CustomSelectProps) {
  const colorStyle = resolveControlCssVars(variant);
  const isDisabled = disabled || isLoading;

  return (
    <div className={cx("relative inline-flex items-center", fullWidth && "w-full")}>
      <select
        {...rest}
        disabled={isDisabled}
        className={cx(
          "text-primary-text",
          "focus:outline-none focus:ring-2 focus:ring-primary-border",
          sizeVariants[size],
          radiusVariants[rounded],
          borderVariants[border],
          shadowVariants[shadow],
          motionVariants.smooth,
          fullWidth && "w-full",
          isDisabled && "opacity-50 cursor-not-allowed",
          className
        )}
        style={{
          backgroundColor: colorStyle.backgroundColor,
          borderColor: colorStyle.borderColor,
          ...style,
        }}
      >
        {children}
      </select>
      {isLoading && (
        <span className="absolute right-3 flex items-center gap-2 text-secondary-text">
          <Loading loading={loading} size={size} />
          {loadingText && <span className="text-sm">{loadingText}</span>}
        </span>
      )}
    </div>
  );
}
