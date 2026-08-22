"use client";

import { useSyncExternalStore } from "react";
import Loading from "@/app/design-system/components/loading/loading";

const ADMIN_ORDERS_SKELETON_COUNT_KEY = "admin-orders-skeleton-count:v1";
const DEFAULT_SKELETON_COUNT = 3;
const MAX_SKELETON_COUNT = 8;

function normalizeSkeletonCount(value: unknown) {
  const count = Math.round(Number(value));
  if (!Number.isFinite(count) || count < 1) return DEFAULT_SKELETON_COUNT;
  return Math.min(count, MAX_SKELETON_COUNT);
}

function readAdminOrdersSkeletonCount() {
  if (typeof window === "undefined") return DEFAULT_SKELETON_COUNT;
  try {
    return normalizeSkeletonCount(localStorage.getItem(ADMIN_ORDERS_SKELETON_COUNT_KEY));
  } catch {
    return DEFAULT_SKELETON_COUNT;
  }
}

export function writeAdminOrdersSkeletonCount(count: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_ORDERS_SKELETON_COUNT_KEY, String(normalizeSkeletonCount(count)));
  } catch {
    // Loading hints are optional and should not affect the orders workflow.
  }
}

type AdminOrderCardsSkeletonProps = {
  count?: number;
};

function subscribeToSkeletonCount() {
  return () => undefined;
}

export function AdminOrderCardsSkeleton({ count }: AdminOrderCardsSkeletonProps) {
  const storedCount = useSyncExternalStore(
    subscribeToSkeletonCount,
    readAdminOrdersSkeletonCount,
    () => DEFAULT_SKELETON_COUNT
  );
  const resolvedCount = count ? normalizeSkeletonCount(count) : storedCount;

  return (
    <div className="flex flex-wrap items-start gap-3" aria-label="در حال بارگذاری سفارش‌ها">
      {Array.from({ length: resolvedCount }, (_, index) => (
        <div key={`admin-order-skeleton-${index + 1}`} className="flex w-full max-w-sm flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <Loading loading="skeleton-item" isLoading className="h-4 w-28"><span>نام مشتری</span></Loading>
              <Loading loading="skeleton-item" isLoading className="h-3 w-20"><span>شماره تماس</span></Loading>
            </div>
            <Loading loading="skeleton-item" isLoading className="h-7 w-24"><span>وضعیت سفارش</span></Loading>
          </div>
          <div className="flex items-center gap-2 border-t border-primary-border pt-2">
            <Loading loading="skeleton-item" isLoading className="h-10 w-10 shrink-0"><span>تصویر</span></Loading>
            <div className="flex flex-1 flex-col gap-1">
              <Loading loading="skeleton-item" isLoading className="h-4 w-32"><span>نام محصول</span></Loading>
              <Loading loading="skeleton-item" isLoading className="h-3 w-20"><span>جزئیات محصول</span></Loading>
            </div>
          </div>
          <Loading loading="skeleton-item" isLoading className="h-9 w-full"><span>مسیر وضعیت سفارش</span></Loading>
          <Loading loading="skeleton-item" isLoading className="h-9 w-full"><span>عملیات سفارش</span></Loading>
        </div>
      ))}
    </div>
  );
}

export function AdminOrdersPanelSkeleton() {
  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Loading loading="skeleton-item" isLoading className="h-5 w-24"><span>سفارش‌ها</span></Loading>
          <Loading loading="skeleton-item" isLoading className="h-3 w-16"><span>تعداد سفارش</span></Loading>
        </div>
        <Loading loading="skeleton-item" isLoading className="h-9 w-28"><span>به‌روزرسانی</span></Loading>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-primary-border pt-3">
        <Loading loading="skeleton-item" isLoading className="h-9 w-full sm:w-64"><span>جستجو</span></Loading>
        <Loading loading="skeleton-item" isLoading className="h-9 w-40"><span>از تاریخ</span></Loading>
        <Loading loading="skeleton-item" isLoading className="h-9 w-40"><span>تا تاریخ</span></Loading>
      </div>
      <AdminOrderCardsSkeleton />
    </section>
  );
}
