"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IoCheckmarkCircleOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import { FloatButton } from "@/app/design-system/components/ui/float-button";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import { useAppGlobal } from "@/lib/app-global-context";
import { AUTH_USER_UPDATED_EVENT, hasAdminRole } from "@/lib/auth-client";
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
        <span className="text-sm text-primary-text">هنوز خریدی ثبت نشده است.</span>
      ) : (
        <div className="flex flex-wrap gap-3">
          {orders.flatMap((order) =>
            order.items.map((item) => (
              <div
                key={item.id}
                className="flex w-full max-w-sm flex-col gap-3 rounded-md border border-primary-border bg-primary-base p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-primary-text">بدون تصویر</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-bold text-primary-text">{item.title}</span>
                    <span className="text-xs text-primary-text">
                      تعداد: {item.quantity}
                      {item.selectedColor ? ` | رنگ: ${item.selectedColor}` : ""}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {item.discountPrice || item.price || "بدون قیمت"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary-border pt-2">
                  <span className="flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-bold text-success-text">
                    <IoCheckmarkCircleOutline aria-hidden="true" />
                    <span>خریداری‌شده</span>
                  </span>
                  {order.trackingCode ? (
                    <span className="rounded-full border border-primary-border bg-primary-card px-3 py-1 text-xs font-bold text-primary-text">
                      کد پیگیری: {order.trackingCode}
                    </span>
                  ) : (
                    <span className="rounded-full border border-warning-border bg-warning-bg px-3 py-1 text-xs font-bold text-warning-text">
                      در انتظار تحویل به پست
                    </span>
                  )}
                  {item.productId ? (
                    <ProductLink productId={item.productId} productTitle={item.title} size="sm">
                      مشاهده
                    </ProductLink>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default function UserPanelPage() {
  const router = useRouter();
  const { data: globalData } = useAppGlobal();
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");
  const showAdminButton = hasAdminRole(globalData?.user);

  return (
    <main className="min-h-screen bg-primary-base p-6 text-primary-text">
      <div className="flex flex-col gap-4">
        <div className="text-2xl text-primary-text font-bold">حساب کاربری</div>
        <div className="flex flex-wrap gap-2 rounded-lg border border-primary-border bg-primary-card p-2">
          {[
            { id: "profile", label: "پروفایل" },
            { id: "orders", label: "خریدها" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-primary-border bg-primary text-primary-contrast"
                  : "border-primary-border bg-primary-base text-primary-text hover:bg-primary-card"
              }`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        {activeTab === "profile" ? <UserProfilePanel /> : null}
        {activeTab === "orders" ? <UserOrdersPanel /> : null}
      </div>
      {showAdminButton ? (
        <FloatButton
          label="پنل مدیریت"
          icon={<IoShieldCheckmarkOutline />}
          position="bottom-right"
          shadow="lg"
          onClick={() => router.push("/panel/admin")}
        />
      ) : null}
    </main>
  );
}
