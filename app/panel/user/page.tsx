"use client";

import { useEffect, useState } from "react";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { UserProfilePanel } from "./user-profile-panel";
import { UserThemePanel } from "./user-theme-panel";
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
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    const nationalId = readUserProfile()?.nationalId ?? "";
    const query = nationalId ? `?nationalId=${encodeURIComponent(nationalId)}` : "";
    void fetch(`/api/user/orders${query}`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setOrders(Array.isArray(data?.data?.orders) ? data.data.orders : []))
      .catch(() => setOrders([]));
  }, []);

  const submitRating = async (item: OrderItem) => {
    if (!item.productId) return;
    const rating = Number(ratings[item.id] ?? 5);
    const content = (comments[item.id] || "Rated after purchase.").trim();
    const res = await fetch(`/api/products/${item.productId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, content }),
    });
    const data = await res.json();
    setStatus(res.ok && data?.ok !== false ? "Rating saved." : data?.message || data?.error || "Rating failed.");
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-secondary-border bg-secondary-card p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-secondary-text">Purchases</div>
        <span className="text-sm text-secondary-text">Rate products after payment.</span>
      </div>
      {orders.length === 0 ? (
        <span className="text-sm text-secondary-text">No purchases yet.</span>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.flatMap((order) => order.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-md border border-secondary-border bg-bg-base p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" /> : <span className="text-xs text-secondary-text">No image</span>}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-bold text-primary-text">{item.title}</span>
                  <span className="text-xs text-secondary-text">
                    Quantity: {item.quantity}{item.selectedColor ? ` | Color: ${item.selectedColor}` : ""}
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {item.discountPrice || item.price || "No price"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <CustomInput
                  value={ratings[item.id] ?? "5"}
                  type="number"
                  min={1}
                  max={5}
                  aria-label="Rating"
                  onChange={(event) => setRatings((current) => ({ ...current, [item.id]: event.target.value }))}
                />
                <CustomInput
                  value={comments[item.id] ?? ""}
                  placeholder="Comment"
                  aria-label="Comment"
                  onChange={(event) => setComments((current) => ({ ...current, [item.id]: event.target.value }))}
                />
                <CustomButton size="sm" variant="secondary" border="base" onClick={() => void submitRating(item)}>
                  Rate
                </CustomButton>
              </div>
            </div>
          )))}
        </div>
      )}
      {status ? <div className="rounded-md border border-secondary-border bg-secondary-card px-3 py-2 text-sm font-semibold text-secondary-text">{status}</div> : null}
    </section>
  );
}

export default function UserPanelPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "theme" | "orders">("profile");

  return (
    <main className="min-h-screen bg-bg-base p-6 text-primary-text">
      <div className="flex flex-col gap-4">
        <div className="text-2xl text-user-user-user font-bold">User Control</div>
        <div className="flex flex-wrap gap-2 rounded-lg border border-secondary-border bg-secondary-card p-2">
          {[
            { id: "profile", label: "Profile" },
            { id: "orders", label: "Purchases" },
            { id: "theme", label: "Theme" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-secondary-border bg-secondary text-secondary-contrast"
                  : "border-secondary-border bg-bg-base text-secondary-text hover:bg-secondary-card"
              }`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        {activeTab === "profile" ? <UserProfilePanel /> : null}
        {activeTab === "orders" ? <UserOrdersPanel /> : null}
        {activeTab === "theme" ? <UserThemePanel /> : null}
      </div>
    </main>
  );
}
