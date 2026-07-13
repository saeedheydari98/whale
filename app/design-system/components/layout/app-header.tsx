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
  clearLocalCartSnapshot,
  getCart,
  getCartCount,
  hasLocalCartSnapshot,
  readLocalCart,
} from "@/lib/cart-client";
import {
  clearCachedAuthUser,
  setCachedAuthUser,
  subscribeAuthUser,
} from "@/lib/auth-client";
import { clearCachedGlobalUser } from "@/lib/app-global-client";
import { useAppGlobal } from "@/lib/app-global-context";
import {
  clearUserProfile,
  readUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  type UserProfile,
} from "@/lib/user-profile";
import { GiSpermWhale } from "react-icons/gi";

type HeaderUser = {
  id?: number | string;
  username?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  profile?: unknown;
};

type HeaderProfile = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
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

function AccountButton({ user, profile, onOpen }: { user: HeaderUser | null; profile: UserProfile | null; onOpen: () => void }) {
  const label = getUserFullName(user, profile) || getUserPhone(user, profile) || "";
  const initial = label.trim().charAt(0).toUpperCase();
  const className = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-border bg-primary-bg text-base font-bold text-primary-text transition-colors hover:bg-primary-soft hover:text-primary";

  return (
    <button type="button" className={className} aria-label="Account" onClick={onOpen}>
      {user && initial ? <span>{initial}</span> : <IoPersonCircleOutline />}
    </button>
  );
}

function getUserProfile(user: HeaderUser | null | undefined): HeaderProfile | null {
  return user?.profile && typeof user.profile === "object"
    ? user.profile as HeaderProfile
    : null;
}

function getUserFullName(user: HeaderUser | null | undefined, preferredProfile?: HeaderProfile | null) {
  const profile = preferredProfile ?? getUserProfile(user);
  const profileName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
  return profileName;
}

function getUserPhone(user: HeaderUser | null | undefined, preferredProfile?: HeaderProfile | null) {
  return String((preferredProfile ?? getUserProfile(user))?.phone || "").trim();
}

function getUserMarketingEmail(user: HeaderUser | null | undefined, preferredProfile?: HeaderProfile | null) {
  return String((preferredProfile ?? getUserProfile(user))?.email || "").trim();
}

