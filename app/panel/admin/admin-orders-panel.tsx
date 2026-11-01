"use client";

import { useEffect, useMemo, useState } from "react";
import { IoAddOutline, IoCheckmarkCircleOutline, IoReloadOutline, IoSearchOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { FloatButton } from "@/app/design-system/components/ui/float-button";
import { ImagePreview } from "@/app/design-system/components/ui/image-preview";
import { AppImage } from "@/app/design-system/components/ui/app-image";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { OrderStatusTag, OrderStatusTimeline } from "@/app/design-system/components/ui/order-status";
import { formatPersianDate } from "@/lib/date-format";
import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";
import { nextOrderStatus, normalizeOrderStatus, ORDER_STATUS_LABELS, type OrderStatusEventRecord } from "@/lib/order-status";
import { formatAmount, toLatinDigits } from "@/lib/price-format";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { AppHeading } from "@/app/design-system/components/ui/text";
import { AdminInPersonOrderForm } from "@/app/panel/admin/admin-in-person-order-form";

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
  orderType?: string | null;
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
  showMessage?: string;
  message?: string;
  error?: string;
  data?: { orders?: AdminOrder[]; order?: AdminOrder | null };
};

const ADMIN_ORDERS_URL = "/api/admin/orders";

type AdminOrderView = "online" | "in_person";
type AdminOrderSortKey = "id" | "customer" | "status" | "createdAt" | "items" | "total";
type AdminOrderSortDirection = "asc" | "desc";

const loadingOrder: AdminOrder = {
  id: "loading-order",
  orderType: "online",
  status: "pending",
  fulfillmentStatus: "pending",
  total: "0",
  createdAt: new Date(0).toISOString(),
  shippingMethod: "post",
  items: [{ id: "loading-item", title: "محصول", quantity: 1, price: "0" }],
  profile: { firstName: "نام", lastName: "کاربر", phone: "09", address: "نشانی" },
};

function isInPersonOrder(order: AdminOrder) {
  return order.orderType === "in_person";
}

function customerName(order: AdminOrder) {
  const profileName = `${order.profile?.firstName ?? ""} ${order.profile?.lastName ?? ""}`.trim();
  return profileName || order.user?.name || order.user?.username || "کاربر بدون نام";
}

function orderSearchText(order: AdminOrder) {
  return [
    order.id, order.fulfillmentStatus, order.trackingCode, order.total, order.createdAt,
    order.orderType === "in_person" ? "حضوری" : "آنلاین",
    order.user?.username, order.user?.email, order.user?.name,
    order.profile?.firstName, order.profile?.lastName, order.profile?.phone, order.profile?.email, order.profile?.address,
    ...order.items.flatMap((item) => [item.id, item.productId, item.title, item.selectedColor]),
  ].filter(Boolean).join(" ").toLowerCase();
}

