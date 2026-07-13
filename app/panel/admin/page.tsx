"use client";

import { useEffect, useState } from "react";
import {
  IoAlbumsOutline,
  IoColorPaletteOutline,
  IoCubeOutline,
  IoImageOutline,
  IoLayersOutline,
  IoPricetagsOutline,
  IoRibbonOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { AdminAccessPanel } from "@/app/panel/admin/admin-access-panel";
import { AdminThemePanel } from "@/app/panel/admin/admin-theme-panel";
import { AdminProductsPanel, type AdminCatalogSection } from "@/app/panel/admin/admin-products-panel";
import { AdminSecurityPanel } from "@/app/panel/admin/admin-security-panel";
import { useAppGlobal } from "@/lib/app-global-context";
import { subscribeAdminAccess } from "@/lib/admin-access";
import { fetchCurrentUser, hasAdminRole, subscribeAuthUser } from "@/lib/auth-client";

type AdminPanelUser = {
  username?: string | null;
  role?: string | null;
};

export default function AdminPanelPage() {
  const { data: globalData, refresh: refreshGlobal } = useAppGlobal();
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null);
  const [authUser, setAuthUser] = useState<AdminPanelUser | null>(null);
  const [activeTab, setActiveTab] = useState<"theme" | "security" | AdminCatalogSection>("products");

  useEffect(() => {
    if (!globalData) return;
    setAuthUser(globalData.user);
    setHasAdminAccess(hasAdminRole(globalData.user));
  }, [globalData]);

  useEffect(() => {
    const syncAccessFromApi = async (force = false) => {
      const nextGlobal = await refreshGlobal({ force });
      const user = nextGlobal.user ?? await fetchCurrentUser({ force });
      const access = hasAdminRole(user);
      setAuthUser(user);
      setHasAdminAccess(access);
    };

    if (!globalData) {
      void syncAccessFromApi()
        .catch((error) => {
          console.error("Admin access profile load error:", error);
          setHasAdminAccess((current) => current ?? false);
        });
    }

    const unsubscribeAdminAccess = subscribeAdminAccess(() => {
      void syncAccessFromApi(true).catch((error) => {
        console.error("Admin access profile refresh error:", error);
        setHasAdminAccess((current) => current ?? false);
      });
    });
    const unsubscribeAuthUser = subscribeAuthUser(() => {
      void syncAccessFromApi(true)
      .catch((error) => {
        console.error("Admin access profile refresh error:", error);
        setHasAdminAccess((current) => current ?? false);
      });
    });

    return () => {
      unsubscribeAdminAccess();
      unsubscribeAuthUser();
    };
  }, [globalData, refreshGlobal]);

  useEffect(() => {
    if (authUser?.role !== "superadmin" && activeTab === "security") {
      setActiveTab("products");
    }
  }, [activeTab, authUser?.role]);

  const isSuperadmin = authUser?.role === "superadmin" && authUser?.username === "09176991556";
  const tabs = [
    { id: "theme", label: "ظاهر", icon: <IoColorPaletteOutline /> },
    ...(isSuperadmin ? [{ id: "security", label: "امنیت", icon: <IoShieldCheckmarkOutline /> }] : []),
    { id: "products", label: "محصولات", icon: <IoCubeOutline /> },
    { id: "banners", label: "بنرها", icon: <IoImageOutline /> },
    { id: "showcases", label: "ویترین ها", icon: <IoAlbumsOutline /> },
    { id: "categories", label: "دسته بندی ها", icon: <IoPricetagsOutline /> },
    { id: "brands", label: "برندها", icon: <IoRibbonOutline /> },
    { id: "storefront", label: "چیدمان", icon: <IoLayersOutline /> },
  ];

  return (
    <main className="min-h-screen bg-primary-base p-6 text-primary-text">
      {hasAdminAccess === null ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loading loading="page" size="xl" />
        </div>
      ) : hasAdminAccess ? (
        <div className="flex w-full flex-col gap-6">
          <section className="flex flex-col gap-4">
            <div className="text-primary text-2xl font-bold">پنل مدیریت</div>
            <div className="flex w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-primary-border bg-primary-soft p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`flex h-11 shrink-0 basis-28 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition md:basis-auto ${
                    activeTab === tab.id
                      ? "border-primary-border bg-primary text-primary-contrast shadow-sm"
                      : "border-transparent bg-primary-card text-primary-text hover:border-primary-border hover:bg-primary-bg"
                  }`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  <span className="text-base" aria-hidden="true">{tab.icon}</span>
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
