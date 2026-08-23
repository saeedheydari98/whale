"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IoArrowForward, IoHomeOutline, IoPersonCircleOutline, IoStorefrontOutline } from "react-icons/io5";
import { usePathname, useRouter } from "next/navigation";
import Toggle from "../shared/toggle";
import GlobalSearch from "../ui/global-search";
import { useTheme } from "../../theme/provider";
import { useScrollHeaderHide } from "@/hooks/useScrollHeaderHide";
import { useIsMobile } from "@/hooks/useIsMobile";
import { RiShoppingCartFill } from "react-icons/ri";
import { BiCategoryAlt } from "react-icons/bi";
import { EmailOtpAuthForm } from "../ui/email-otp-auth-form";
import { CustomModal } from "../ui/modal";
import HeaderNavLink from "../ui/header-nav-link";
import {
  CART_UPDATED_EVENT,
  getCart,
  getCartCount,
  hasLocalCartSnapshot,
  readLocalCart,
} from "@/lib/cart-client";
import {
  readCachedAuthUser,
  setCachedAuthUser,
  subscribeAuthUser,
} from "@/lib/auth-client";
import { readCachedAppUser } from "@/lib/app-user-client";
import { useAppUser } from "@/lib/app-user-context";
import {
  isUserProfileComplete,
  normalizeUserProfile,
  readUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  writeUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import { getProfileFullName, getUserPhone } from "@/lib/user-display";
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
  address?: string | null;
  isAdminUnlocked?: boolean | null;
};

