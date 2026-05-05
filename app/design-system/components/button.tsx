"use client";

import React from "react";

import { useTheme } from "../theme/provider";
import { resolveDynamicColor } from "../theme/theme";
import { resolveVariantColors, UICommonVariant } from "../variants/ui.variant";
import { borderVariants, cx, interactionStates, motionVariants, radiusVariants, shadowVariants, sizeVariants } from "../variants/shared.variant";


type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

type CustomButtonProps = BaseProps & {
  children: React.ReactNode;

  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  fullWidth?: boolean;
  fullwidth?: boolean;

  loading?: boolean;
  disabled?: boolean;

  hover?: keyof typeof interactionStates.hover;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  iconafter?: React.ReactNode;

  token?: string;
  className?: string;
};

export const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "none",
  shadow = "none",
  fullWidth = false,
  fullwidth = false,
  loading = false,
  disabled = false,
  hover = "scale",
  icon,
  iconAfter,
  iconafter,
  token,
  onClick,
  className,
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const variantStyle = resolveVariantColors(variant, theme);
  const isDisabled = disabled || loading;

  const tokenStyle: React.CSSProperties = {};

  if (token) {
    const resolvedColor = resolveDynamicColor({
      token,
      state: theme.state,
      admin: theme.admin,
      user: theme.user,
    });

    if (token.startsWith("bg-")) {
      tokenStyle.backgroundColor = resolvedColor;
      tokenStyle.borderColor = resolvedColor;
      tokenStyle.color = "#ffffff";
    }

    if (token.startsWith("text-")) {
      tokenStyle.color = resolvedColor;
    }
  }

  return (
    <button
      {...rest}
      disabled={isDisabled}
      onClick={onClick}
      style={{
        backgroundColor: variantStyle.backgroundColor,
        color: variantStyle.color,
        borderColor: variantStyle.borderColor,
        ...style,
        ...tokenStyle,
      }}
      className={cx(
        "inline-flex items-center justify-center gap-2 font-medium",
        (fullWidth || fullwidth) && "w-full",
        sizeVariants[size],
        radiusVariants[rounded],
        borderVariants[border],
        shadowVariants[shadow],
        motionVariants.smooth,
        !isDisabled && interactionStates.hover[hover],
        !isDisabled && interactionStates.active.press,
        isDisabled && interactionStates.disabled.base,
        className
      )}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {!loading && icon}
      <span>{loading ? "Loading..." : children}</span>
      {!loading && (iconAfter ?? iconafter)}
    </button>
  );
};