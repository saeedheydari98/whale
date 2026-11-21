import React from "react";
import { encodeCatalogSegment } from "@/lib/products-client";
import { CustomButton } from "./button";
import type { UICommonVariant } from "../../variants/ui.variant";
import {
  borderVariants,
  GradientDirection,
  radiusVariants,
  shadowVariants,
  sizeVariants,
} from "../../variants/shared.variant";

type Props = {
  showcaseId: string | number;
  showcaseTitle?: string;
  children?: React.ReactNode;
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  gradient?: GradientDirection;
  shadow?: keyof typeof shadowVariants;
  fullWidth?: boolean;
  className?: string;
};

export default function ShowcaseLink({
  showcaseId,
  showcaseTitle,
  children,
  variant = "primary",
  size = "sm",
  rounded = "full",
  border,
  gradient,
  shadow,
  fullWidth,
  className,
}: Props) {
  const href = `/products/showcase/${encodeCatalogSegment(showcaseId)}`;

  return (
    <CustomButton
      href={href}
      aria-label={`مشاهده محصولات ${showcaseTitle || "ویترین"}`}
      variant={variant}
      size={size}
      rounded={rounded}
      border={border}
      gradient={gradient}
      shadow={shadow}
      fullWidth={fullWidth}
      className={className}
    >
      {children ?? "مشاهده همه"}
    </CustomButton>
  );
}