const navItems = [
  { href: "/", label: "خانه", icon: <IoHomeOutline /> },
  { href: "/categories", label: "دسته بندی", icon: <BiCategoryAlt /> },
  { href: "/products", label: "ویترین", icon: <IoStorefrontOutline /> },
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

function AccountButton({
  user,
  profile,
  active = false,
  compact = false,
  onOpen,
}: {
  user: HeaderUser | null;
  profile: UserProfile | null;
  active?: boolean;
  compact?: boolean;
  onOpen: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const label = getProfileFullName(profile ?? getUserProfile(user)) || getUserPhone(user, profile) || "";
  const initial = label.trim().charAt(0).toUpperCase();
  const showsInitial = Boolean(mounted && user && initial);
  const className = compact
    ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-border bg-primary-bg text-base font-bold text-primary-text transition-colors hover:bg-primary-soft hover:text-primary"
    : `flex h-20 shrink-0 items-center justify-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${active ? "text-primary-text" : "border-transparent text-primary-text hover:text-primary"}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      className={className}
      aria-label="حساب کاربری"
      aria-current={active ? "page" : undefined}
      style={!compact && active ? { borderBottomColor: "color-mix(in srgb, var(--primary-border) 58%, var(--primary-text))" } : undefined}
      onClick={onOpen}
    >
      {showsInitial ? (
        <span className={compact ? "flex items-center justify-center" : "flex h-7 w-7 items-center justify-center rounded-full border border-primary-border bg-primary-bg text-xs font-bold"}>
          <span>{initial}</span>
        </span>
      ) : (
        <span className={compact ? "flex items-center justify-center" : "flex items-center justify-center text-lg"}>
          <IoPersonCircleOutline />
        </span>
      )}
      {compact ? null : <span>حساب کاربری</span>}
    </button>
  );
}

function getUserProfile(user: HeaderUser | null | undefined): HeaderProfile | null {
  return user?.profile && typeof user.profile === "object"
    ? user.profile as HeaderProfile
    : null;
}

function readAccountProfileFromUser(user: HeaderUser | null | undefined) {
  const profile = normalizeUserProfile(getUserProfile(user) as Partial<UserProfile> | null | undefined);
  return isUserProfileComplete(profile) ? profile : null;
}

function syncStoredProfileFromUser(user: HeaderUser | null | undefined) {
  const profile = readAccountProfileFromUser(user);
  if (profile) writeUserProfile(profile, { emit: false });
  return profile;
}

function getVisibleCartCount(user: HeaderUser | null | undefined, fallbackCount: number) {
  if (hasLocalCartSnapshot(user)) {
    return getCartCount(readLocalCart(user));
  }

  return Math.max(0, fallbackCount);
}

export function AppHeader() {
  const { data: appUserData, refresh: refreshAppUser } = useAppUser();
  const { mode, setMode } = useTheme();
  const pathname = usePathname();
  const headerRef = useScrollHeaderHide({ resetKey: pathname });
  const isMobile = useIsMobile();
  const [cartCount, setCartCount] = useState(0);
  const [authUser, setAuthUser] = useState<HeaderUser | null>(null);
  const [accountProfile, setAccountProfile] = useState<UserProfile | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();
  const showMobileBack = isMobile && pathname !== "/";

  useEffect(() => {
    if (!appUserData) return;
    setAuthUser(appUserData.user);
    setAccountProfile(syncStoredProfileFromUser(appUserData.user) ?? readUserProfile());
    setCartCount(getVisibleCartCount(appUserData.user, appUserData.cart.count));
    if (!appUserData.user) {
      setAccountProfile(null);
    }
  }, [appUserData]);

  useEffect(() => {
    let cancelled = false;
    const syncCartCount = () => {
      const user = readCachedAuthUser();
      const cachedCount = readCachedAppUser({ allowStale: true })?.cart.count ?? 0;
      setCartCount(getVisibleCartCount(user, cachedCount));
    };
    const syncProfile = () => {
      setAccountProfile(readUserProfile());
    };
    const syncUserFromApi = async (force = false) => {
      const next = await refreshAppUser({ force });
      if (cancelled) return;
      setAuthUser(next.user);
      setCartCount(getVisibleCartCount(next.user, next.cart.count));
      if (!next.user) {
        setAccountProfile(null);
        return;
      }

      if (cancelled) return;
      setAccountProfile(syncStoredProfileFromUser(next.user) ?? readUserProfile());
    };

    syncCartCount();
    syncProfile();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
    const unsubscribeAuthUser = subscribeAuthUser(() => {
      void syncUserFromApi(true);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      unsubscribeAuthUser();
    };
  }, [refreshAppUser]);

  const visibleNavItems = navItems;
  const openAccount = () => {
    if (authUser ?? readCachedAuthUser()) {
      router.push("/panel/user");
      return;
    }
    setAuthOpen(true);
  };

  return (
    <header
      ref={headerRef}
      className={`
        sticky top-0 z-30 h-20 shrink-0 border-b border-primary-border
        bg-primary-panel backdrop-blur flex justify-center items-center 
        w-full will-change-transform
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
            <AccountButton
              user={authUser}
              profile={accountProfile}
              active={pathname === "/panel/user" || pathname.startsWith("/panel/user/")}
              onOpen={openAccount}
            />
          </nav>
        )}

        {/* Right: cart and mobile menu */}
        <div className="flex shrink-0 items-center gap-3">
          {isMobile ? (
            <AccountButton
              user={authUser}
              profile={accountProfile}
              compact
              onOpen={openAccount}
            />
          ) : null}
          <CartLink count={cartCount} />
        </div>
      </div>
      <CustomModal
        open={authOpen && !authUser}
        onClose={() => setAuthOpen(false)}
        title="ورود یا ساخت حساب"
        rounded="lg"
        shadow="lg"
      >
        <div className="flex flex-col gap-3">
          <EmailOtpAuthForm
            onSuccess={async ({ user, profileComplete }) => {
              setCachedAuthUser(user, { emit: false });
              setAuthUser(user);
              setAuthOpen(false);
              const nextUserData = await refreshAppUser({ force: true });
              setAccountProfile(syncStoredProfileFromUser(nextUserData.user ?? user) ?? readUserProfile());
              const accountCart = await getCart();
              setCartCount(getCartCount(accountCart.items));
              if (!profileComplete) router.push("/panel/user");
              router.refresh();
            }}
          />
        </div>
      </CustomModal>
    </header>
  );
}
