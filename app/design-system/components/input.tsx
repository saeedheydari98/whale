"use client";

import React from "react";
import { useTheme } from "../theme/provider";
import { resolveVariantColors, UICommonVariant } from "../variants/ui.variant";
import { borderVariants, cx, interactionStates, motionVariants, radiusVariants, shadowVariants, sizeVariants } from "../variants/shared.variant";

type CustomInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  fullWidth?: boolean;
};

export function CustomInput({
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "base",
  shadow = "none",
  fullWidth = true,
  className,
  disabled,
  ...rest
}: CustomInputProps) {
  const { theme } = useTheme();
  const colorStyle = resolveVariantColors(variant, theme);

  return (
    <input
      {...rest}
      disabled={disabled}
      className={cx(
        "bg-bg-surface text-text-primary placeholder:text-text-secondary",
        "focus:outline-none focus:ring-2 focus:ring-ui-primary/30",
        sizeVariants[size],
        radiusVariants[rounded],
        borderVariants[border],
        shadowVariants[shadow],
        motionVariants.smooth,
        !disabled && interactionStates.hover.none,
        disabled && interactionStates.disabled.base,
        fullWidth && "w-full",
        className
      )}
      style={{
        borderColor: colorStyle.borderColor,
      }}
    />
  );
}
