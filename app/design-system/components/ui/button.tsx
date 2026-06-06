"use client";

import React from "react";

import { useTheme } from "../../theme/provider";
import { resolveDynamicColor } from "../../theme/theme";
import { resolveVariantColors, strengthenBorderColor, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cursorVariants, cx, interactionStates, motionVariants, radiusVariants, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import Loading, { LoadingVariant } from "../loading/loading";


type BaseProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

type CustomButtonProps = BaseProps & {
  children?: React.ReactNode;

  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  cursor?: keyof typeof cursorVariants;
  fullWidth?: boolean;
  loading?: LoadingVariant;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  hover?: keyof typeof interactionStates.hover;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
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
  cursor = "pointer",
  fullWidth = false,
  loading = "spinner",
  isLoading = false,
  loadingText,
  disabled = false,
  hover = "lift",
  icon,
  iconAfter,
  token,
  onClick,
  className,
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const variantStyle = resolveVariantColors(variant, theme);
  const isDisabled = disabled || isLoading;

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
      tokenStyle.borderColor = strengthenBorderColor(resolvedColor);
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
        "inline-flex items-center justify-center gap-2 font-medium ",
        (fullWidth) && "w-full",
        sizeVariants[size],
        radiusVariants[rounded],
        borderVariants[border],
        cursorVariants[cursor],
        shadowVariants[shadow],
        motionVariants.smooth,
        !isDisabled && interactionStates.hover[hover],
        !isDisabled && interactionStates.active.press,
        isDisabled && interactionStates.disabled.base,
        className
      )}
    >
      {isLoading && <Loading loading={loading} size={size} />}
      {!isLoading && icon}
      <span>{isLoading ? loadingText ?? children : children}</span>
      {!isLoading && iconAfter}
    </button>
  );
};
