"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IoClose, IoMenu } from "react-icons/io5";
import { useRouter } from "next/navigation";
import Toggle from "../shared/toggle";
import GlobalSearch from "../ui/global-search";
import { useTheme } from "../../theme/provider";
import { useScrollHeaderHide } from "@/hooks/useScrollHeaderHide";
import { useIsMobile } from "@/hooks/useIsMobile";
import { RiShoppingCartFill } from "react-icons/ri";
import {
  ADMIN_ACCESS_UPDATED_EVENT,
  isAdminAccessUnlocked,
} from "@/lib/admin-access";

const navItems = [
  { href: "/", label: "home", tone: "bg-primary text-primary-text" },
  { href: "/products", label: "products", tone: "bg-primary text-primary-text" },
  { href: "/date.converter", label: "date converter", tone: "bg-primary text-primary-text" },
  { href: "/panel/admin", label: "admin panel", tone: "bg-primary text-primary-text", adminOnly: true },
  { href: "/panel/user", label: "user panel", tone: "bg-primary text-primary-text" },
];

const CART_STORAGE_KEY = "product-cart";
const CART_UPDATED_EVENT = "product-cart-updated";

function readCartCount() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return 0;

    return parsed.reduce((sum, item) => {
      const quantity = Number(item?.quantity);
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
  } catch {
    return 0;
  }
}

function CartLink({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <Link
      href="/cart"
      onClick={onClick}
      className="relative inline-flex items-center justify-center p-1 text-secondary-border-nomode transition-all hover:scale-110"
      aria-label="cart"
    >
      <RiShoppingCartFill size={24}/>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger-nomode px-1 text-[11px] font-bold leading-none text-danger-text-nomode">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function AppHeader() {
  const { mode, setMode } = useTheme();
  const hideHeader = useScrollHeaderHide(10);
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const syncCartCount = () => setCartCount(readCartCount());
    const syncAdminAccess = () => setHasAdminAccess(isAdminAccessUnlocked());

    syncCartCount();
    syncAdminAccess();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener("storage", syncAdminAccess);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
    window.addEventListener(ADMIN_ACCESS_UPDATED_EVENT, syncAdminAccess);

    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener("storage", syncAdminAccess);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      window.removeEventListener(ADMIN_ACCESS_UPDATED_EVENT, syncAdminAccess);
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || hasAdminAccess);

  return (
    <header
      className={`
        sticky top-0 z-30 border-b border-secondary 
        bg-secondary-panel backdrop-blur flex justify-center items-center 
        w-full h-20 transition-transform duration-300
        ${hideHeader ? '-translate-y-full' : 'translate-y-0'}
      `}
    >
      <div className="relative flex justify-between items-center w-full px-4">
        {/* Left: logo, theme toggle, global search */}
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-primary-text border-b-2 border-secondary">LiveUiBook</div>
          <Toggle checked={mode === "dark"} onChange={(isDark: boolean) => setMode(isDark ? "dark" : "light")} />
          <React.Suspense fallback={<div />}> 
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore-next-line */}
            <GlobalSearch />
          </React.Suspense>
        </div>

        {/* Center: desktop nav */}
        {!isMobile && (
          <nav className="flex-1 flex justify-center items-center gap-3">
            {visibleNavItems.map((item) => (
              <Link key={item.href} className={`rounded-md px-4 py-2 text-sm font-semibold transition-all hover:scale-105 ${item.tone}`} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right: cart and mobile menu */}
        <div className="flex items-center gap-3">
          <CartLink count={cartCount} />
          {isMobile && (
            <button
              onClick={toggleMenu}
              className="text-2xl text-primary-text p-1 rounded-md hover:bg-primary-bg transition-colors"
              aria-label={isMenuOpen ? "close menu" : "open menu"}
            >
              {isMenuOpen ? <IoClose /> : <IoMenu />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown - Glassmorphic Background */}
      {isMobile && (
        <div
          className={`absolute right-0 top-20 z-20 w-1/2 origin-top border border-primary-border/70 bg-primary-card/70 shadow-lg backdrop-blur-xl transition-all duration-300 ease-out ${
            isMenuOpen
              ? "translate-y-0 scale-y-100 opacity-100"
              : "pointer-events-none -translate-y-2 scale-y-0 opacity-0"
          }`}
          aria-hidden={!isMenuOpen}
        >
          <div className="flex flex-col p-4 gap-2 w-full">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                className={`rounded-md px-4 py-3 text-sm font-semibold transition-all hover:scale-105 text-center backdrop-blur-md bg-bg-base/80 border border-primary-border ${item.tone}`}
                href={item.href}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
