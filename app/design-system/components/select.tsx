"use client";

import React from "react";
import { useTheme } from "../theme/provider";
import { resolveVariantColors, UICommonVariant } from "../variants/ui.variant";
import { borderVariants, cx, motionVariants, radiusVariants, shadowVariants, sizeVariants } from "../variants/shared.variant";

type CustomSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  fullWidth?: boolean;
};

export function CustomSelect({
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "base",
  shadow = "none",
  fullWidth = true,
  className,
  disabled,
  children,
  ...rest
}: CustomSelectProps) {
  const { theme } = useTheme();
  const colorStyle = resolveVariantColors(variant, theme);

  return (
    <select
      {...rest}
      disabled={disabled}
      className={cx(
        "bg-bg-surface text-text-primary",
        "focus:outline-none focus:ring-2 focus:ring-ui-primary/30",
        sizeVariants[size],
        radiusVariants[rounded],
        borderVariants[border],
        shadowVariants[shadow],
        motionVariants.smooth,
        fullWidth && "w-full",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        borderColor: colorStyle.borderColor,
      }}
    >
      {children}
    </select>
  );
}
