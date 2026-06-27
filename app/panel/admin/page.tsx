"use client";

import { useEffect, useState } from "react";
import { AdminAccessPanel } from "@/app/panel/admin/admin-access-panel";
import { AdminThemePanel } from "@/app/panel/admin/admin-theme-panel";
import { AdminProductsPanel, type AdminCatalogSection } from "@/app/panel/admin/admin-products-panel";
import { AdminSecurityPanel } from "@/app/panel/admin/admin-security-panel";
import {
  fetchAdminAccess,
  subscribeAdminAccess,
} from "@/lib/admin-access";
import { fetchCurrentUser, subscribeAuthUser } from "@/lib/auth-client";

type AdminPanelUser = {
  username?: string | null;
  role?: string | null;
};

export default function AdminPanelPage() {
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null);
  const [authUser, setAuthUser] = useState<AdminPanelUser | null>(null);
  const [activeTab, setActiveTab] = useState<"theme" | "security" | AdminCatalogSection>("products");

  useEffect(() => {
    const syncAccessFromApi = async () => {
      const user = await fetchCurrentUser();
      const access = await fetchAdminAccess();
      setAuthUser(user);
      setHasAdminAccess(access);
    };

    void syncAccessFromApi()
      .catch((error) => {
        console.error("Admin access profile load error:", error);
        setHasAdminAccess(false);
      });

    const unsubscribeAdminAccess = subscribeAdminAccess(() => {
      void syncAccessFromApi().catch(() => setHasAdminAccess(false));
    });
    const unsubscribeAuthUser = subscribeAuthUser(() => {
      void fetchCurrentUser().then(setAuthUser);
    });

    return () => {
      unsubscribeAdminAccess();
      unsubscribeAuthUser();
    };
  }, []);

  useEffect(() => {
    if (authUser?.role !== "superadmin" && activeTab === "security") {
      setActiveTab("products");
    }
  }, [activeTab, authUser?.role]);

  const isSuperadmin = authUser?.role === "superadmin" && authUser?.username === "saeedheydari98";
  const tabs = [
    { id: "theme", label: "Theme" },
    ...(isSuperadmin ? [{ id: "security", label: "Security" }] : []),
    { id: "products", label: "Products" },
    { id: "banners", label: "Banners" },
    { id: "showcases", label: "Showcases" },
    { id: "categories", label: "Categories" },
    { id: "storefront", label: "Storefront" },
  ];

  return (
    <main className="min-h-screen bg-bg-base p-6 text-primary-text">
      {hasAdminAccess === null ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="rounded-lg border border-primary-border bg-primary-card p-6 text-sm font-semibold text-primary-text">
            Checking admin access...
          </div>
        </div>
      ) : hasAdminAccess ? (
        <div className="flex w-full flex-col gap-6">
          <section className="flex flex-col gap-4">
            <div className="text-admin-admin-admin text-2xl font-bold">Admin Control</div>
            <div className="flex flex-wrap gap-2 rounded-lg border border-primary-border bg-primary-soft p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-primary-border bg-primary text-primary-contrast"
                      : "border-primary-border bg-primary-card text-primary-text hover:bg-primary-bg"
                  }`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </section>

          {activeTab === "theme" ? <AdminThemePanel /> : null}
          {activeTab === "security" && isSuperadmin ? <AdminSecurityPanel /> : null}
          {activeTab !== "theme" && activeTab !== "security" ? (
            <AdminProductsPanel section={activeTab} />
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-[50vh] items-center justify-center">
          <AdminAccessPanel onUnlock={() => setHasAdminAccess(true)} />
        </div>
      )}
    </main>
  );
}
