"use client";

import React from "react";
import { resolveVariantCssVars, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, GradientDirection, interactionStates, radiusVariants, resolveGradientStyle, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import Loading, { LoadingVariant } from "../loading/loading";

type CustomCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  title?: string;
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  gradient?: GradientDirection;
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
  gradient = "btu",
  shadow = "sm",
  className,
  hover = "lift",
  loading = "spinner",
  isLoading = false,
  loadingText,
  style,
  ...rest
}: CustomCardProps) {
  const colorStyle = resolveVariantCssVars(variant);
  const backgroundColor = "var(--secondary-card)";

  return (
    <article
      {...rest}
      className={cx(
        "bg-secondary-card p-4",
        radiusVariants[rounded],
        borderVariants[border],
        shadowVariants[shadow],
        hover !== "none" && interactionStates.hover[hover],
        className
      )}
      style={{
        backgroundColor,
        ...resolveGradientStyle(backgroundColor, gradient),
        borderColor: colorStyle.borderColor,
        ...style,
      }}
    >
      <div>
        {title && <div className="mb-2 text-lg font-semibold">{title}</div>}
        <div>
          {isLoading ? (
            <Loading
              loading={loading === "spinner" ? "skeleton-card" : loading}
              isLoading
              className="w-full"
            >
              <div className="flex min-h-20 w-full flex-col gap-3">{children}</div>
            </Loading>
          ) : (
            children
          )}
        </div>
      </div>
    </article>
  );
}
