"use client";

import React from "react";
import { motion } from "motion/react";
import { cx, radiusVariants, sizeVariants } from "../../variants/shared.variant";

export type LoadingVariant =
  | "spinner"
  | "ring"
  | "dots"
  | "pulse"
  | "bars"
  | "page"
  | "skeleton"
  | "skeleton-block"
  | "skeleton-card"
  | "skeleton-item";

type LoadingSize = keyof typeof sizeVariants;

interface LoadingProps {
  loading?: LoadingVariant;
  size?: LoadingSize;
  className?: string;
  children?: React.ReactNode;
  /** When false, skeleton variants render children normally. Defaults to true. */
  isLoading?: boolean;
}

function SkeletonShell({
  tone,
  className,
  children,
}: {
  tone: "card" | "item";
  className?: string;
  children?: React.ReactNode;
}) {
  const backgroundColor = tone === "card" ? "#f3f3f3" : "#eeeeee";

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cx(
        "pointer-events-none relative overflow-hidden",
        tone === "card" ? "shadow-sm" : "",
        radiusVariants.lg,
        className
      )}
      style={{ backgroundColor, filter: "grayscale(1)" }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, #fafafa 50%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ repeat: Infinity, duration: tone === "card" ? 3.2 : 2.6, ease: "linear" }}
      />
      <div className="invisible" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}

export default function Loading({
  loading = "spinner",
  size = "md",
  className,
  children,
  isLoading = true,
}: LoadingProps) {
  const resolvedSize =
    size === "xs"
      ? 12
      : size === "sm"
        ? 14
        : size === "md"
          ? 18
          : size === "lg"
            ? 22
            : size === "xl"
              ? 26
              : size === "xxl"
                ? 30
                : size === "xxxl"
                  ? 34
                  : 18;

  const isCardSkeleton =
    loading === "skeleton" ||
    loading === "skeleton-block" ||
    loading === "skeleton-card";

  if (isCardSkeleton) {
    if (!isLoading) return <>{children}</>;
    return (
      <SkeletonShell tone="card" className={className}>
        {children}
      </SkeletonShell>
    );
  }

  if (loading === "skeleton-item") {
    if (!isLoading) return <>{children}</>;
    return (
      <SkeletonShell tone="item" className={className}>
        {children}
      </SkeletonShell>
    );
  }

  if (loading === "spinner") {
    return (
      <div
        className={cx(
          "animate-spin rounded-full border-2 border-current/30 border-t-current",
          className
        )}
        style={{ width: resolvedSize, height: resolvedSize }}
      />
    );
  }

  if (loading === "ring") {
    return (
      <motion.div
        className={cx("rounded-full border-2 border-current border-t-transparent", className)}
        style={{ width: resolvedSize, height: resolvedSize }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />
    );
  }

  if (loading === "dots") {
    return (
      <div className={cx("flex items-center gap-1", className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="rounded-full bg-current"
            style={{ width: resolvedSize / 3, height: resolvedSize / 3 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
          />
        ))}
      </div>
    );
  }

  if (loading === "page") {
    if (!isLoading) return <>{children}</>;
    return (
      <div className={cx("flex flex-col items-center justify-center w-full h-full text-primary", className)}>
        <img src="/next.svg" alt="logo" className="w-24 h-24 mb-4" />
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="rounded-full bg-current"
              style={{ width: resolvedSize / 2.5, height: resolvedSize / 2.5 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (loading === "pulse") {
    return (
      <motion.div
        className={cx("rounded-full bg-current", className)}
        style={{ width: resolvedSize, height: resolvedSize }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
    );
  }

  if (loading === "bars") {
    return (
      <div className={cx("flex items-end gap-1", className)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full bg-current"
            style={{ height: resolvedSize }}
            animate={{ scaleY: [1, 1.8, 1] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.1 }}
          />
        ))}
      </div>
    );
  }

  return null;
}
