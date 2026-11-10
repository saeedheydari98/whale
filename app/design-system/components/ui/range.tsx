"use client";

import { type InputHTMLAttributes } from "react";
import { cx } from "../../variants/shared.variant";

export function CustomRange({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input {...props} type="range" className={cx("price-range-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-border", className)} />;
}
