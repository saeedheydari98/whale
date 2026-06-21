"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { CustomButton } from "./button";
import { slugifyCatalogValue } from "@/lib/products-client";

type Props = {
  showcaseId: string | number;
  showcaseTitle?: string;
  children?: React.ReactNode;
  variant?: Parameters<typeof CustomButton>[0]["variant"];
  size?: Parameters<typeof CustomButton>[0]["size"];
  className?: string;
};

export default function ShowcaseLink({
  showcaseId,
  showcaseTitle,
  children,
  variant = "neutral",
  size = "sm",
  className,
}: Props) {
  const router = useRouter();
  const slug = slugifyCatalogValue(showcaseTitle || showcaseId);
  const href = `/products/showcase/${slug || showcaseId}`;

  return (
    <CustomButton
      type="button"
      className={className}
      variant={variant}
      size={size}
      rounded="full"
      border="base"
      onClick={() => router.push(href)}
    >
      {children ?? "See all"}
    </CustomButton>
  );
}
