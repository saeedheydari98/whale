"use client";

import { useEffect, useMemo, useState } from "react";
import { IoCheckmarkCircleOutline, IoReloadOutline, IoSearchOutline, IoTimeOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";

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
  createdAt: string;
  user?: {
    username?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  items: AdminOrderItem[];
};

const ADMIN_ORDERS_URL = "/api/admin/orders";

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian").format(date);
}

function customerName(order: AdminOrder) {
  const profileName = `${order.profile?.firstName ?? ""} ${order.profile?.lastName ?? ""}`.trim();
  return profileName || order.user?.name || order.user?.username || "کاربر بدون نام";
}

function orderSearchText(order: AdminOrder, item: AdminOrderItem) {
  return [
    order.id,
    order.status,
    order.fulfillmentStatus,
    order.trackingCode,
    order.total,
    order.createdAt,
    order.user?.username,
    order.user?.email,
    order.user?.name,
    order.profile?.firstName,
    order.profile?.lastName,
    order.profile?.phone,
    order.profile?.email,
    order.profile?.address,
    item.id,
    item.productId,
    item.title,
    item.price,
    item.discountPrice,
    item.selectedColor,
    item.quantity,
  ].filter(Boolean).join(" ").toLowerCase();
}

const persianDigits: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function toLatinDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => persianDigits[digit] ?? digit);
}

function jalaliToGregorian(jalaliYear: number, jalaliMonth: number, jalaliDay: number) {
  let jy = jalaliYear + 1595;
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

  const gd = days + 1;
  const monthDays = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  let day = gd;
  while (gm <= 12 && day > monthDays[gm]) {
    day -= monthDays[gm];
    gm += 1;
  }

  return { year: gy, month: gm, day };
}

function parsePersianDate(value: string) {
  const normalized = toLatinDigits(value.trim()).replace(/[.\-\s]+/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length !== 3) return null;

  const [year, month, day] = parts.map((part) => Number(part));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1200 || year > 1600 || month < 1 || month > 12 || day < 1) return null;
  const maxDay = month <= 6 ? 31 : month <= 11 ? 30 : 30;
  if (day > maxDay) return null;

  return jalaliToGregorian(year, month, day);
}

