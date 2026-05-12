"use client";

import React from "react";

import { useTheme } from "../../theme/provider";
import { resolveDynamicColor } from "../../theme/theme";
import { resolveVariantColors, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, radiusVariants, shadowVariants, sizeVariants } from "../../variants/shared.variant";

type BaseProps = React.HTMLAttributes<HTMLSpanElement>;

type CustomTagProps = BaseProps & {
  children?: React.ReactNode;

  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;

  fullWidth?: boolean;
  fullwidth?: boolean;

  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  iconafter?: React.ReactNode;

  token?: string;
  className?: string;
};

export const CustomTag: React.FC<CustomTagProps> = ({
  children,
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "none",
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
  const variantStyle = resolveVariantColors(variant, theme);

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
    <span
      {...rest}
      style={{
        backgroundColor: variantStyle.backgroundColor,
        color: variantStyle.color,
        borderColor: variantStyle.borderColor,
        borderStyle: "solid",
        borderWidth: "1px",
        ...style,
        ...tokenStyle,
      }}
      className={cx(
        "inline-flex items-center justify-center gap-2 font-medium",
        (fullWidth) && "w-full",
        sizeVariants[size],
        radiusVariants[rounded],
        border !== "none" && borderVariants[border],
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