function compareOrders(
  first: AdminOrder,
  second: AdminOrder,
  key: AdminOrderSortKey,
  direction: AdminOrderSortDirection
) {
  const factor = direction === "asc" ? 1 : -1;

  if (key === "customer") {
    return factor * customerName(first).localeCompare(customerName(second), "fa");
  }
  if (key === "status") {
    const firstStatus = ORDER_STATUS_LABELS[normalizeOrderStatus(first.fulfillmentStatus)];
    const secondStatus = ORDER_STATUS_LABELS[normalizeOrderStatus(second.fulfillmentStatus)];
    return factor * firstStatus.localeCompare(secondStatus, "fa");
  }
  if (key === "createdAt") {
    return factor * (new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
  }
  if (key === "items") {
    const firstQuantity = first.items.reduce((count, item) => count + item.quantity, 0);
    const secondQuantity = second.items.reduce((count, item) => count + item.quantity, 0);
    return factor * (firstQuantity - secondQuantity);
  }
  if (key === "total") {
    return factor * (Number(first.total) - Number(second.total));
  }
  return factor * first.id.localeCompare(second.id, "fa");
}

function OrderSortHeaderButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: AdminOrderSortDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-w-0 items-center justify-center gap-1 text-center text-[11px] font-bold transition-colors ${
        active ? "text-primary" : "text-secondary-text hover:text-primary-text"
      }`}
    >
      <span className="truncate">{label}</span>
      <span aria-hidden="true" className="shrink-0 tabular-nums">
        {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
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

type AdminOrdersPanelProps = {
  totalCount?: number;
  inPersonCount?: number;
  productsCount?: number;
  usersCount?: number;
};

export function AdminOrdersPanel({ totalCount, inPersonCount, productsCount, usersCount }: AdminOrdersPanelProps) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [createdInPersonCount, setCreatedInPersonCount] = useState(0);
  useTransientAppMessage(message);
  useTransientAppMessage(loadError);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState<AdminOrderView>("online");
  const [sortKey, setSortKey] = useState<AdminOrderSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<AdminOrderSortDirection>("desc");
  const [inPersonModalOpen, setInPersonModalOpen] = useState(false);

  const scopedOrders = useMemo(
    () => orders.filter((order) => isInPersonOrder(order) === (view === "in_person")),
    [orders, view]
  );

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const fromTime = getDateBound(dateFrom);
    const toTime = getDateBound(dateTo, true);
    return scopedOrders.filter((order) => {
      const orderTime = new Date(order.createdAt).getTime();
      if (fromTime !== null && orderTime < fromTime) return false;
      if (toTime !== null && orderTime > toTime) return false;
      return !query || orderSearchText(order).includes(query);
    });
  }, [dateFrom, dateTo, scopedOrders, searchQuery]);

  const visibleOrders = useMemo(
    () => [...filteredOrders].sort((first, second) => compareOrders(first, second, sortKey, sortDirection)),
    [filteredOrders, sortDirection, sortKey]
  );

  const toggleSort = (key: AdminOrderSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(key);
    setSortDirection(key === "customer" || key === "id" ? "asc" : "desc");
  };

  const hasFilters = Boolean(searchQuery.trim() || dateFrom || dateTo);
  const viewTotalCount = view === "in_person"
    ? inPersonCount === undefined ? undefined : inPersonCount + createdInPersonCount
    : totalCount !== undefined && inPersonCount !== undefined
      ? Math.max(0, Number(totalCount) - Number(inPersonCount))
      : totalCount;
  const scopedTotalCount = viewTotalCount ?? scopedOrders.length;
  const collectionTotalCount = hasFilters
    ? loading ? undefined : visibleOrders.length
    : viewTotalCount;

  const loadOrders = async (force = false) => {
    setLoading(true);
    setLoadError("");
    setMessage("");
    try {
      const response = await fetchJsonDeduped<AdminOrdersResponse>(ADMIN_ORDERS_URL, { force });
      if (response?.ok === false) throw new Error(response.showMessage || "دریافت سفارش‌ها انجام نشد.");
      const nextOrders = Array.isArray(response?.data?.orders) ? response.data.orders : [];
      setOrders(nextOrders);
      setTrackingDrafts(Object.fromEntries(nextOrders.map((order) => [order.id, order.trackingCode ?? ""])));
    } catch (error) {
      console.error("Admin orders load error:", error);
      setOrders([]);
      setLoadError("دریافت سفارش‌ها ممکن نشد.");
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
      if (!response.ok || data?.ok === false || !data?.data?.order) throw new Error(data?.showMessage || "ثبت وضعیت سفارش ممکن نشد.");
      const updatedOrder = data.data.order;
      invalidateFetchCache(ADMIN_ORDERS_URL);
      setOrders((current) => current.map((item) => item.id === updatedOrder.id ? updatedOrder : item));
      setSelectedOrder(updatedOrder);
      setTrackingDrafts((current) => ({ ...current, [updatedOrder.id]: updatedOrder.trackingCode ?? "" }));
      setMessage(`وضعیت سفارش به «${ORDER_STATUS_LABELS[normalizeOrderStatus(updatedOrder.fulfillmentStatus)]}» تغییر کرد.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ثبت وضعیت سفارش ممکن نشد.");
    } finally {
      setSavingId("");
    }
  };

  const handleInPersonOrderCreated = () => {
    invalidateFetchCache(ADMIN_ORDERS_URL);
    setCreatedInPersonCount((count) => count + 1);
    setInPersonModalOpen(false);
    void loadOrders(true);
    setMessage("سفارش حضوری با موفقیت ثبت شد.");
  };

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain border-b border-primary-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          { id: "online", label: "سفارش‌های آنلاین" },
          { id: "in_person", label: "سفارش‌های حضوری" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`min-w-max grow whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors hover:bg-primary-soft sm:px-4 sm:text-sm ${
              view === tab.id ? "border-primary text-primary-text" : "border-transparent text-secondary-text"
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <AppHeading level={2} className="text-base font-bold text-primary-text">
            {view === "in_person" ? "سفارش‌های حضوری" : "سفارش‌های آنلاین"}
          </AppHeading>
          <span className="text-xs font-semibold text-secondary-text">{scopedTotalCount} سفارش</span>
        </div>
        <CustomButton size="sm" variant="neutral" icon={<IoReloadOutline />} onClick={() => void loadOrders(true)} disabled={loading}><span>به‌روزرسانی</span></CustomButton>
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

      {!loading && !loadError && visibleOrders.length === 0 ? (
        <CustomEmptyState description={hasFilters ? "نتیجه‌ای با این فیلترها پیدا نشد." : view === "in_person" ? "هنوز سفارش حضوری ثبت نشده است." : "هنوز سفارشی ثبت نشده است."} />
      ) : null}

      <div className="w-full overflow-x-auto overscroll-x-contain">
        <div data-app-table data-app-table-columns="7" className="flex min-w-230 flex-col gap-1.5">
          <div data-app-table-row className="flex items-center gap-2 rounded-md border border-primary-border bg-primary-card px-2.5 py-2">
            <div className="w-40 shrink-0">
              <OrderSortHeaderButton label="شناسه سفارش" active={sortKey === "id"} direction={sortDirection} onClick={() => toggleSort("id")} />
            </div>
            <div className="w-40 shrink-0">
              <OrderSortHeaderButton label="مشتری / تماس" active={sortKey === "customer"} direction={sortDirection} onClick={() => toggleSort("customer")} />
            </div>
            <div className="w-28 shrink-0">
              <OrderSortHeaderButton label="وضعیت" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status")} />
            </div>
            <div className="w-32 shrink-0">
              <OrderSortHeaderButton label="تاریخ ثبت" active={sortKey === "createdAt"} direction={sortDirection} onClick={() => toggleSort("createdAt")} />
            </div>
            <div className="w-20 shrink-0">
              <OrderSortHeaderButton label="تعداد اقلام" active={sortKey === "items"} direction={sortDirection} onClick={() => toggleSort("items")} />
            </div>
            <div className="w-32 shrink-0">
              <OrderSortHeaderButton label="مبلغ پرداختی" active={sortKey === "total"} direction={sortDirection} onClick={() => toggleSort("total")} />
            </div>
            <div className="w-32 shrink-0">
              <span className="text-[11px] font-bold text-secondary-text">عملیات</span>
            </div>
          </div>

          <DynamicLoadingCollection
            items={visibleOrders}
            isLoading={loading}
            totalCount={collectionTotalCount}
            className="flex w-full flex-col gap-1.5"
            getKey={(order) => order.id}
            lazy
            renderItem={(order) => (
              <AdminOrderTableRow order={order} onViewDetails={setSelectedOrder} />
            )}
            renderSkeleton={() => (
              <Loading loading="skeleton-structure" isLoading>
                <AdminOrderTableRow order={loadingOrder} onViewDetails={() => undefined} isLoading />
              </Loading>
            )}
          />
        </div>
      </div>
      <CustomModal open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title="جزئیات سفارش" size="lg" closeOnBackdrop>
        {selectedOrder ? (
          <AdminOrderDetailsModalContent
            order={selectedOrder}
            trackingValue={trackingDrafts[selectedOrder.id] ?? ""}
            saving={savingId === selectedOrder.id}
            onPreview={setPreviewImage}
            onTrackingChange={(value) => setTrackingDrafts((current) => ({ ...current, [selectedOrder.id]: value }))}
            onAdvance={() => void advanceOrder(selectedOrder)}
            onClose={() => setSelectedOrder(null)}
          />
        ) : null}
      </CustomModal>
      <CustomModal open={inPersonModalOpen} onClose={() => setInPersonModalOpen(false)} title="ثبت سفارش حضوری" size="lg" closeOnBackdrop>
        {inPersonModalOpen ? (
          <AdminInPersonOrderForm
            productsCount={productsCount}
            usersCount={usersCount}
            onCreated={handleInPersonOrderCreated}
            onClose={() => setInPersonModalOpen(false)}
          />
        ) : null}
      </CustomModal>
      <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />
      {view === "in_person" ? (
        <FloatButton
          label="ثبت سفارش حضوری"
          icon={<IoAddOutline />}
          position="bottom-right"
          shadow="lg"
          onClick={() => setInPersonModalOpen(true)}
        />
      ) : null}
    </section>
  );
}

function AdminOrderTableRow({ order, onViewDetails, isLoading = false }: {
  order: AdminOrder;
  onViewDetails: (order: AdminOrder) => void;
  isLoading?: boolean;
}) {
  return (
    <div data-app-table-row className="flex min-w-230 items-center gap-2 rounded-md border border-primary-border bg-primary-card px-2.5 py-2">
      <div className="w-40 shrink-0">
        <span className="block truncate text-xs font-bold text-primary-text">{order.id}</span>
        {isInPersonOrder(order) ? <span className="text-[10px] text-primary">حضوری</span> : null}
      </div>
      <div className="flex w-40 shrink-0 flex-col gap-0.5">
        <span className="truncate text-xs font-bold text-primary-text">{customerName(order)}</span>
        <span className="truncate text-[11px] text-secondary-text">
          {order.profile?.phone || order.user?.username || "بدون شماره"}
        </span>
      </div>
      <div className="w-28 shrink-0">
        <OrderStatusTag status={order.fulfillmentStatus} />
      </div>
      <span className="w-32 shrink-0 truncate text-xs tabular-nums text-secondary-text">
        {formatPersianDate(order.createdAt)}
      </span>
      <span className="w-20 shrink-0 truncate text-xs tabular-nums text-secondary-text">
        {order.items.reduce((count, item) => count + item.quantity, 0).toLocaleString("fa-IR")}
      </span>
      <span className="w-32 shrink-0 truncate text-xs font-bold tabular-nums text-primary">
        {formatAmount(order.total)}
      </span>
      <div className="w-32 shrink-0">
        <CustomButton size="sm" variant="neutral" disabled={isLoading} onClick={() => onViewDetails(order)}>
          <span>مشاهده اطلاعات</span>
        </CustomButton>
      </div>
    </div>
  );
}

function AdminOrderDetailsModalContent({ order, trackingValue, saving, onPreview, onTrackingChange, onAdvance, onClose }: {
  order: AdminOrder;
  trackingValue: string;
  saving: boolean;
  onPreview: (imageUrl: string) => void;
  onTrackingChange: (value: string) => void;
  onAdvance: () => void;
  onClose: () => void;
}) {
  const nextStatus = nextOrderStatus(order.fulfillmentStatus);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-border pb-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-primary-text">{customerName(order)}</span>
          <span className="text-xs text-secondary-text">{order.id}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusTag status={order.fulfillmentStatus} />
          <span className="text-xs text-secondary-text">{formatPersianDate(order.createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-52 flex-1 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
          <span className="text-xs text-secondary-text">شماره تماس</span>
          <span className="text-sm font-bold text-primary-text">{order.profile?.phone || order.user?.username || "بدون شماره"}</span>
        </div>
        <div className="flex min-w-52 flex-1 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
          <span className="text-xs text-secondary-text">ایمیل</span>
          <span className="text-sm font-bold text-primary-text">{order.profile?.email || order.user?.email || "بدون ایمیل"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-3">
        <span className="text-xs font-bold text-secondary-text">نشانی</span>
        <span className="text-sm text-primary-text">{order.profile?.address || "نشانی ثبت نشده"}</span>
      </div>

      <div className="flex flex-col gap-2 border border-primary-border rounded-md p-2">
        <span className="text-xs font-bold text-secondary-text">محصولات سفارش</span>
        <div className="flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 border-b border-primary-border pb-2 last:border-b-0 last:pb-0">
              <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media" onClick={() => item.imageUrl ? onPreview(item.imageUrl) : undefined} disabled={!item.imageUrl} aria-label="باز کردن تصویر محصول">
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
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-40 flex-1 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
          <span className="text-xs text-secondary-text">نوع سفارش</span>
          <span className="text-sm font-bold text-primary-text">{isInPersonOrder(order) ? "سفارش حضوری" : "سفارش آنلاین"}</span>
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
          <span className="text-xs text-secondary-text">روش ارسال</span>
          <span className="text-sm font-bold text-primary-text">{order.shippingMethod === "post" ? "ارسال با پست" : "تحویل حضوری"}</span>
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
          <span className="text-xs text-secondary-text">مبلغ پرداختی</span>
          <span className="text-sm font-bold text-primary">{formatAmount(order.total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {order.shippingAmount ? <span className="text-xs text-secondary-text">هزینه ارسال: {formatAmount(order.shippingAmount)}</span> : null}
        {order.discountAmount ? <span className="text-xs text-secondary-text">تخفیف: {formatAmount(order.discountAmount)}</span> : null}
        {order.walletAmount ? <span className="text-xs text-secondary-text">کیف پول: {formatAmount(order.walletAmount)}</span> : null}
        {order.discountCode ? <span className="text-xs text-secondary-text">کد تخفیف: {order.discountCode}</span> : null}
      </div>

      <CustomAccordion title="مسیر وضعیت سفارش" meta={ORDER_STATUS_LABELS[normalizeOrderStatus(order.fulfillmentStatus)]} defaultOpen={false} showStatusLabel={false} className="rounded-md" contentClassName="p-2">
        <OrderStatusTimeline status={order.fulfillmentStatus} history={order.statusHistory} createdAt={order.createdAt} />
      </CustomAccordion>

      <div className="flex flex-col gap-2 border-t border-primary-border pt-2">
        <CustomInput value={trackingValue} onChange={(event) => onTrackingChange(event.target.value)} placeholder="کد پیگیری مرسوله" size="sm" disabled={saving} />
        <div className="flex flex-wrap gap-2">
          <CustomButton size="sm" variant={nextStatus === "delivered" ? "success" : nextStatus ? "primary" : "neutral"} icon={nextStatus ? <IoCheckmarkCircleOutline /> : undefined} isLoading={saving} disabled={!nextStatus} onClick={onAdvance}>
            <span>{nextStatus ? `ثبت مرحله: ${ORDER_STATUS_LABELS[nextStatus]}` : "این سفارش تحویل داده شده است."}</span>
          </CustomButton>
          <CustomButton size="sm" variant="neutral" onClick={onClose}>
            <span>بستن</span>
          </CustomButton>
        </div>
      </div>
    </div>
  );
}
