"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IoArrowForward, IoClose, IoHomeOutline, IoMenu, IoPersonCircleOutline, IoStorefrontOutline } from "react-icons/io5";
import { usePathname, useRouter } from "next/navigation";
import Toggle from "../shared/toggle";
import GlobalSearch from "../ui/global-search";
import { useTheme } from "../../theme/provider";
import { useScrollHeaderHide } from "@/hooks/useScrollHeaderHide";
import { useIsMobile } from "@/hooks/useIsMobile";
import { RiShoppingCartFill } from "react-icons/ri";
import { BiCategoryAlt } from "react-icons/bi";
import { MdAdminPanelSettings } from "react-icons/md";
import { CustomButton } from "../ui/button";
import { CustomInput } from "../ui/input";
import { CustomModal } from "../ui/modal";
import HeaderNavLink from "../ui/header-nav-link";
import {
  isAdminAccessUnlocked,
  subscribeAdminAccess,
} from "@/lib/admin-access";
import {
  CART_UPDATED_EVENT,
  getCartCount,
  hasLocalCartSnapshot,
  readLocalCart,
} from "@/lib/cart-client";
import {
  clearCachedAuthUser,
  setCachedAuthUser,
  subscribeAuthUser,
} from "@/lib/auth-client";
import { clearAppGlobalCache } from "@/lib/app-global-client";
import { useAppGlobal } from "@/lib/app-global-context";
import { GiSpermWhale } from "react-icons/gi";

