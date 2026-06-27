"use client";

import Link, { type LinkProps } from "next/link";
import React from "react";
import { cx, motionVariants, radiusVariants, sizeVariants } from "../../variants/shared.variant";

type CustomLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  fullWidth?: boolean;
  external?: boolean;
};

export function CustomLink({
  children,
  className,
  icon,
  iconAfter,
  size = "sm",
  rounded = "md",
  fullWidth = false,
  external = false,
  href,
  ...props
}: CustomLinkProps) {
  const classes = cx(
    "inline-flex items-center justify-center gap-2 border border-primary-border bg-primary text-primary-contrast font-medium hover:bg-primary-hover active:scale-[0.98]",
    fullWidth && "w-full",
    sizeVariants[size],
    radiusVariants[rounded],
    motionVariants.smooth,
    className
  );

  const content = (
    <>
      {icon}
      <span>{children}</span>
      {iconAfter}
    </>
  );

  if (external) {
    return (
      <a href={String(href)} className={classes} rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {content}
    </Link>
  );
}

export default CustomLink;
