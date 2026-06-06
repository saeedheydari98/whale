"use client";

import React from "react";
import { resolveVariantColors, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, interactionStates, radiusVariants, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import { useTheme } from "../../theme/provider";
import Loading, { LoadingVariant } from "../loading/loading";

type CustomCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  title?: string;
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  hover?: keyof typeof interactionStates.hover;
  className?: string;
  loading?: LoadingVariant;
  isLoading?: boolean;
  loadingText?: string;
};

export function CustomCard({
  children,
  title,
  variant = "primary",
  size = "md",
  rounded = "lg",
  border = "base",
  shadow = "sm",
  className,
  hover = "lift",
  loading = "spinner",
  isLoading = false,
  loadingText,
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
        hover !== "none" && interactionStates.hover[hover],
        className
      )}
      style={{ borderColor: colorStyle.borderColor }}
    >
      {title && <h3 className="mb-2 text-lg font-semibold">{title}</h3>}
      <div>
        {isLoading && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loading loading={loading} size={size} />
            {loadingText && <span>{loadingText}</span>}
          </div>
        )}
        {!isLoading && children}
      </div>
    </article>
  );
}
