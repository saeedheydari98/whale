"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IoArrowBack, IoClose, IoMenu } from "react-icons/io5";
import { usePathname, useRouter } from "next/navigation";
import Toggle from "../shared/toggle";
import GlobalSearch from "../ui/global-search";
import { useTheme } from "../../theme/provider";
import { useScrollHeaderHide } from "@/hooks/useScrollHeaderHide";
import { useIsMobile } from "@/hooks/useIsMobile";
import { RiShoppingCartFill } from "react-icons/ri";
import { CustomButton } from "../ui/button";
import { CustomInput } from "../ui/input";
import { CustomModal } from "../ui/modal";
import HeaderNavLink from "../ui/header-nav-link";
import {
  fetchAdminAccess,
  isAdminAccessUnlocked,
  subscribeAdminAccess,
} from "@/lib/admin-access";
import {
  CART_UPDATED_EVENT,
  getCart,
  getCartCount,
  readLocalCart,
} from "@/lib/cart-client";
import {
  clearCachedAuthUser,
  fetchCurrentUser,
  setCachedAuthUser,
  subscribeAuthUser,
} from "@/lib/auth-client";
import { GiSpermWhale } from "react-icons/gi";

type HeaderUser = {
  username?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

const navItems = [
  { href: "/", label: "home" },
  { href: "/products", label: "products" },
  { href: "/panel/admin", label: "admin panel", adminOnly: true },
  { href: "/panel/user", label: "user panel" },
];

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
    const syncCartCount = () => setCartCount(getCartCount(readLocalCart()));
    const syncCartFromApi = async () => {
      const snapshot = await getCart();
      setCartCount(getCartCount(snapshot.items));
    };
    const syncAdminAccess = () => setHasAdminAccess(isAdminAccessUnlocked());
    const syncAdminAccessFromApi = async () => {
      setHasAdminAccess(await fetchAdminAccess());
    };

    void fetchCurrentUser().then((user) => {
      setAuthUser(user);
      syncCartCount();
      void syncCartFromApi();
      syncAdminAccess();
      void syncAdminAccessFromApi();
    });
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
    const unsubscribeAdminAccess = subscribeAdminAccess(syncAdminAccess);
    const unsubscribeAuthUser = subscribeAuthUser(() => {
      void fetchCurrentUser().then(setAuthUser);
    });

    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      unsubscribeAdminAccess();
      unsubscribeAuthUser();
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || hasAdminAccess);

  const submitAuth = async () => {
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthStatus("Username and password are required.");
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
      if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || "Auth failed.");
      const user = data?.data?.user ?? null;
      setCachedAuthUser(user);
      setAuthUser(user);
      setAuthOpen(false);
      setAuthPassword("");
      setAuthStatus("");
      setHasAdminAccess(await fetchAdminAccess());
      const snapshot = await getCart();
      setCartCount(getCartCount(snapshot.items));
      router.refresh();
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Auth failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearCachedAuthUser();
    setAuthUser(null);
    setHasAdminAccess(false);
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
              aria-label="go back"
              className="flex shrink-0 items-center justify-center p-1 text-xl text-primary-text transition-colors hover:text-primary"
            >
              <IoArrowBack />
            </button>
          ) : null}
          <div className="shrink-0 text-blue-dark-700"><GiSpermWhale size={40}/></div>
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
              <HeaderNavLink key={item.href} href={item.href}>
                {item.label}
              </HeaderNavLink>
            ))}
          </nav>
        )}

        {/* Right: cart and mobile menu */}
        <div className="flex shrink-0 items-center gap-3">
          {authUser && !isMobile ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-semibold text-primary-text sm:inline">{authUser.username || authUser.name || "account"}</span>
              <CustomButton size="sm" variant="neutral" border="base" onClick={logout}>
                Sign out
              </CustomButton>
            </div>
          ) : !authUser ? (
            <CustomButton
              size="sm"
              border="base"
              onClick={() => {
                setAuthMode("choice");
                setAuthStatus("");
                setAuthOpen(true);
              }}
            >
              acount
            </CustomButton>
          ) : null}
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
                variant="neutral"
                border="base"
                fullWidth
                onClick={() => {
                  closeMenu();
                  void logout();
                }}
              >
                Sign out
              </CustomButton>
            ) : null}
          </div>
        </div>
      )}
      <CustomModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title={authMode === "choice" ? "Account" : "Sign in"}
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex flex-col gap-3">
          {authMode === "choice" ? (
            <div className="flex flex-col gap-2">
              <CustomButton
                border="base"
                fullWidth
                onClick={() => {
                  setAuthMode("login");
                  setAuthStatus("");
                }}
              >
                Sign in to account
              </CustomButton>
              <CustomButton
                border="base"
                variant="neutral"
                fullWidth
                onClick={() => {
                  setAuthOpen(false);
                  router.push("/panel/user?auth=register");
                }}
              >
                Create account
              </CustomButton>
            </div>
          ) : (
            <>
              <CustomInput
                name="login-username"
                value={authUsername}
                placeholder="Username"
                autoComplete="username"
                aria-label="Username"
                onChange={(event) => setAuthUsername(event.target.value)}
              />
              <CustomInput
                name="login-password"
                value={authPassword}
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                aria-label="Password"
                onChange={(event) => setAuthPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitAuth();
                }}
              />
              {authStatus ? (
                <div className="rounded-md border border-primary-border bg-primary-bg px-3 py-2 text-sm font-semibold text-primary-text">{authStatus}</div>
              ) : null}
              <div className="flex gap-2">
                <CustomButton border="base" variant="neutral" fullWidth onClick={() => setAuthMode("choice")}>
                  Back
                </CustomButton>
                <CustomButton border="base" fullWidth isLoading={authLoading} onClick={submitAuth}>
                  Sign in
                </CustomButton>
              </div>
            </>
          )}
        </div>
      </CustomModal>
    </header>
  );
}
