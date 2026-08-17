"use client";

import { useEffect, useState } from "react";
import { IoPersonCircleOutline, IoReceiptOutline } from "react-icons/io5";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { ImagePreview } from "@/app/design-system/components/ui/image-preview";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { OrderStatusTag, OrderStatusTimeline } from "@/app/design-system/components/ui/order-status";
import { CustomTabs, type CustomTabItem } from "@/app/design-system/components/ui/tabs";
import { AUTH_USER_UPDATED_EVENT } from "@/lib/auth-client";
import { formatPersianDate } from "@/lib/date-format";
import type { OrderStatusEventRecord } from "@/lib/order-status";
import { formatPlainPrice } from "@/lib/price-format";
import { UserProfilePanel } from "./user-profile-panel";

type OrderItem = {
  id: string;
  productId?: number | null;
  title: string;
  price?: string | null;
  discountPrice?: string | null;
  selectedColor?: string | null;
  imageUrl?: string | null;
  quantity: number;
};

type UserOrder = {
  id: string;
  createdAt: string;
  fulfillmentStatus?: string | null;
  trackingCode?: string | null;
  shippedAt?: string | null;
  statusHistory?: OrderStatusEventRecord[];
  items: OrderItem[];
};

let cachedUserOrders: UserOrder[] | null = null;
let pendingUserOrders: Promise<UserOrder[]> | null = null;
let userOrdersCacheVersion = 0;

function readOrders(data: unknown) {
  const orders = (data as { data?: { orders?: unknown } } | null)?.data?.orders;
  return Array.isArray(orders) ? orders as UserOrder[] : [];
}

function clearUserOrdersCache() {
  cachedUserOrders = null;
  pendingUserOrders = null;
  userOrdersCacheVersion += 1;
}

function fetchUserOrdersOnce() {
  if (cachedUserOrders !== null) return Promise.resolve(cachedUserOrders);
  if (pendingUserOrders) return pendingUserOrders;

  const cacheVersion = userOrdersCacheVersion;
  pendingUserOrders = fetch("/api/user/orders", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const orders = readOrders(data);
      if (cacheVersion === userOrdersCacheVersion) {
        cachedUserOrders = orders;
      }
      return orders;
    })
    .finally(() => {
      if (cacheVersion === userOrdersCacheVersion) {
        pendingUserOrders = null;
      }
    });

  return pendingUserOrders;
}

function UserOrdersPanel() {
  const [orders, setOrders] = useState<UserOrder[]>(() => cachedUserOrders ?? []);
  const [previewImage, setPreviewImage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    let requestId = 0;
    const loadOrders = () => {
      const nextRequestId = requestId + 1;
      requestId = nextRequestId;
      void fetchUserOrdersOnce()
        .then((nextOrders) => {
          if (!cancelled && nextRequestId === requestId) setOrders(nextOrders);
        })
        .catch(() => {
          if (!cancelled && nextRequestId === requestId) setOrders([]);
        });
    };
    const reloadOrders = () => {
      clearUserOrdersCache();
      loadOrders();
    };

    clearUserOrdersCache();
    loadOrders();
    window.addEventListener(AUTH_USER_UPDATED_EVENT, reloadOrders);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, reloadOrders);
    };
  }, []);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-primary-text">خریدها</div>
        <span className="text-sm text-primary-text">
          برای ثبت دیدگاه و امتیاز، وارد صفحه محصول شوید.
        </span>
      </div>
      {orders.length === 0 ? (
        <CustomEmptyState description="هنوز خریدی ثبت نشده است." size="sm" />
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              role="button"
              tabIndex={0}
              className="flex w-full max-w-md cursor-pointer flex-col gap-3 rounded-md border border-primary-border bg-primary-base p-3 text-right transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary-border"
              onClick={() => setSelectedOrder(order)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedOrder(order);
                }
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-primary-text">سفارش {order.id.slice(-8)}</span>
                  <span className="text-xs text-secondary-text">{formatPersianDate(order.createdAt)}</span>
                </div>
                <OrderStatusTag status={order.fulfillmentStatus} />
              </div>

              <div className="flex flex-col gap-2 border-t border-primary-border pt-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (item.imageUrl) setPreviewImage(item.imageUrl);
                      }}
                      disabled={!item.imageUrl}
                      aria-label="باز کردن تصویر محصول"
                    >
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" /> : <span className="text-[10px] text-secondary-text">بدون تصویر</span>}
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-bold text-primary-text">{item.title}</span>
                      <span className="text-xs text-secondary-text">تعداد: {item.quantity}{item.selectedColor ? ` | رنگ: ${item.selectedColor}` : ""}</span>
                      <span className="text-xs font-semibold text-primary">{formatPlainPrice(item.discountPrice || item.price)}</span>
                    </div>
                    {item.productId ? (
                      <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                        <ProductLink productId={item.productId} productTitle={item.title} size="sm">مشاهده</ProductLink>
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary-border pt-2">
                <span className="text-xs font-bold text-primary">مشاهده مسیر سفارش</span>
                {order.trackingCode ? <span className="text-xs font-bold text-primary-text">کد پیگیری: {order.trackingCode}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
      <CustomModal open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title="مسیر سفارش" variant="neutral">
        {selectedOrder ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <OrderStatusTag status={selectedOrder.fulfillmentStatus} />
              <span className="text-xs text-secondary-text">ثبت سفارش: {formatPersianDate(selectedOrder.createdAt)}</span>
            </div>
            <OrderStatusTimeline status={selectedOrder.fulfillmentStatus} history={selectedOrder.statusHistory} createdAt={selectedOrder.createdAt} />
            {selectedOrder.trackingCode ? <span className="rounded-md border border-primary-border bg-primary-base p-3 text-sm font-bold text-primary-text">کد پیگیری: {selectedOrder.trackingCode}</span> : null}
          </div>
        ) : null}
      </CustomModal>
      <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />
    </section>
  );
}

export default function UserPanelPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");
  const tabs: Array<CustomTabItem<typeof activeTab>> = [
    { id: "profile", label: "پروفایل", icon: <IoPersonCircleOutline /> },
    { id: "orders", label: "خریدها", icon: <IoReceiptOutline /> },
  ];

  return (
    <main className="min-h-full bg-primary-base p-6 text-primary-text">
      <div className="flex flex-col gap-4">
        <div className="text-2xl text-primary-text font-bold">حساب کاربری</div>
        <CustomTabs items={tabs} value={activeTab} onChange={setActiveTab} />
        {activeTab === "profile" ? <UserProfilePanel /> : null}
        {activeTab === "orders" ? <UserOrdersPanel /> : null}
      </div>
    </main>
  );
}
