"use client";

import { useEffect, useState } from "react";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import { UserProfilePanel } from "./user-profile-panel";
import { readUserProfile } from "@/lib/user-profile";

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

function UserOrdersPanel() {
  const [orders, setOrders] = useState<Array<{ id: string; createdAt: string; items: OrderItem[] }>>([]);

  useEffect(() => {
    const nationalId = readUserProfile()?.nationalId ?? "";
    const query = nationalId ? `?nationalId=${encodeURIComponent(nationalId)}` : "";
    void fetch(`/api/user/orders${query}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOrders(Array.isArray(data?.data?.orders) ? data.data.orders : []))
      .catch(() => setOrders([]));
  }, []);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-secondary-border bg-secondary-card p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-secondary-text">خریدها</div>
        <span className="text-sm text-secondary-text">
          برای ثبت دیدگاه و امتیاز، وارد صفحه محصول شوید.
        </span>
      </div>
      {orders.length === 0 ? (
        <span className="text-sm text-secondary-text">هنوز خریدی ثبت نشده است.</span>
      ) : (
        <div className="flex flex-wrap gap-3">
          {orders.flatMap((order) =>
            order.items.map((item) => (
              <div
                key={item.id}
                className="flex w-full max-w-sm flex-col gap-3 rounded-md border border-secondary-border bg-primary-base p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-secondary-text">بدون تصویر</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-bold text-primary-text">{item.title}</span>
                    <span className="text-xs text-secondary-text">
                      تعداد: {item.quantity}
                      {item.selectedColor ? ` | رنگ: ${item.selectedColor}` : ""}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {item.discountPrice || item.price || "بدون قیمت"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-secondary-border pt-2">
                  <span className="flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-bold text-success-text">
                    <IoCheckmarkCircleOutline aria-hidden="true" />
                    <span>خریداری‌شده</span>
                  </span>
                  {item.productId ? (
                    <ProductLink productId={item.productId} productTitle={item.title} size="sm">
                      مشاهده محصول
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
        <div className="text-2xl text-secondary-text font-bold">حساب کاربری</div>
        <div className="flex flex-wrap gap-2 rounded-lg border border-secondary-border bg-secondary-card p-2">
          {[
            { id: "profile", label: "پروفایل" },
            { id: "orders", label: "خریدها" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-secondary-border bg-secondary text-secondary-contrast"
                  : "border-secondary-border bg-primary-base text-secondary-text hover:bg-secondary-card"
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
