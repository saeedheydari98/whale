import React from "react";
import CustomLink from "./custom-link";
import { slugifyCatalogValue } from "@/lib/products-client";

type Props = {
  productId: string | number;
  productTitle?: string;
  children?: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  className?: string;
  externalHref?: string | null;
};

export default function ProductLink({
  productId,
  productTitle,
  children,
  size = "sm",
  className,
  icon,
  iconAfter,
  externalHref,
}: Props) {
  const slug = slugifyCatalogValue(productTitle || productId);
  const internalHref = `/products/${slug || productId}`;

  if (externalHref && externalHref !== "#") {
    return (
      <CustomLink href={externalHref} className={className} size={size} rounded="md" external>
        {children ?? "View"}
      </CustomLink>
    );
  }

  return (
    <CustomLink
      href={internalHref}
      className={className}
      icon={icon}
      iconAfter={iconAfter}
      size={size}
      rounded="md"
    >
      {children ?? "View"}
    </CustomLink>
  );
}