type HeaderUser = {
  username?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

const legacyNavItems = [
  { href: "/", label: "خانه" },
  { href: "/categories", label: "دسته بندی" },
  { href: "/products", label: "ویترین" },
  { href: "/panel/admin", label: "پنل مدیریت", adminOnly: true },
  { href: "/panel/user", label: "حساب کاربری" },
];

const navItems = [
  { href: "/", label: "خانه", icon: <IoHomeOutline /> },
  { href: "/categories", label: "دسته بندی", icon: <BiCategoryAlt /> },
  { href: "/products", label: "ویترین", icon: <IoStorefrontOutline /> },
  { href: "/panel/admin", label: "پنل مدیریت", icon: <MdAdminPanelSettings />, adminOnly: true },
  { href: "/panel/user", label: "حساب کاربری", icon: <IoPersonCircleOutline /> },
];

function CartLink({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <Link
      href="/cart"
      onClick={onClick}
      className="relative inline-flex items-center justify-center p-1 text-secondary-border-nomode transition-all hover:scale-110"
      aria-label="سبد خرید"
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
  const { data: globalData, refresh: refreshGlobal } = useAppGlobal();
  const { mode, setMode } = useTheme();
  const hideHeader = useScrollHeaderHide(10);
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [authUser, setAuthUser] = useState<HeaderUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"choice" | "login">("choice");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const showMobileBack = isMobile && pathname !== "/";

  useEffect(() => {
    if (!globalData) return;
    setAuthUser(globalData.user);
    setCartCount(globalData.cart.count);
    setHasAdminAccess(globalData.user?.role === "admin" || globalData.user?.role === "superadmin");
  }, [globalData]);

  useEffect(() => {
    const syncCartCount = () => {
      if (hasLocalCartSnapshot()) {
        setCartCount(getCartCount(readLocalCart()));
      }
    };
    const syncGlobalFromApi = async (force = false) => {
      const next = await refreshGlobal({ force });
      setAuthUser(next.user);
      setCartCount(next.cart.count);
      setHasAdminAccess(next.user?.role === "admin" || next.user?.role === "superadmin");
    };
    const syncAdminAccess = () => setHasAdminAccess(isAdminAccessUnlocked());

    void syncGlobalFromApi().then(() => {
      syncAdminAccess();
      syncCartCount();
    });
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
    const unsubscribeAdminAccess = subscribeAdminAccess(() => {
      syncAdminAccess();
      void syncGlobalFromApi(true);
    });
    const unsubscribeAuthUser = subscribeAuthUser(() => {
      void syncGlobalFromApi(true);
    });

    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      unsubscribeAdminAccess();
      unsubscribeAuthUser();
    };
  }, [refreshGlobal]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || hasAdminAccess);

  const submitAuth = async () => {
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthStatus("نام کاربری و رمز عبور الزامی است.");
      return;
    }

    setAuthLoading(true);
    setAuthStatus("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUsername.trim().toLowerCase(), password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || "ورود ناموفق بود.");
      const user = data?.data?.user ?? null;
      setCachedAuthUser(user);
      setAuthUser(user);
      setAuthOpen(false);
      setAuthPassword("");
      setAuthStatus("");
      const nextGlobal = await refreshGlobal({ force: true });
      setHasAdminAccess(nextGlobal.user?.role === "admin" || nextGlobal.user?.role === "superadmin");
      setCartCount(nextGlobal.cart.count);
      router.refresh();
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "ورود ناموفق بود.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearAppGlobalCache();
    clearCachedAuthUser();
    setAuthUser(null);
    setHasAdminAccess(false);
    void refreshGlobal({ force: true }).then((nextGlobal) => {
      setCartCount(nextGlobal.cart.count);
    });
    router.refresh();
  };

  return (
    <header
      className={`
        sticky top-0 z-30 overflow-visible border-b border-primary-border 
        bg-primary-panel backdrop-blur flex justify-center items-center 
        w-full h-20 transition-transform duration-300
        ${hideHeader ? '-translate-y-full' : 'translate-y-0'}
      `}
    >
      <div className="relative flex justify-between items-center w-full gap-3 px-4">
        {/* Left: logo, theme toggle, global search */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showMobileBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="بازگشت"
              className="flex shrink-0 items-center justify-center p-1 text-xl text-primary-text transition-colors hover:text-primary"
            >
              <IoArrowForward />
            </button>
          ) : null}
          <div className="shrink-0 text-primary-base-nomode"><GiSpermWhale size={40}/></div>
          <div className="shrink-0">
            <Toggle checked={mode === "dark"} onChange={(isDark: boolean) => setMode(isDark ? "dark" : "light")} />
          </div>
          <React.Suspense fallback={<div />}> 
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore-next-line */}
            <GlobalSearch />
          </React.Suspense>
        </div>

        {/* Center: desktop nav */}
        {!isMobile && (
          <nav className="flex flex-1 justify-end items-stretch gap-1 self-stretch">
            {visibleNavItems.map((item) => (
              <HeaderNavLink key={item.href} href={item.href} icon={item.icon}>
                {item.label}
              </HeaderNavLink>
            ))}
          </nav>
        )}

        {/* Right: cart and mobile menu */}
        <div className="flex shrink-0 items-center gap-3">
          {authUser && !isMobile ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-semibold text-primary-text sm:inline">{authUser.username || authUser.name || "حساب کاربری"}</span>
              <CustomButton size="sm" variant="danger" onClick={logout}>
                خروج
              </CustomButton>
            </div>
          ) : !authUser && !isMobile ? (
            <CustomButton
              size="sm"
              onClick={() => {
                setAuthMode("choice");
                setAuthStatus("");
                setAuthOpen(true);
              }}
            >
              حساب کاربری
            </CustomButton>
          ) : null}
          <CartLink count={cartCount} />
          {false && isMobile && (
            <button
              onClick={toggleMenu}
              className="text-2xl text-primary-text p-1 rounded-md hover:bg-primary-bg transition-colors"
              aria-label={isMenuOpen ? "بستن منو" : "باز کردن منو"}
            >
              {isMenuOpen ? <IoClose /> : <IoMenu />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown - Glassmorphic Background */}
      {false && isMobile && (
        <div
          className={`absolute left-0 top-20 z-20 w-1/2 origin-top border border-primary-border/70 bg-primary-card/70 shadow-lg backdrop-blur-xl transition-all duration-300 ease-out ${
            isMenuOpen
              ? "translate-y-0 scale-y-100 opacity-100"
              : "pointer-events-none -translate-y-2 scale-y-0 opacity-0"
          }`}
          aria-hidden={!isMenuOpen}
        >
          <div className="flex flex-col p-4 gap-2 w-full">
            {visibleNavItems.map((item) => (
              <HeaderNavLink
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="h-auto rounded-md border border-primary-border bg-transparent py-3 text-center backdrop-blur-md"
              >
                {item.label}
              </HeaderNavLink>
            ))}
            {authUser ? (
              <CustomButton
                size="sm"
                variant="danger"
                fullWidth
                onClick={() => {
                  closeMenu();
                  void logout();
                }}
              >
                خروج
              </CustomButton>
            ) : (
              <CustomButton
                size="sm"
                fullWidth
                onClick={() => {
                  closeMenu();
                  setAuthMode("choice");
                  setAuthStatus("");
                  setAuthOpen(true);
                }}
              >
                حساب کاربری
              </CustomButton>
            )}
          </div>
        </div>
      )}
      {false && isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around gap-1 border-t border-primary-border bg-primary-panel px-2 py-2 shadow-lg backdrop-blur">
          {visibleNavItems.map((item) => (
            <HeaderNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              className="h-14 flex-1 flex-col gap-1 rounded-md border-0 px-1 py-1 text-[11px]"
            >
              {item.label}
            </HeaderNavLink>
          ))}
        </nav>
      )}
      <CustomModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title={authMode === "choice" ? "حساب کاربری" : "ورود به حساب"}
        rounded="lg"
        shadow="lg"
      >
        <div className="flex flex-col gap-3">
          {authMode === "choice" ? (
            <div className="flex flex-col gap-2">
              <CustomButton
                fullWidth
                onClick={() => {
                  setAuthMode("login");
                  setAuthStatus("");
                }}
              >
                ورود به حساب
              </CustomButton>
              <CustomButton
                variant="neutral"
                fullWidth
                onClick={() => {
                  setAuthOpen(false);
                  router.push("/panel/user?auth=register");
                }}
              >
                ساخت حساب کاربری
              </CustomButton>
            </div>
          ) : (
            <>
              <CustomInput
                name="login-username"
                value={authUsername}
                placeholder="نام کاربری"
                autoComplete="username"
                aria-label="نام کاربری"
                onChange={(event) => setAuthUsername(event.target.value)}
              />
              <CustomInput
                name="login-password"
                value={authPassword}
                type="password"
                placeholder="رمز عبور"
                autoComplete="current-password"
                aria-label="رمز عبور"
                onChange={(event) => setAuthPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitAuth();
                }}
              />
              {authStatus ? (
                <div className="rounded-md border border-primary-border bg-primary-bg px-3 py-2 text-sm font-semibold text-primary-text">{authStatus}</div>
              ) : null}
              <div className="flex gap-2">
                <CustomButton fullWidth isLoading={authLoading} onClick={submitAuth}>
                  ورود
                </CustomButton>
                <CustomButton variant="neutral" fullWidth onClick={() => setAuthMode("choice")}>
                  بازگشت
                </CustomButton> 
              </div>
            </>
          )}
        </div>
      </CustomModal>
    </header>
  );
}
