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
import { CustomButton } from "../ui/button";
import { CustomInput } from "../ui/input";
import { CustomModal } from "../ui/modal";
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
import { GiSpermWhale } from "react-icons/gi";

type HeaderUser = {
  username?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

const navItems = [
  { href: "/", label: "home", tone: "bg-primary-soft text-primary-text" },
  { href: "/products", label: "products", tone: "bg-primary-soft text-primary-text" },
  { href: "/panel/admin", label: "admin panel", tone: "bg-primary-soft text-primary-text", adminOnly: true },
  { href: "/panel/user", label: "user panel", tone: "bg-primary-soft text-primary-text" },
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
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();

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

    syncCartCount();
    void syncCartFromApi();
    syncAdminAccess();
    void syncAdminAccessFromApi();
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setAuthUser(data?.data?.user ?? null))
      .catch(() => setAuthUser(null));
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
    const unsubscribeAdminAccess = subscribeAdminAccess(syncAdminAccess);

    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      unsubscribeAdminAccess();
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
      const res = await fetch(`/api/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          authMode === "register"
            ? { username: authUsername.trim().toLowerCase(), password: authPassword, name: authName.trim() || undefined }
            : { username: authUsername.trim().toLowerCase(), password: authPassword }
        ),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || "Auth failed.");
      setAuthUser(data?.data?.user ?? null);
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
          <nav className="flex-1 flex justify-end items-center gap-3">
            {visibleNavItems.map((item) => (
              <Link key={item.href} className={`rounded-md px-4 py-2 text-sm font-semibold transition-all hover:scale-105 ${item.tone}`} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right: cart and mobile menu */}
        <div className="flex shrink-0 items-center gap-3">
          {authUser ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-semibold text-primary-text sm:inline">{authUser.username || authUser.name || "account"}</span>
              <CustomButton size="sm" variant="neutral" border="base" onClick={logout}>
                Sign out
              </CustomButton>
            </div>
          ) : (
            <CustomButton
              size="sm"
              border="base"
              onClick={() => {
                setAuthMode("login");
                setAuthOpen(true);
              }}
            >
              Sign in
            </CustomButton>
          )}
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
      <CustomModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title={authMode === "register" ? "Create account" : "Sign in"}
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <CustomButton size="sm" variant={authMode === "login" ? "primary" : "neutral"} border="base" onClick={() => setAuthMode("login")}>
              Sign in
            </CustomButton>
            <CustomButton size="sm" variant={authMode === "register" ? "primary" : "neutral"} border="base" onClick={() => setAuthMode("register")}>
              Sign up
            </CustomButton>
          </div>
          {authMode === "register" ? (
            <CustomInput value={authName} placeholder="Name" aria-label="Name" onChange={(event) => setAuthName(event.target.value)} />
          ) : null}
          <CustomInput value={authUsername} placeholder="Username" aria-label="Username" onChange={(event) => setAuthUsername(event.target.value)} />
          <CustomInput
            value={authPassword}
            type="password"
            placeholder="Password"
            aria-label="Password"
            onChange={(event) => setAuthPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitAuth();
            }}
          />
          {authStatus ? (
            <div className="rounded-md border border-primary-border bg-primary-bg px-3 py-2 text-sm font-semibold text-primary-text">{authStatus}</div>
          ) : null}
          <CustomButton border="base" fullWidth isLoading={authLoading} onClick={submitAuth}>
            {authMode === "register" ? "Create account" : "Sign in"}
          </CustomButton>
        </div>
      </CustomModal>
    </header>
  );
}
