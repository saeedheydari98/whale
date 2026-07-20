"use client";

import React from "react";

import { useTheme } from "../../theme/provider";
import { resolveDynamicColor } from "../../theme/theme";
import { resolveTokenTextColor, resolveVariantCssVars, strengthenBorderColor, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, GradientDirection, radiusVariants, resolveGradientStyle, shadowVariants, sizeVariants } from "../../variants/shared.variant";

type BaseProps = React.HTMLAttributes<HTMLSpanElement>;

type CustomTagProps = BaseProps & {
  children?: React.ReactNode;

  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  gradient?: GradientDirection;
  shadow?: keyof typeof shadowVariants;

  fullWidth?: boolean;

  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;

  token?: string;
  className?: string;
};

export const CustomTag: React.FC<CustomTagProps> = ({
  children,
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "base",
  gradient = "btu",
  shadow = "none",
  fullWidth = false,
  icon,
  iconAfter,
  token,
  className,
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const variantStyle = resolveVariantCssVars(variant);

  const tokenStyle: React.CSSProperties = {};

  if (token) {
    const resolvedColor = resolveDynamicColor({
      token,
      state: theme.state,
      admin: theme.admin,
    });

    if (token.startsWith("bg-")) {
      tokenStyle.backgroundColor = resolvedColor;
      Object.assign(tokenStyle, resolveGradientStyle(resolvedColor, gradient));
      tokenStyle.borderColor = strengthenBorderColor(resolvedColor);
      tokenStyle.color = resolveTokenTextColor(theme, token, 50);
    }

    if (token.startsWith("text-")) {
      tokenStyle.color = resolvedColor;
    }
  }

  return (
    <span
      {...rest}
      style={{
        backgroundColor: variantStyle.backgroundColor,
        ...resolveGradientStyle(variantStyle.backgroundColor, gradient),
        color: variantStyle.color,
        borderColor: variantStyle.borderColor,
        ...style,
        ...tokenStyle,
      }}
      className={cx(
        "inline-flex items-center justify-center gap-2 font-medium",
        (fullWidth) && "w-full",
        sizeVariants[size],
        radiusVariants[rounded],
        borderVariants[border],
        shadowVariants[shadow],
        className
      )}
    >
      {icon}
      <span>{children}</span>
      {iconAfter}
    </span>
  );
};
