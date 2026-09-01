"use client";

import { useEffect, useMemo, useState } from "react";
import { IoCheckmarkCircleOutline, IoReloadOutline, IoSearchOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { ImagePreview } from "@/app/design-system/components/ui/image-preview";
import { AppImage } from "@/app/design-system/components/ui/app-image";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { OrderStatusTag, OrderStatusTimeline } from "@/app/design-system/components/ui/order-status";
import { formatPersianDate } from "@/lib/date-format";
import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";
import { nextOrderStatus, normalizeOrderStatus, ORDER_STATUS_LABELS, type OrderStatusEventRecord } from "@/lib/order-status";
import { formatAmount, toLatinDigits } from "@/lib/price-format";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { AppHeading } from "@/app/design-system/components/ui/text";

type AdminOrderItem = {
  id: string;
  productId?: number | null;
  title: string;
  price?: string | null;
  discountPrice?: string | null;
  imageUrl?: string | null;
  selectedColor?: string | null;
  quantity: number;
};

type AdminOrder = {
  id: string;
  status: string;
  fulfillmentStatus: string;
  trackingCode?: string | null;
  shippedAt?: string | null;
  total: string;
  subtotal?: string;
  discountAmount?: string;
  walletAmount?: string;
  shippingAmount?: string;
  shippingMethod?: string;
  discountCode?: string | null;
  cashbackEarned?: string;
  createdAt: string;
  statusHistory?: OrderStatusEventRecord[];
  user?: { username?: string | null; email?: string | null; name?: string | null } | null;
  profile?: { firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null; address?: string | null } | null;
  items: AdminOrderItem[];
};

type AdminOrdersResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: { orders?: AdminOrder[]; order?: AdminOrder | null };
};

const ADMIN_ORDERS_URL = "/api/admin/orders";

const loadingOrder: AdminOrder = {
  id: "loading-order",
  status: "pending",
  fulfillmentStatus: "pending",
  total: "0",
  createdAt: new Date(0).toISOString(),
  shippingMethod: "post",
  items: [{ id: "loading-item", title: "محصول", quantity: 1, price: "0" }],
  profile: { firstName: "نام", lastName: "کاربر", phone: "09", address: "نشانی" },
};

function customerName(order: AdminOrder) {
  const profileName = `${order.profile?.firstName ?? ""} ${order.profile?.lastName ?? ""}`.trim();
  return profileName || order.user?.name || order.user?.username || "کاربر بدون نام";
}

function orderSearchText(order: AdminOrder) {
  return [
    order.id, order.fulfillmentStatus, order.trackingCode, order.total, order.createdAt,
    order.user?.username, order.user?.email, order.user?.name,
    order.profile?.firstName, order.profile?.lastName, order.profile?.phone, order.profile?.email, order.profile?.address,
    ...order.items.flatMap((item) => [item.id, item.productId, item.title, item.selectedColor]),
  ].filter(Boolean).join(" ").toLowerCase();
}

function jalaliToGregorian(jalaliYear: number, jalaliMonth: number, jalaliDay: number) {
  const jy = jalaliYear + 1595;
  let days = -355668 + (365 * jy) + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jalaliDay;
  days += jalaliMonth < 7 ? (jalaliMonth - 1) * 31 : ((jalaliMonth - 7) * 30) + 186;
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const monthDays = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  let day = days + 1;
  while (gm <= 12 && day > monthDays[gm]) {
    day -= monthDays[gm];
    gm += 1;
  }
  return { year: gy, month: gm, day };
}

