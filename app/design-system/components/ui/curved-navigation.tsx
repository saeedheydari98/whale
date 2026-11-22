"use client";

import type { CSSProperties, ReactNode } from "react";
import { cx } from "../../variants/shared.variant";
import styles from "./curved-navigation.module.css";

/** The cutout and floating disc share the same center, including in RTL. */
export function CurvedNavigation({
  activeIndex,
  itemCount,
  children,
  className,
  placement = "footer",
}: {
  activeIndex: number;
  itemCount: number;
  children: ReactNode;
  className?: string;
  placement?: "header" | "footer";
}) {
  const isHeader = placement === "header";
  const center = 100 - ((Math.max(0, activeIndex) + 0.5) / itemCount) * 100;
  const style = {
    "--nav-center": `${center}%`,
    // Mask percentages use the space left after subtracting the mask width.
    "--nav-notch-position": `calc(${center}% + var(--nav-notch-width) * ${center / 100 - 0.5})`,
  } as CSSProperties;

  return (
    <nav
      aria-label="منوی اصلی"
      dir="rtl"
      className={cx("relative isolate flex w-full items-stretch", isHeader ? "h-15 [--nav-notch-width:80px] [--nav-notch-height:30px]" : "h-16 [--nav-notch-width:min(96px,calc(25vw-0.5rem))] [--nav-notch-height:36px] md:h-12 md:[--nav-notch-width:80px] md:[--nav-notch-height:30px]", className)}
      style={style}
    >
      <div aria-hidden="true" className={cx("pointer-events-none absolute inset-0 -z-10 overflow-hidden", !isHeader && "rounded-3xl drop-shadow-[0_8px_18px_color-mix(in_srgb,var(--primary-text)_10%,transparent)] md:rounded-2xl")}>
        <div className={cx("h-full bg-primary-panel", isHeader ? styles.headerSurface : "rounded-3xl md:rounded-2xl", styles.surface)} data-active={activeIndex >= 0}>
          {!isHeader && <div className={cx("h-full rounded-[inherit] border border-border-default", styles.footerOutline)} data-active={activeIndex >= 0} />}
        </div>
        {/* One stroke joins the header's straight edge and curved shoulders. */}
        <svg
          viewBox="0 0 96 36"
          preserveAspectRatio="none"
          fill="none"
          focusable="false"
          className={cx("absolute left-(--nav-center) h-(--nav-notch-height) w-(--nav-notch-width) -translate-x-1/2 overflow-visible transition-[left,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none", isHeader ? "bottom-0 -scale-y-100" : "top-0")}
          style={{ opacity: isHeader || activeIndex >= 0 ? 1 : 0 }}
        >
          <path
            d={isHeader
              ? activeIndex >= 0
                ? "M-10000 0H0C12 0 12 7 18 17C24 29 34 36 48 36S72 29 78 17C84 7 84 0 96 0H10000"
                : "M-10000 0H10000"
              : "M0 0C12 0 12 7 18 17C24 29 34 36 48 36S72 29 78 17C84 7 84 0 96 0"}
            stroke="var(--border-default)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            // Inset the stroke by half a CSS pixel inside the SVG, not its box.
            // The 36-unit viewBox renders at 30px in the header and 36px below.
            transform={isHeader ? "translate(0 0.6)" : "translate(0 0.5)"}
          />
        </svg>
      </div>
      <span
        aria-hidden="true"
        className={cx("pointer-events-none absolute left-(--nav-center) -z-10 -translate-x-1/2 rounded-full border border-border-default bg-primary-panel transition-[left,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none", isHeader ? "-bottom-5 size-10" : "-top-7 size-14 shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_10%,transparent)] md:-top-5 md:size-10")}
        style={{ opacity: activeIndex >= 0 ? 1 : 0 }}
      />
      {children}
    </nav>
  );
}
