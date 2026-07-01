"use client";

import { useEffect, useState } from "react";
import { BiCategoryAlt } from "react-icons/bi";
import { GiSpermWhale } from "react-icons/gi";
import { MdAdminPanelSettings } from "react-icons/md";
import { IoHomeOutline, IoPersonCircleOutline, IoStorefrontOutline } from "react-icons/io5";
import { useIsMobile } from "@/hooks/useIsMobile";
import HeaderNavLink from "../ui/header-nav-link";
import {
  fetchAdminAccess,
  isAdminAccessUnlocked,
  subscribeAdminAccess,
} from "@/lib/admin-access";

const mobileNavItems = [
  { href: "/", label: "خانه", icon: <IoHomeOutline /> },
  { href: "/categories", label: "دسته بندی", icon: <BiCategoryAlt /> },
  { href: "/products", label: "ویترین", icon: <IoStorefrontOutline /> },
  { href: "/panel/admin", label: "پنل مدیریت", icon: <MdAdminPanelSettings />, adminOnly: true },
  { href: "/panel/user", label: "حساب کاربری", icon: <IoPersonCircleOutline /> },
];

export function AppFooter() {
  const isMobile = useIsMobile();
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    const syncAdminAccess = () => setHasAdminAccess(isAdminAccessUnlocked());
    const syncAdminAccessFromApi = async () => {
      setHasAdminAccess(await fetchAdminAccess());
    };

    syncAdminAccess();
    void syncAdminAccessFromApi();
    const unsubscribeAdminAccess = subscribeAdminAccess(syncAdminAccess);

    return () => {
      unsubscribeAdminAccess();
    };
  }, []);

  const visibleNavItems = mobileNavItems.filter((item) => !item.adminOnly || hasAdminAccess);

  return (
    <footer className="bg-primary-panel text-primary-text border-primary-border font-bold p-2 w-full h-12 flex justify-center items-center border-t">
      {isMobile ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around gap-1 border-t border-primary-border bg-primary-panel px-2 py-1 shadow-lg backdrop-blur">
          {visibleNavItems.map((item) => (
            <HeaderNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              className="h-11 flex-1 flex-col gap-0.5 rounded-md border-0 px-1 py-0.5 text-[10px]"
            >
              <span>{item.label}</span>
            </HeaderNavLink>
          ))}
        </nav>
      ) : (
        <div className="flex justify-center items-center gap-2 text-xl font-bold">
          <GiSpermWhale aria-hidden="true" />
          <span>وال</span>
        </div>
      )}
    </footer>
  );
}
