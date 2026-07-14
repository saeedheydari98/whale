"use client";

import React from "react";
import { motion } from "motion/react";
import { GiSpermWhale } from "react-icons/gi";
import { IoBagAddOutline, IoBagHandleOutline } from "react-icons/io5";
import { cx, radiusVariants, sizeVariants } from "../../variants/shared.variant";

export type LoadingVariant =
  | "spinner"
  | "ring"
  | "dots"
  | "pulse"
  | "bars"
  | "page"
  | "fullscreen"
  | "product-detail"
  | "skeleton"
  | "skeleton-block"
  | "skeleton-card"
  | "skeleton-item";

type LoadingSize = keyof typeof sizeVariants;

type LoadingProductPlaceholder = {
  title?: string | null;
  description?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  discountPercent?: number | string | null;
  badge?: string | null;
};

interface LoadingProps {
  loading?: LoadingVariant;
  size?: LoadingSize;
  className?: string;
  children?: React.ReactNode;
  /** When false, skeleton variants render children normally. Defaults to true. */
  isLoading?: boolean;
  product?: LoadingProductPlaceholder | null;
}

const defaultProductPlaceholder: LoadingProductPlaceholder = {
  title: "عنوان محصول",
  description: "توضیح کوتاه محصول برای پیش نمایش",
  price: "۰ تومان",
  originalPrice: "۰ تومان",
  discountPercent: 10,
  badge: "ویژه",
};

