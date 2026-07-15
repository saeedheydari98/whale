"use client";

import { useEffect, useState } from "react";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
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

function UserOrdersPanel() {
  const [orders, setOrders] = useState<UserOrder[]>([]);

  useEffect(() => {
    void fetch("/api/user/orders", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOrders(Array.isArray(data?.data?.orders) ? data.data.orders : []))
      .catch(() => setOrders([]));
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
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");

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
    </main>
  );
}
