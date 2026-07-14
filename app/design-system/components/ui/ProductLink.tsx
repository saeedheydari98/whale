"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getProductDetail, slugifyCatalogValue } from "@/lib/products-client";
import { CustomButton } from "./button";
import type { UICommonVariant } from "../../variants/ui.variant";
import {
  borderVariants,
  radiusVariants,
  shadowVariants,
  sizeVariants,
} from "../../variants/shared.variant";

type Props = {
  productId: string | number;
  productTitle?: string;
  children?: React.ReactNode;
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  className?: string;
  externalHref?: string | null;
};

export default function ProductLink({
  productId,
  productTitle,
  children,
  variant = "primary",
  size = "sm",
  rounded = "md",
  border,
  shadow,
  fullWidth,
  className,
  icon,
  iconAfter,
  externalHref,
}: Props) {
  const queryClient = useQueryClient();
  const slug = slugifyCatalogValue(productTitle || productId);
  const productSegment = slug || String(productId);
  const internalHref = `/products/${productSegment}`;
  const isExternal = Boolean(externalHref && externalHref !== "#");
  const productQueryKey = ["catalog", "product", productSegment] as const;
  const prefetchProduct = () => {
    if (isExternal || !productSegment) return;

    const currentQuery = queryClient.getQueryState(productQueryKey);
    if (currentQuery?.status === "success" || currentQuery?.fetchStatus === "fetching") return;

    void queryClient.prefetchQuery({
      queryKey: productQueryKey,
      queryFn: () => getProductDetail(productSegment),
    });
  };

  return (
    <CustomButton
      href={isExternal ? String(externalHref) : internalHref}
      variant={variant}
      size={size}
      rounded={rounded}
      border={border}
      shadow={shadow}
      fullWidth={fullWidth}
      className={className}
      icon={icon}
      iconAfter={iconAfter}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      onFocus={prefetchProduct}
      onMouseEnter={prefetchProduct}
      onPointerDown={prefetchProduct}
      onTouchStart={prefetchProduct}
    >
      {children ?? "مشاهده"}
    </CustomButton>
  );
}
