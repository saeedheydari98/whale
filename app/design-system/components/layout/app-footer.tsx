"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BiCategoryAlt } from "react-icons/bi";
import { GiSpermWhale } from "react-icons/gi";
import { IoHomeOutline, IoStorefrontOutline } from "react-icons/io5";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAppUser } from "@/lib/app-user-context";
import { readCachedAuthUser, setCachedAuthUser } from "@/lib/auth-client";
import { getCart } from "@/lib/cart-client";
import { readUserProfile, USER_PROFILE_UPDATED_EVENT, type UserProfile } from "@/lib/user-profile";
import { EmailOtpAuthForm } from "../ui/email-otp-auth-form";
import { CustomModal } from "../ui/modal";
import {
  AccountButton,
  syncStoredProfileFromUser,
  type AccountUser,
} from "./account-button";

const mobileNavItems = [
  { href: "/", label: "خانه", icon: <IoHomeOutline /> },
  { href: "/categories", label: "دسته بندی", icon: <BiCategoryAlt /> },
  { href: "/products", label: "ویترین", icon: <IoStorefrontOutline /> },
];

export function AppFooter() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { data: appUserData, refresh: refreshAppUser } = useAppUser();
  const [authUser, setAuthUser] = useState<AccountUser | null>(null);
  const [accountProfile, setAccountProfile] = useState<UserProfile | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const visibleNavItems = mobileNavItems;
  const isActiveLink = (href: string) => href === "/"
    ? pathname === "/" || pathname.startsWith("/brand/")
    : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!appUserData) return;
    setAuthUser(appUserData.user);
    setAccountProfile(syncStoredProfileFromUser(appUserData.user) ?? readUserProfile());
    if (!appUserData.user) setAccountProfile(null);
  }, [appUserData]);

  useEffect(() => {
    const syncProfile = () => setAccountProfile(readUserProfile());
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
    return () => window.removeEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
  }, []);

  const openAccount = () => {
    if (authUser ?? readCachedAuthUser()) {
      router.push("/panel/user");
      return;
    }
    setAuthOpen(true);
  };

  const accountActive = pathname === "/panel/user" || pathname.startsWith("/panel/user/");

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 flex h-14 w-full shrink-0 items-center justify-center border-t border-primary-border bg-primary-panel font-bold text-primary-text shadow-lg backdrop-blur md:static md:h-12">
      {isMobile ? (
        <nav className="flex h-full w-full items-center justify-around gap-1 px-2 py-1.5">
          {visibleNavItems.map((item) => {
            const active = isActiveLink(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  active ? "text-primary" : "text-secondary-text hover:text-primary"
                }`}
              >
                <span className={`flex h-6 min-w-8 items-center justify-center rounded-full text-base transition ${
                  active ? "bg-primary text-primary-contrast shadow-sm ring-1 ring-primary-border" : "text-secondary-text"
                }`}>
                  {item.icon}
                </span>
                <span className="max-w-full truncate leading-none">{item.label}</span>
                <span className={`h-0.5 rounded-full transition-all ${active ? "w-4 bg-primary" : "w-1 bg-transparent"}`} aria-hidden="true" />
              </Link>
            );
          })}
          <AccountButton
            user={authUser}
            profile={accountProfile}
            active={accountActive}
            variant="footer"
            onOpen={openAccount}
          />
        </nav>
      ) : (
        <div className="flex items-center justify-center gap-2 text-xl font-bold">
          <GiSpermWhale aria-hidden="true" />
          <span>وال</span>
        </div>
      )}
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
              await getCart();
              if (!profileComplete) router.push("/panel/user");
              router.refresh();
            }}
          />
        </div>
      </CustomModal>
    </footer>
  );
}