function getVisibleCartCount(user: HeaderUser | null | undefined, fallbackCount: number) {
  return hasLocalCartSnapshot(user)
    ? getCartCount(readLocalCart(user))
    : fallbackCount;
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
  const [accountProfile, setAccountProfile] = useState<UserProfile | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"choice" | "login">("choice");
  const [authLoginMethod, setAuthLoginMethod] = useState<"password" | "otp">("password");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authOtpCode, setAuthOtpCode] = useState("");
  const [authOtpSent, setAuthOtpSent] = useState(false);
  const [authStatus, setAuthStatus] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const showMobileBack = isMobile && pathname !== "/";
  const accountLabel = getUserFullName(authUser, accountProfile) || getUserPhone(authUser, accountProfile);
  const accountInitial = accountLabel.trim().charAt(0).toUpperCase() || "?";
  const accountPhone = getUserPhone(authUser, accountProfile);
  const accountEmail = getUserMarketingEmail(authUser, accountProfile);
  const authModalTitle = authUser
    ? "حساب کاربری"
    : authMode === "choice"
      ? "حساب کاربری"
      : "ورود به حساب";

  useEffect(() => {
    if (!globalData) return;
    setAuthUser(globalData.user);
    setAccountProfile(readUserProfile() ?? (getUserProfile(globalData.user) as UserProfile | null));
    setCartCount(getVisibleCartCount(globalData.user, globalData.cart.count));
    setHasAdminAccess(globalData.user?.role === "admin" || globalData.user?.role === "superadmin");
  }, [globalData]);

  useEffect(() => {
    const syncCartCount = () => {
      setCartCount(getVisibleCartCount(undefined, 0));
    };
    const syncProfile = () => {
      setAccountProfile(readUserProfile());
    };
    const syncGlobalFromApi = async (force = false) => {
      const next = await refreshGlobal({ force });
      setAuthUser(next.user);
      setCartCount(getVisibleCartCount(next.user, next.cart.count));
      setHasAdminAccess(next.user?.role === "admin" || next.user?.role === "superadmin");
    };
    const syncAdminAccess = () => setHasAdminAccess(isAdminAccessUnlocked());

    syncAdminAccess();
    syncCartCount();
    syncProfile();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
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
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      unsubscribeAdminAccess();
      unsubscribeAuthUser();
    };
  }, [refreshGlobal]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || hasAdminAccess);

  const submitAuth = async () => {
    if (!authPhone.trim() || !authPassword.trim()) {
      setAuthStatus("شماره موبایل و رمز عبور الزامی است.");
      return;
    }

    setAuthLoading(true);
    setAuthStatus("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: authPhone.trim(), password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || "ورود ناموفق بود.");
      const user = data?.data?.user ?? null;
      setCachedAuthUser(user, { emit: false });
      setAuthUser(user);
      setAuthOpen(false);
      setAuthPassword("");
      setAuthStatus("");
      const nextGlobal = await refreshGlobal({ force: true });
      const accountCart = await getCart();
      setHasAdminAccess(nextGlobal.user?.role === "admin" || nextGlobal.user?.role === "superadmin");
      setCartCount(getCartCount(accountCart.items));
      router.refresh();
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "ورود ناموفق بود.");
    } finally {
      setAuthLoading(false);
    }
  };

  const requestOtp = async () => {
    if (!authPhone.trim()) {
      setAuthStatus("شماره موبایل الزامی است.");
      return;
    }

    setAuthLoading(true);
    setAuthStatus("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: authPhone.trim(), purpose: "login" }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || "ارسال کد ناموفق بود.");
      setAuthOtpSent(true);
      setAuthStatus(data?.data?.developmentCode ? `کد توسعه: ${data.data.developmentCode}` : "کد ورود ارسال شد.");
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "ارسال کد ناموفق بود.");
    } finally {
      setAuthLoading(false);
    }
  };

  const submitOtp = async () => {
    if (!authPhone.trim() || !authOtpCode.trim()) {
      setAuthStatus("شماره موبایل و کد پیامک الزامی است.");
      return;
    }

    setAuthLoading(true);
    setAuthStatus("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: authPhone.trim(), code: authOtpCode.trim(), purpose: "login" }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || "ورود پیامکی ناموفق بود.");
      const user = data?.data?.user ?? null;
      setCachedAuthUser(user, { emit: false });
      setAuthUser(user);
      setAuthOpen(false);
      setAuthPassword("");
      setAuthOtpCode("");
      setAuthOtpSent(false);
      const nextGlobal = await refreshGlobal({ force: true });
      const accountCart = await getCart();
      setHasAdminAccess(nextGlobal.user?.role === "admin" || nextGlobal.user?.role === "superadmin");
      setCartCount(getCartCount(accountCart.items));
      router.refresh();
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "ورود پیامکی ناموفق بود.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    const currentUser = authUser;
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearLocalCartSnapshot(currentUser);
    clearLocalCartSnapshot(null);
    clearUserProfile(currentUser);
    clearCachedAuthUser({ emit: false });
    clearCachedGlobalUser();
    setAuthUser(null);
    setHasAdminAccess(false);
    setCartCount(0);
    setAuthOpen(false);
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
          <AccountButton
            user={authUser}
            profile={accountProfile}
            onOpen={() => {
              setAuthMode("choice");
              setAuthStatus("");
              setAuthOpen(true);
            }}
          />
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
        title={authModalTitle}
        rounded="lg"
        shadow="lg"
      >
        <div className="flex flex-col gap-3">
          {authUser ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary-border bg-primary-bg text-lg font-bold text-primary-text">
                  <span>{accountInitial}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="truncate text-sm font-bold text-primary-text">
                    <span>{accountLabel || "حساب کاربری"}</span>
                  </div>
                  <div className="truncate text-xs font-semibold text-secondary-text">
                    <span>{accountPhone || "شماره ثبت نشده"}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-primary-border bg-primary-bg p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-secondary-text">شماره موبایل</span>
                  <span className="min-w-0 truncate text-sm font-bold text-primary-text">{accountPhone || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-secondary-text">ایمیل</span>
                  <span className="min-w-0 truncate text-sm font-bold text-primary-text">{accountEmail || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-secondary-text">نام</span>
                  <span className="min-w-0 truncate text-sm font-bold text-primary-text">{accountLabel || "-"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <CustomButton
                  variant="neutral"
                  fullWidth
                  onClick={() => {
                    setAuthOpen(false);
                    router.push("/panel/user");
                  }}
                >
                  <span>پنل کاربری</span>
                </CustomButton>
                <CustomButton variant="danger" fullWidth onClick={() => void logout()}>
                  <span>خروج از حساب</span>
                </CustomButton>
              </div>
            </div>
          ) : authMode === "choice" ? (
            <div className="flex flex-col gap-2">
              <CustomButton
                fullWidth
                onClick={() => {
                  setAuthMode("login");
                  setAuthStatus("");
                }}
              >
                <span>ورود به حساب</span>
              </CustomButton>
              <CustomButton
                variant="neutral"
                fullWidth
                onClick={() => {
                  setAuthOpen(false);
                  router.push("/panel/user?auth=register");
                }}
              >
                <span>ساخت حساب کاربری</span>
              </CustomButton>
            </div>
          ) : (
            <>
              <div className="flex gap-2 rounded-md border border-primary-border bg-primary-bg p-1">
                <button
                  type="button"
                  className={`flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold ${authLoginMethod === "password" ? "bg-primary text-primary-contrast" : "text-primary-text"}`}
                  onClick={() => {
                    setAuthLoginMethod("password");
                    setAuthStatus("");
                  }}
                >
                  <span>ورود با رمز</span>
                </button>
                <button
                  type="button"
                  className={`flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold ${authLoginMethod === "otp" ? "bg-primary text-primary-contrast" : "text-primary-text"}`}
                  onClick={() => {
                    setAuthLoginMethod("otp");
                    setAuthStatus("");
                  }}
                >
                  <span>ورود با پیامک</span>
                </button>
              </div>
              <CustomInput
                name="login-phone"
                value={authPhone}
                placeholder="شماره موبایل"
                autoComplete="tel"
                inputMode="tel"
                maxLength={11}
                pattern="09\d{9}"
                aria-label="شماره موبایل"
                onChange={(event) => {
                  setAuthPhone(event.target.value);
                  setAuthOtpSent(false);
                  setAuthOtpCode("");
                }}
              />
              {authLoginMethod === "password" ? (
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
              ) : (
                <CustomInput
                  name="login-otp"
                  value={authOtpCode}
                  placeholder="کد پیامک"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  aria-label="کد پیامک"
                  disabled={!authOtpSent}
                  onChange={(event) => setAuthOtpCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && authOtpSent) void submitOtp();
                  }}
                />
              )}
              {authStatus ? (
                <div className="rounded-md border border-primary-border bg-primary-bg px-3 py-2 text-sm font-semibold text-primary-text">{authStatus}</div>
              ) : null}
              <div className="flex gap-2">
                {authLoginMethod === "password" ? (
                  <CustomButton fullWidth isLoading={authLoading} onClick={submitAuth}>
                    <span>ورود</span>
                  </CustomButton>
                ) : authOtpSent ? (
                  <CustomButton fullWidth isLoading={authLoading} onClick={submitOtp}>
                    <span>تایید کد</span>
                  </CustomButton>
                ) : (
                  <CustomButton fullWidth isLoading={authLoading} onClick={requestOtp}>
                    <span>ارسال کد</span>
                  </CustomButton>
                )}
                <CustomButton variant="neutral" fullWidth onClick={() => setAuthMode("choice")}>
                  <span>بازگشت</span>
                </CustomButton> 
              </div>
            </>
          )}
        </div>
      </CustomModal>
    </header>
  );
}