function getDateBound(value: string, endOfDay = false) {
  if (!value) return null;
  const parts = toLatinDigits(value.trim()).replace(/[.\-\s]+/g, "/").split("/").filter(Boolean).map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!Number.isInteger(year) || year < 1200 || year > 1600 || month < 1 || month > 12 || day < 1 || day > (month <= 6 ? 31 : 30)) return null;
  const parsed = jalaliToGregorian(year, month, day);
  const date = new Date(parsed.year, parsed.month - 1, parsed.day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function AdminOrdersPanel({ totalCount }: { totalCount?: number }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [, setCapacity] = useState(0);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  useTransientAppMessage(message);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const visibleOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const fromTime = getDateBound(dateFrom);
    const toTime = getDateBound(dateTo, true);
    return orders.filter((order) => {
      const orderTime = new Date(order.createdAt).getTime();
      if (fromTime !== null && orderTime < fromTime) return false;
      if (toTime !== null && orderTime > toTime) return false;
      return !query || orderSearchText(order).includes(query);
    });
  }, [dateFrom, dateTo, orders, searchQuery]);

  const loadOrders = async (force = false) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetchJsonDeduped<AdminOrdersResponse>(ADMIN_ORDERS_URL, { force });
      if (response?.ok === false) throw new Error(response.message || response.error);
      const nextOrders = Array.isArray(response?.data?.orders) ? response.data.orders : [];
      setOrders(nextOrders);
      setTrackingDrafts(Object.fromEntries(nextOrders.map((order) => [order.id, order.trackingCode ?? ""])));
    } catch {
      setOrders([]);
      setMessage("دریافت سفارش‌ها ممکن نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const advanceOrder = async (order: AdminOrder) => {
    const nextStatus = nextOrderStatus(order.fulfillmentStatus);
    if (!nextStatus) return;
    const trackingCode = (trackingDrafts[order.id] ?? "").trim();
    if (nextStatus === "shipped" && !trackingCode) {
      setMessage("برای تغییر وضعیت به ارسال‌شده، کد پیگیری را وارد کنید.");
      return;
    }
    setSavingId(order.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus: nextStatus, trackingCode }),
      });
      const data = await response.json().catch(() => null) as AdminOrdersResponse | null;
      if (!response.ok || data?.ok === false || !data?.data?.order) throw new Error(data?.message || data?.error || "ثبت وضعیت سفارش ممکن نشد.");
      const updatedOrder = data.data.order;
      invalidateFetchCache(ADMIN_ORDERS_URL);
      setOrders((current) => current.map((item) => item.id === updatedOrder.id ? updatedOrder : item));
      setTrackingDrafts((current) => ({ ...current, [updatedOrder.id]: updatedOrder.trackingCode ?? "" }));
      setMessage(`وضعیت سفارش به «${ORDER_STATUS_LABELS[normalizeOrderStatus(updatedOrder.fulfillmentStatus)]}» تغییر کرد.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ثبت وضعیت سفارش ممکن نشد.");
    } finally {
      setSavingId("");
    }
  };

  const hasFilters = Boolean(searchQuery.trim() || dateFrom || dateTo);

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <AppHeading level={2} className="text-base font-bold text-primary-text">سفارش‌ها</AppHeading>
          <span className="text-xs font-semibold text-secondary-text">{Math.max(visibleOrders.length, Number(totalCount) || 0)} سفارش</span>
        </div>
        <CustomButton size="sm" variant="neutral" icon={<IoReloadOutline />} onClick={() => void loadOrders(true)} isLoading={loading}><span>به‌روزرسانی</span></CustomButton>
      </div>

      <div className="flex flex-col gap-3 border-t border-primary-border pt-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-end">
          <CustomInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="جستجو..." aria-label="جستجو در سفارش‌ها" showLabel={false} fullWidth={false} size="sm" rounded="full" icon={<IoSearchOutline />} className="min-w-64" />
          <div className="flex flex-wrap items-end gap-2">
            <CustomInput value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} label="از تاریخ" placeholder="۱۴۰۵/۰۱/۰۱" inputMode="numeric" fullWidth={false} size="sm" rounded="full" className="min-w-40" />
            <CustomInput value={dateTo} onChange={(event) => setDateTo(event.target.value)} label="تا تاریخ" placeholder="۱۴۰۵/۱۲/۲۹" inputMode="numeric" fullWidth={false} size="sm" rounded="full" className="min-w-40" />
            {hasFilters ? <CustomButton size="sm" variant="neutral" rounded="full" onClick={() => { setSearchQuery(""); setDateFrom(""); setDateTo(""); }}><span>پاک کردن</span></CustomButton> : null}
          </div>
        </div>
      </div>

      {!loading && visibleOrders.length === 0 ? <CustomEmptyState description={hasFilters ? "نتیجه‌ای با این فیلترها پیدا نشد." : "هنوز سفارشی ثبت نشده است."} /> : null}

      <DynamicLoadingCollection
        items={visibleOrders}
        isLoading={loading && orders.length === 0}
        totalCount={hasFilters ? visibleOrders.length : totalCount}
        onCapacityChange={hasFilters || totalCount === undefined ? undefined : setCapacity}
        className="flex flex-wrap items-start gap-3"
        getKey={(order) => order.id}
        lazy
        renderItem={(order) => (
          <AdminOrderCard
            order={order}
            trackingValue={trackingDrafts[order.id] ?? ""}
            saving={savingId === order.id}
            onPreview={setPreviewImage}
            onTrackingChange={(value) => setTrackingDrafts((current) => ({ ...current, [order.id]: value }))}
            onAdvance={() => void advanceOrder(order)}
          />
        )}
        renderSkeleton={() => (
          <Loading loading="skeleton-structure" isLoading>
            <AdminOrderCard
              order={loadingOrder}
              trackingValue=""
              saving={false}
              onPreview={() => undefined}
              onTrackingChange={() => undefined}
              onAdvance={() => undefined}
            />
          </Loading>
        )}
      />
      <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />
    </section>
  );
}

function AdminOrderCard({ order, trackingValue, saving, onPreview, onTrackingChange, onAdvance }: {
  order: AdminOrder;
  trackingValue: string;
  saving: boolean;
  onPreview: (imageUrl: string) => void;
  onTrackingChange: (value: string) => void;
  onAdvance: () => void;
}) {
  const nextStatus = nextOrderStatus(order.fulfillmentStatus);

  return (
    <div className="flex w-full max-w-sm flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-bold text-primary-text">{customerName(order)}</span>
          <span className="text-xs text-secondary-text">{order.profile?.phone || order.user?.username || "بدون شماره"}</span>
          <span className="text-xs text-secondary-text">{formatPersianDate(order.createdAt)}</span>
        </div>
        <OrderStatusTag status={order.fulfillmentStatus} />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-primary-border pt-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5">
            <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media" onClick={() => item.imageUrl ? onPreview(item.imageUrl) : undefined} disabled={!item.imageUrl} aria-label="باز کردن تصویر محصول">
              {item.imageUrl ? <AppImage src={item.imageUrl} alt={item.title} width={112} height={112} className="h-full w-full object-cover" /> : <span className="text-[10px] text-secondary-text">بدون تصویر</span>}
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-bold text-primary-text">{item.title}</span>
              <span className="text-xs text-secondary-text">تعداد: {item.quantity}{item.selectedColor ? ` | رنگ: ${item.selectedColor}` : ""}</span>
              <span className="text-xs font-bold text-primary">{formatAmount(item.discountPrice || item.price, { fallback: "بدون قیمت" })}</span>
            </div>
          </div>
        ))}
      </div>

      {order.profile?.address ? <span className="text-xs text-secondary-text">نشانی: {order.profile.address}</span> : null}
      <div className="flex flex-col gap-1 border-t border-primary-border pt-2">
        <span className="text-xs text-secondary-text">روش تحویل: {order.shippingMethod === "post" ? "ارسال با پست" : "تحویل حضوری"}</span>
        {Number(order.discountAmount) > 0 ? <span className="text-xs text-secondary-text">تخفیف: {formatAmount(order.discountAmount)}</span> : null}
        {Number(order.walletAmount) > 0 ? <span className="text-xs text-secondary-text">پرداخت از کیف پول: {formatAmount(order.walletAmount)}</span> : null}
        <span className="text-sm font-bold text-primary">مبلغ پرداختی: {formatAmount(order.total)}</span>
      </div>
      <CustomAccordion title="مسیر وضعیت سفارش" meta={ORDER_STATUS_LABELS[normalizeOrderStatus(order.fulfillmentStatus)]} defaultOpen={false} showStatusLabel={false} className="rounded-md" contentClassName="p-2">
        <OrderStatusTimeline status={order.fulfillmentStatus} history={order.statusHistory} createdAt={order.createdAt} />
      </CustomAccordion>

      <div className="flex flex-col gap-2 border-t border-primary-border pt-2">
        <CustomInput value={trackingValue} onChange={(event) => onTrackingChange(event.target.value)} placeholder="کد پیگیری مرسوله" size="sm" disabled={saving} />
        {order.trackingCode ? <span className="text-xs font-bold text-primary-text">کد پیگیری ثبت‌شده: {order.trackingCode}</span> : null}
        {nextStatus ? (
          <CustomButton size="sm" variant={nextStatus === "delivered" ? "success" : "primary"} icon={<IoCheckmarkCircleOutline />} isLoading={saving} onClick={onAdvance}>
            <span>ثبت مرحله: {ORDER_STATUS_LABELS[nextStatus]}</span>
          </CustomButton>
        ) : <span className="text-xs font-bold text-success-text">این سفارش تحویل داده شده است.</span>}
      </div>
    </div>
  );
}
