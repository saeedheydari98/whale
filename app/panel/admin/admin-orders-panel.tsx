"use client";

import { useAdminPagedCollection } from "@/hooks/use-admin-paged-collection";

import { CustomActionButton } from "@/app/design-system/components/ui/action";

import { CustomTable, CustomTableRow, CustomSortHeader as OrderSortHeaderButton } from "@/app/design-system/components/ui/table";

import { CustomTabs } from "@/app/design-system/components/ui/tabs";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IoAddOutline, IoCheckmarkCircleOutline, IoSearchOutline } from "react-icons/io5";
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
import { invalidateFetchCache } from "@/lib/fetch-json";
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
  const queryClient = useQueryClient();
  const [tableOpen, setTableOpen] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState<Record<string, AdminOrder>>({});
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [createdInPersonCount, setCreatedInPersonCount] = useState(0);
  useTransientAppMessage(message);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState<AdminOrderView>("online");
  const [sortKey, setSortKey] = useState<AdminOrderSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<AdminOrderSortDirection>("desc");
  const [inPersonModalOpen, setInPersonModalOpen] = useState(false);

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
  const params = new URLSearchParams({ view, q: searchQuery.trim(), sort: sortKey, direction: sortDirection });
  const from = getDateBound(dateFrom);
  const to = getDateBound(dateTo, true);
  if (from !== null) params.set("from", String(from));
  if (to !== null) params.set("to", String(to));
  const page = useAdminPagedCollection<AdminOrder>({ endpoint: ADMIN_ORDERS_URL, itemKey: "orders", params: params.toString(), totalCount: hasFilters ? undefined : viewTotalCount, structureEndpoint: "/api/admin/collections/structure?collection=orders", enabled: tableOpen });
  const { loading, error: loadError } = page;
  useTransientAppMessage(loadError);
  const visibleOrders = page.items.map((order) => orderUpdates[order.id] ?? order);
  const scopedTotalCount = page.total ?? viewTotalCount ?? 0;
  useEffect(() => {
    setTrackingDrafts((current) => ({ ...Object.fromEntries(page.items.map((order) => [order.id, order.trackingCode ?? ""])), ...current }));
  }, [page.items]);

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
      setOrderUpdates((current) => ({ ...current, [updatedOrder.id]: updatedOrder }));
      void queryClient.invalidateQueries({ queryKey: ["admin-list", ADMIN_ORDERS_URL] });
      setSelectedOrder(updatedOrder);
      setTrackingDrafts((current) => ({ ...current, [updatedOrder.id]: updatedOrder.trackingCode ?? "" }));
      setMessage(`وضعیت سفارش به «${ORDER_STATUS_LABELS[normalizeOrderStatus(updatedOrder.fulfillmentStatus)]}» تغییر کرد.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ثبت وضعیت سفارش ممکن نشد.");
    } finally {
      setSavingId("");
    }
  };

  const openInPersonOrder = () => {
    setInPersonModalOpen(true);
  };

  const handleInPersonOrderCreated = () => {
    invalidateFetchCache(ADMIN_ORDERS_URL);
    setCreatedInPersonCount((count) => count + 1);
    setInPersonModalOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["admin-list", ADMIN_ORDERS_URL] });
    setMessage("سفارش حضوری با موفقیت ثبت شد.");
  };

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <CustomTabs items={([
          { id: "online", label: "سفارش‌های آنلاین" },
          { id: "in_person", label: "سفارش‌های حضوری" },
        ] as const)} value={view} onChange={(next) => { setView(next); setTableOpen(false); }} variant="secondary" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <AppHeading level={2} className="text-base font-bold text-primary-text">
            {view === "in_person" ? "سفارش‌های حضوری" : "سفارش‌های آنلاین"}
          </AppHeading>
          <span className="text-xs font-semibold text-secondary-text">{scopedTotalCount} سفارش</span>
        </div>
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

      <CustomAccordion title="فهرست سفارش‌ها" open={tableOpen} onOpenChange={setTableOpen} showStatusLabel={false}>
      {!loading && !loadError && visibleOrders.length === 0 ? (
        <CustomEmptyState description={hasFilters ? "نتیجه‌ای با این فیلترها پیدا نشد." : view === "in_person" ? "هنوز سفارش حضوری ثبت نشده است." : "هنوز سفارشی ثبت نشده است."} />
      ) : null}

      <CustomTable>

        <CustomTableRow>
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
        </CustomTableRow>

        <DynamicLoadingCollection
          items={visibleOrders}
          isLoading={loading}
          {...page.collectionProps}
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

      </CustomTable>
      </CustomAccordion>
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
          onClick={() => void openInPersonOrder()}
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
    <CustomTableRow>
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
    </CustomTableRow>
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
              <CustomActionButton type="button" className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media" onClick={() => item.imageUrl ? onPreview(item.imageUrl) : undefined} disabled={!item.imageUrl} aria-label="باز کردن تصویر محصول">
                {item.imageUrl ? <AppImage src={item.imageUrl} alt={item.title} width={112} height={112} className="h-full w-full object-cover" /> : <span className="text-[10px] text-secondary-text">بدون تصویر</span>}
              </CustomActionButton>
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
