import React from "react";
import CustomLink from "./custom-link";
import { slugifyCatalogValue } from "@/lib/products-client";

type Props = {
  showcaseId: string | number;
  showcaseTitle?: string;
  children?: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

export default function ShowcaseLink({
  showcaseId,
  showcaseTitle,
  children,
  size = "sm",
  className,
}: Props) {
  const slug = slugifyCatalogValue(showcaseTitle || showcaseId);
  const href = `/products/showcase/${slug || showcaseId}`;

  return (
    <CustomLink
      href={href}
      className={className}
      size={size}
      rounded="full"
    >
      {children ?? "See all"}
    </CustomLink>
  );
}
