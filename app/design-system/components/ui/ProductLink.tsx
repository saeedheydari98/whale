"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { CustomButton } from "./button";

type Props = {
  productId: string | number;
  children?: React.ReactNode;
  variant?: Parameters<typeof CustomButton>[0]["variant"];
  size?: Parameters<typeof CustomButton>[0]["size"];
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  className?: string;
  externalHref?: string | null;
};

export default function ProductLink({
  productId,
  children,
  variant = "primary",
  size = "sm",
  className,
  icon,
  iconAfter,
  externalHref,
}: Props) {
  const router = useRouter();
  const internalHref = `/products/${productId}`;

  if (externalHref && externalHref !== "#") {
    return (
      <CustomButton href={externalHref} className={className} variant={variant} size={size} rounded="md">
        {children ?? "View"}
      </CustomButton>
    );
  }

  return (
    <CustomButton
      type="button"
      className={className}
      icon={icon}
      iconAfter={iconAfter}
      variant={variant}
      size={size}
      rounded="md"
      onClick={() => router.push(internalHref)}
    >
      {children ?? "View"}
    </CustomButton>
  );
}
