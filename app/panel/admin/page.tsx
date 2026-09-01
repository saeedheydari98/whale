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
  IoReceiptOutline,
  IoPeopleOutline,
  IoTicketOutline,
} from "react-icons/io5";
import Loading, { useStructureRouteLoading } from "@/app/design-system/components/loading/loading";
import { CustomTabs, type CustomTabItem } from "@/app/design-system/components/ui/tabs";
import { AdminAccessPanel } from "@/app/panel/admin/admin-access-panel";
import { AdminThemePanel } from "@/app/panel/admin/admin-theme-panel";
import { AdminProductsPanel, type AdminCatalogSection } from "@/app/panel/admin/admin-products-panel";
import { AdminSecurityPanel } from "@/app/panel/admin/admin-security-panel";
import { AdminUsersPanel } from "@/app/panel/admin/admin-users-panel";
import { AdminDiscountsPanel } from "@/app/panel/admin/admin-discounts-panel";
import { AdminOrdersPanel } from "@/app/panel/admin/admin-orders-panel";
import { getAdminPanelStructure, type AdminPanelStructure } from "@/lib/admin-structure";
import { useAppUser } from "@/lib/app-user-context";
import { subscribeAdminAccess } from "@/lib/admin-access";
import { fetchCurrentUser, hasAdminRole, subscribeAuthUser } from "@/lib/auth-client";
import { SUPERADMIN_PHONE } from "@/lib/auth-constants";

type AdminPanelUser = {
  username?: string | null;
  role?: string | null;
};

type AdminPanelTab = "theme" | "security" | "orders" | "users" | "discounts" | AdminCatalogSection;

export default function AdminPanelPage() {
  const { data: appUserData, refresh: refreshAppUser } = useAppUser();
  const appUser = appUserData?.user ?? null;
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(() =>
    appUserData ? hasAdminRole(appUserData.user) : null
  );
  const [authUser, setAuthUser] = useState<AdminPanelUser | null>(() => appUser);
  const [activeTab, setActiveTab] = useState<AdminPanelTab>("theme");
  const [structure, setStructure] = useState<AdminPanelStructure | null>(null);
  const [structureReady, setStructureReady] = useState(false);

  useEffect(() => {
    if (hasAdminAccess !== true) return;
    let cancelled = false;
    void getAdminPanelStructure()
      .then((next) => {
        if (cancelled) return;
        setStructure(next);
        setStructureReady(true);
      })
      .catch(() => {
        if (!cancelled) setStructureReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasAdminAccess]);

  useStructureRouteLoading(hasAdminAccess === null || (hasAdminAccess === true && !structureReady));

  useEffect(() => {
    if (!appUserData) return;
    setAuthUser(appUserData.user);
    setHasAdminAccess(hasAdminRole(appUserData.user));
  }, [appUserData]);

  useEffect(() => {
    let cancelled = false;

    const syncAccessFromApi = async () => {
      setHasAdminAccess(null);
      await refreshAppUser({ force: true });
      const user = await fetchCurrentUser({ force: true, allowStaleOnError: false });
      if (cancelled) return;
      const access = hasAdminRole(user);
      setAuthUser(user);
      setHasAdminAccess(access);
    };

    const unsubscribeAdminAccess = subscribeAdminAccess(() => {
      void syncAccessFromApi().catch((error) => {
        if (cancelled) return;
        console.error("Admin access profile refresh error:", error);
        setAuthUser(null);
        setHasAdminAccess(false);
      });
    });
    const unsubscribeAuthUser = subscribeAuthUser(() => {
      void syncAccessFromApi()
      .catch((error) => {
        if (cancelled) return;
        console.error("Admin access profile refresh error:", error);
        setAuthUser(null);
        setHasAdminAccess(false);
      });
    });

    return () => {
      cancelled = true;
      unsubscribeAdminAccess();
      unsubscribeAuthUser();
    };
  }, [refreshAppUser]);

  useEffect(() => {
    if (authUser?.role !== "superadmin" && activeTab === "security") {
      setActiveTab("products");
    }
  }, [activeTab, authUser?.role]);

  const isSuperadmin = authUser?.role === "superadmin" && authUser?.username === SUPERADMIN_PHONE;
  const tabs: Array<CustomTabItem<AdminPanelTab>> = [
    { id: "theme", label: "ظاهر", icon: <IoColorPaletteOutline /> },
    ...(isSuperadmin ? [{ id: "security" as const, label: "دسترسی‌ها", icon: <IoShieldCheckmarkOutline /> }] : []),
    { id: "products", label: "محصولات", icon: <IoCubeOutline /> },
    { id: "orders", label: "سفارش ها", icon: <IoReceiptOutline /> },
    { id: "users", label: "کاربران", icon: <IoPeopleOutline /> },
    { id: "discounts", label: "تخفیف‌ها", icon: <IoTicketOutline /> },
    { id: "banners", label: "بنرها", icon: <IoImageOutline /> },
    { id: "showcases", label: "ویترین‌ها", icon: <IoAlbumsOutline /> },
    { id: "categories", label: "دسته‌بندی‌ها", icon: <IoPricetagsOutline /> },
    { id: "brands", label: "برندها", icon: <IoRibbonOutline /> },
    { id: "storefront", label: "چیدمان", icon: <IoLayersOutline /> },
  ];

  return (
    <main className="min-h-full bg-primary-base p-6 text-primary-text">
      {hasAdminAccess === null ? (
        <Loading loading="skeleton-structure" isLoading>
          <div className="flex w-full flex-col gap-6">
            <section className="flex flex-col gap-4">
              <div className="text-primary text-2xl font-bold">پنل مدیریت</div>
              <CustomTabs items={tabs} value={activeTab} onChange={setActiveTab} />
            </section>
          </div>
        </Loading>
      ) : hasAdminAccess ? (
        <div className="flex w-full flex-col gap-6">
          <section className="flex flex-col gap-4">
            <div className="text-primary text-2xl font-bold">پنل مدیریت</div>
            <CustomTabs items={tabs} value={activeTab} onChange={setActiveTab} />
          </section>

          {activeTab === "theme" ? <AdminThemePanel /> : null}
          {activeTab === "security" && isSuperadmin ? <AdminSecurityPanel /> : null}
          {activeTab === "orders" ? <AdminOrdersPanel totalCount={structure?.orders} /> : null}
          {activeTab === "users" ? <AdminUsersPanel totalCount={structure?.users} /> : null}
          {activeTab === "discounts" ? <AdminDiscountsPanel /> : null}
          {activeTab !== "theme" && activeTab !== "security" && activeTab !== "orders" && activeTab !== "users" && activeTab !== "discounts" ? (
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