export default function Loading({
  loading = "spinner",
  size = "md",
  className,
  children,
  isLoading = true,
  product,
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

  if (
    loading === "skeleton" ||
    loading === "skeleton-block" ||
    loading === "skeleton-card" ||
    loading === "skeleton-item"
  ) {
    if (!isLoading) return <>{children}</>;
    const tone = loading === "skeleton-item" ? "item" : "card";
    const backgroundColor = tone === "card"
      ? "color-mix(in srgb, var(--primary-card) 70%, var(--bg-surface))"
      : "color-mix(in srgb, var(--primary-media) 52%, var(--bg-surface))";
    const shimmerColor = tone === "card"
      ? "color-mix(in srgb, var(--primary-soft) 70%, var(--bg-base))"
      : "color-mix(in srgb, var(--primary-card) 72%, var(--bg-base))";
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className={cx(
          "pointer-events-none relative overflow-hidden",
          tone === "item" ? "inline-flex min-w-0 max-w-full self-start align-middle" : "",
          tone === "card" ? "block h-full w-full shadow-sm" : "",
          radiusVariants.lg,
          className
        )}
        style={{ backgroundColor }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: tone === "card" ? 3.2 : 2.6, ease: "linear" }}
        />
        <div className="invisible h-full w-full min-w-0" aria-hidden="true">
          {children}
        </div>
      </div>
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
      <div className={cx("flex h-full w-full flex-col items-center justify-center", className)}>
        <GiSpermWhale
          aria-label="وال"
          className="mb-4 h-24 w-24"
          style={{ color: "color-mix(in srgb, var(--primary) 78%, var(--primary-text))" }}
        />
        <div className="flex items-center gap-2">
          {[
            "color-mix(in srgb, var(--primary) 88%, var(--bg-base))",
            "color-mix(in srgb, var(--primary) 68%, var(--bg-base))",
            "color-mix(in srgb, var(--primary) 48%, var(--bg-base))",
          ].map((color, i) => (
            <motion.div
              key={color}
              className="rounded-full"
              style={{ width: resolvedSize / 2.5, height: resolvedSize / 2.5, backgroundColor: color }}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (loading === "fullscreen") {
    if (!isLoading) return <>{children}</>;
    return (
      <div
        className={cx("fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm", className)}
        style={{
          backgroundColor: "color-mix(in srgb, var(--primary-base) 88%, var(--bg-base))",
        }}
      >
        <div className="flex w-full max-w-xs flex-col items-center justify-center gap-4 px-6">
          <Loading loading="page" size={size} isLoading />
        </div>
      </div>
    );
  }

  if (loading === "product-detail") {
    if (!isLoading) return <>{children}</>;
    const loadingProduct = { ...defaultProductPlaceholder, ...(product ?? {}) };
    const loadingDescription = loadingProduct.description || defaultProductPlaceholder.description;
    const loadingOriginalPrice = loadingProduct.originalPrice || loadingProduct.price || defaultProductPlaceholder.originalPrice;
    const loadingDiscount = loadingProduct.discountPercent || defaultProductPlaceholder.discountPercent;

    return (
      <main className={cx("min-h-screen bg-primary-base text-primary-text", className)}>
        <div className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
          <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
            <section className="flex w-full flex-col gap-6 rounded-2xl border border-primary-border bg-primary-soft p-6 shadow-sm lg:w-[42rem] lg:max-w-[42rem] lg:shrink-0">
              <div className="flex w-full flex-col gap-4">
                <Loading loading="skeleton-item" isLoading className="flex aspect-square w-full">
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-primary-border bg-primary-media">
                    <IoBagHandleOutline className="text-6xl text-primary" aria-hidden="true" />
                  </div>
                </Loading>
              </div>

              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="rounded-full border border-primary-border bg-primary-card px-3 py-1 text-xs font-semibold">
                      <span>{loadingProduct.badge || defaultProductPlaceholder.badge}</span>
                    </div>
                  </Loading>

                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-3xl font-bold leading-tight text-primary-text">
                      {loadingProduct.title || defaultProductPlaceholder.title}
                    </div>
                  </Loading>

                  <div className="flex flex-wrap items-center gap-3">
                    <Loading loading="skeleton-item" isLoading>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2, 3, 4].map((item) => (
                          <span key={item} className="h-4 w-4 rounded-full bg-primary" />
                        ))}
                      </div>
                    </Loading>
                    <Loading loading="skeleton-item" isLoading>
                      <span className="text-sm font-semibold text-primary-text">۴.۸</span>
                    </Loading>
                    <Loading loading="skeleton-item" isLoading>
                      <span className="text-sm text-secondary-text">۱۲۸ دیدگاه</span>
                    </Loading>
                  </div>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-primary-border bg-primary-card p-4">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-sm text-danger-text-nomode line-through">
                      {loadingOriginalPrice}
                    </div>
                  </Loading>
                  <div className="flex flex-wrap items-center gap-3">
                    <Loading loading="skeleton-item" isLoading>
                      <div className="text-3xl font-bold text-primary">{loadingProduct.price}</div>
                    </Loading>
                    <Loading loading="skeleton-item" isLoading>
                      <div className="rounded-full border border-primary-border bg-primary-card px-3 py-1 text-xs font-semibold">
                        <span>{loadingDiscount}٪ تخفیف</span>
                      </div>
                    </Loading>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary-border bg-primary px-4 text-sm font-medium text-primary-contrast">
                      <IoBagAddOutline aria-hidden="true" />
                      <span>افزودن</span>
                    </div>
                  </Loading>
                </div>
              </div>
            </section>

            <section className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex flex-wrap gap-2 border-b border-primary-border">
                {["مشخصات محصول", "دیدگاه و امتیاز", "تغییرات قیمت"].map((item) => (
                  <Loading key={item} loading="skeleton-item" isLoading>
                    <div className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold">
                      <span>{item}</span>
                    </div>
                  </Loading>
                ))}
              </div>

              <section className="flex flex-col gap-6 rounded-2xl border border-primary-border bg-primary-soft p-6">
                <Loading loading="skeleton-item" isLoading>
                  <div className="text-2xl font-bold text-primary-text">مشخصات محصول</div>
                </Loading>

                <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-card p-4">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-sm font-bold text-primary-text">توضیحات محصول</div>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading className="w-full">
                    <div className="min-h-20 w-full text-sm leading-7 text-secondary-text">
                      {loadingDescription}
                    </div>
                  </Loading>
                </div>

                <div className="flex flex-wrap gap-3">
                  {["برند", "فروشنده", "SKU", "موجودی", "وزن", "سال تولید"].map((item) => (
                    <Loading key={item} loading="skeleton-item" isLoading>
                      <div className="flex min-w-52 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
                        <span className="text-xs font-semibold text-secondary-text">{item}</span>
                        <span className="text-sm font-bold text-primary-text">مقدار</span>
                      </div>
                    </Loading>
                  ))}
                </div>

                <div className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-3">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-sm font-bold text-primary-text">موجودی رنگ ها</div>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading>
                    <span className="text-sm font-semibold text-secondary-text">موجودی کل: ۰۰۰</span>
                  </Loading>
                </div>
              </section>
            </section>
          </div>
        </div>
      </main>
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