function getDateBound(value: string, endOfDay = false) {
  if (!value) return null;
  const parsedDate = parsePersianDate(value);
  if (!parsedDate) return null;
  const date = new Date(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const orderCards = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const fromTime = getDateBound(dateFrom);
    const toTime = getDateBound(dateTo, true);

    return orders
      .flatMap((order) => order.items.map((item) => ({ order, item })))
      .filter(({ order, item }) => {
        const orderTime = new Date(order.createdAt).getTime();
        if (fromTime !== null && (!Number.isFinite(orderTime) || orderTime < fromTime)) return false;
        if (toTime !== null && (!Number.isFinite(orderTime) || orderTime > toTime)) return false;
        return !normalizedSearch || orderSearchText(order, item).includes(normalizedSearch);
      });
  }, [dateFrom, dateTo, orders, searchQuery]);

  const hasFilters = Boolean(searchQuery.trim() || dateFrom || dateTo);

  const loadOrders = async (options?: { force?: boolean }) => {
    setLoading(true);
    setStatus("");
    try {
      const data = await fetchJsonDeduped<any>(ADMIN_ORDERS_URL, { force: options?.force });
      if (data?.ok === false) throw new Error(data?.message || data?.error || "دریافت سفارش‌ها ممکن نشد.");
      const nextOrders = Array.isArray(data?.data?.orders) ? data.data.orders as AdminOrder[] : [];
      setOrders(nextOrders);
      setTrackingDrafts(Object.fromEntries(nextOrders.map((order) => [order.id, order.trackingCode ?? ""])));
    } catch {
      setOrders([]);
      setStatus("دریافت خریدها ممکن نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const updateOrderDelivery = async (orderId: string, fulfillmentStatus: "pending" | "posted") => {
    const trackingCode = (trackingDrafts[orderId] ?? "").trim();
    if (fulfillmentStatus === "posted" && !trackingCode) {
      setStatus("برای تحویل به پست، کد پیگیری را وارد کنید.");
      return;
    }

    setSavingId(orderId);
    setStatus("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus, trackingCode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) throw new Error(data?.message || "ثبت وضعیت سفارش ممکن نشد.");
      invalidateFetchCache(ADMIN_ORDERS_URL);
      const updatedOrder = data?.data?.order as AdminOrder | null;
      if (updatedOrder) {
        setOrders((current) => current.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
        setTrackingDrafts((current) => ({ ...current, [updatedOrder.id]: updatedOrder.trackingCode ?? "" }));
      }
      setStatus(fulfillmentStatus === "posted" ? "کد پیگیری ثبت شد." : "سفارش به وضعیت در انتظار ارسال برگشت.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ثبت وضعیت سفارش ممکن نشد.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="flex w-full max-w-none flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold text-primary-text">خریدها</div>
          <span className="text-xs font-semibold text-secondary-text">{orderCards.length} کارت خرید</span>
        </div>
        <CustomButton size="sm" variant="neutral" icon={<IoReloadOutline />} onClick={() => void loadOrders({ force: true })} isLoading={loading}>
          <span>به روزرسانی</span>
        </CustomButton>
      </div>

      <div className="flex flex-col gap-3 border-t border-primary-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-bold text-primary-text">فیلتر خریدها</div>
            <span className="text-xs font-semibold text-secondary-text">تاریخ را با تقویم فارسی و به شکل ۱۴۰۳/۰۱/۰۱ وارد کنید.</span>
          </div>
          {hasFilters ? (
            <CustomButton
              size="sm"
              variant="neutral"
              rounded="full"
              onClick={() => {
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              <span>پاک کردن</span>
            </CustomButton>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-end">
          <CustomInput
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="جستجو در خریدها"
            aria-label="جستجو در خریدها"
            showLabel={false}
            fullWidth={false}
            size="sm"
            rounded="full"
            icon={<IoSearchOutline />}
            className="min-w-64"
          />
          <div className="flex flex-wrap items-end gap-2">
            <CustomInput
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              label="از تاریخ"
              placeholder="۱۴۰۳/۰۱/۰۱"
              aria-label="از تاریخ"
              inputMode="numeric"
              fullWidth={false}
              size="sm"
              rounded="full"
              className="min-w-40"
            />
            <CustomInput
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              label="تا تاریخ"
              placeholder="۱۴۰۳/۱۲/۲۹"
              aria-label="تا تاریخ"
              inputMode="numeric"
              fullWidth={false}
              size="sm"
              rounded="full"
              className="min-w-40"
            />
          </div>
        </div>
      </div>

      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-card px-3 py-2 text-xs font-semibold text-primary-text">
          {status}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2].map((item) => (
            <Loading key={item} loading="skeleton-card" isLoading className="h-48 w-full max-w-sm">
              <div className="h-48 w-full max-w-sm rounded-lg border border-primary-border bg-primary-card" />
            </Loading>
          ))}
        </div>
      ) : null}

      {!loading && orderCards.length === 0 ? (
        <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
          {hasFilters ? "خریدی با این فیلتر پیدا نشد." : "هنوز خریدی ثبت نشده است."}
        </div>
      ) : null}

      {!loading && orderCards.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {orderCards.map(({ order, item }) => {
            const posted = order.fulfillmentStatus === "posted";
            const cardKey = `${order.id}-${item.id}`;

            return (
              <div key={cardKey} className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-secondary-text">بدون تصویر</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="line-clamp-1 text-sm font-bold text-primary-text">{item.title}</div>
                    <span className="text-xs text-secondary-text">تعداد: {item.quantity}</span>
                    {item.selectedColor ? <span className="text-xs text-secondary-text">رنگ: {item.selectedColor}</span> : null}
                    <span className="text-sm font-bold text-primary">{item.discountPrice || item.price || "بدون قیمت"}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 rounded-md border border-primary-border bg-primary-base p-2 text-xs text-primary-text">
                  <span className="font-bold">اطلاعات کاربر</span>
                  <span>{customerName(order)}</span>
                  <span>{order.profile?.phone || order.user?.username || "بدون شماره"}</span>
                  {order.profile?.address ? <span className="line-clamp-2">{order.profile.address}</span> : null}
                  <span>تاریخ خرید: {formatDate(order.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                    posted
                      ? "border-success-border bg-success-bg text-success-text"
                      : "border-warning-border bg-warning-bg text-warning-text"
                  }`}>
                    {posted ? <IoCheckmarkCircleOutline aria-hidden="true" /> : <IoTimeOutline aria-hidden="true" />}
                    <span>{posted ? "تحویل پست شده" : "در انتظار تحویل پست"}</span>
                  </span>
                </div>

                <div className="flex flex-col gap-2 border-t border-primary-border pt-3">
                  <CustomInput
                    value={trackingDrafts[order.id] ?? ""}
                    onChange={(event) => setTrackingDrafts((current) => ({ ...current, [order.id]: event.target.value }))}
                    placeholder="کد پیگیری پست"
                    aria-label="کد پیگیری پست"
                    showLabel={false}
                    size="sm"
                    rounded="md"
                  />
                  <div className="flex flex-wrap gap-2">
                    <CustomButton
                      size="sm"
                      variant="success"
                      icon={<IoCheckmarkCircleOutline />}
                      isLoading={savingId === order.id}
                      onClick={() => void updateOrderDelivery(order.id, "posted")}
                    >
                      <span>تحویل پست شد</span>
                    </CustomButton>
                    <CustomButton
                      size="sm"
                      variant="neutral"
                      disabled={savingId === order.id}
                      onClick={() => void updateOrderDelivery(order.id, "pending")}
                    >
                      <span>در انتظار ارسال</span>
                    </CustomButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
