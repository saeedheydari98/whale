"use client";

import React from "react";
import { useTheme } from "../theme/provider";
import { resolveVariantColors, UICommonVariant } from "../variants/ui.variant";
import { borderVariants, cx, radiusVariants, shadowVariants } from "../variants/shared.variant";

type CustomCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  title?: string;
  variant?: UICommonVariant;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  className?: string;
};

export function CustomCard({
  children,
  title,
  variant = "primary",
  rounded = "lg",
  border = "base",
  shadow = "sm",
  className,
  ...rest
}: CustomCardProps) {
  const { theme } = useTheme();
  const colorStyle = resolveVariantColors(variant, theme);

  return (
    <article
      {...rest}
      className={cx(
        "bg-bg-surface p-4",
        radiusVariants[rounded],
        borderVariants[border],
        shadowVariants[shadow],
        className
      )}
      style={{ borderColor: colorStyle.borderColor }}
    >
      {title && <h3 className="mb-2 text-lg font-semibold">{title}</h3>}
      <div>{children}</div>
    </article>
  );
}
