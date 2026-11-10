"use client";

import { type ComponentPropsWithRef } from "react";
import { cx } from "../../variants/shared.variant";

/** Common native action behavior; visual variants belong to Button or Selection. */
export function CustomActionButton({ type = "button", className, ...props }: ComponentPropsWithRef<"button">) {
  return (
    <button
      {...props}
      type={type}
      className={cx("touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-border focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
    />
  );
}
