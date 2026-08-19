"use client";

import React from "react";

import { useTheme } from "../../theme/provider";
import { resolveDynamicColor } from "../../theme/theme";
import { resolveTokenTextColor, resolveVariantCssVars, strengthenBorderColor, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, glassSurfaceClasses, GradientDirection, radiusVariants, resolveGlassBackground, resolveGradientStyle, shadowVariants, sizeVariants } from "../../variants/shared.variant";

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
  gradient,
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
  const glassBackground = resolveGlassBackground(variantStyle.backgroundColor, 84);

  const tokenStyle: React.CSSProperties = {};

  if (token) {
    const resolvedColor = resolveDynamicColor({
      token,
      state: theme.state,
      admin: theme.admin,
    });

    if (token.startsWith("bg-")) {
      const tokenBackground = resolveGlassBackground(resolvedColor, 84);
      tokenStyle.backgroundColor = tokenBackground;
      const tokenBorderColor = strengthenBorderColor(resolvedColor);
      Object.assign(tokenStyle, resolveGradientStyle(tokenBackground, gradient, tokenBorderColor));
      tokenStyle.borderColor = tokenBorderColor;
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
        backgroundColor: glassBackground,
        ...resolveGradientStyle(glassBackground, gradient, variantStyle.borderColor),
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
        glassSurfaceClasses,
        className
      )}
    >
      {icon}
      <span>{children}</span>
      {iconAfter}
    </span>
  );
};
