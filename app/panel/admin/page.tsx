"use client";

import { useEffect, useState } from "react";
import { AdminAccessPanel } from "@/app/panel/admin/admin-access-panel";
import { AdminThemePanel } from "@/app/panel/admin/admin-theme-panel";
import { AdminProductsPanel, type AdminCatalogSection } from "@/app/panel/admin/admin-products-panel";
import { AdminSecurityPanel } from "@/app/panel/admin/admin-security-panel";
import {
  fetchAdminAccess,
  isAdminAccessUnlocked,
  subscribeAdminAccess,
} from "@/lib/admin-access";

export default function AdminPanelPage() {
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"theme" | "security" | AdminCatalogSection>("products");

  useEffect(() => {
    const syncAccess = () => setHasAdminAccess(isAdminAccessUnlocked());
    const syncAccessFromApi = async () => {
      setHasAdminAccess(await fetchAdminAccess());
    };

    syncAccess();
    void syncAccessFromApi()
      .catch((error) => {
        console.error("Admin access profile load error:", error);
      });

    return subscribeAdminAccess(syncAccess);
  }, []);

  return (
    <main className="min-h-screen bg-bg-base p-6 text-primary-text">
      {hasAdminAccess ? (
        <div className="flex w-full flex-col gap-6">
          <section className="flex flex-col gap-4">
            <div className="text-admin-admin-admin text-2xl font-bold">Admin Control</div>
            <div className="flex flex-wrap gap-2 rounded-lg border border-primary-border bg-primary-soft p-2">
              {[
                { id: "theme", label: "Theme" },
                { id: "security", label: "Security" },
                { id: "products", label: "Products" },
                { id: "banners", label: "Banners" },
                { id: "showcases", label: "Showcases" },
                { id: "categories", label: "Categories" },
                { id: "storefront", label: "Storefront" },
              ].map((tab) => (
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
          {activeTab === "security" ? <AdminSecurityPanel /> : null}
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
