"use client";

import { footerNavigationClasses, footerNavigationIconClasses, isNavigationActive } from "@/app/design-system/variants/navigation.variant";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BiCategoryAlt } from "react-icons/bi";
import { FaGithub, FaInstagram } from "react-icons/fa6";
import { GiSpermWhale } from "react-icons/gi";
import { IoCallOutline, IoHomeOutline, IoStorefrontOutline } from "react-icons/io5";
import { SiGmail } from "react-icons/si";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAppUser } from "@/lib/app-user-context";
import { readCachedAuthUser, setCachedAuthUser } from "@/lib/auth-client";
import { getCart } from "@/lib/cart-client";
import { readUserProfile, USER_PROFILE_UPDATED_EVENT, type UserProfile } from "@/lib/user-profile";
import { EmailOtpAuthForm } from "../ui/email-otp-auth-form";
import { CustomModal } from "../ui/modal";
import { CurvedNavigation } from "../ui/curved-navigation";
import { startRouteLoading } from "../loading/loading";
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
  const isActiveLink = (href: string) => isNavigationActive(pathname, href);

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
      startRouteLoading();
      router.push("/panel/user");
      return;
    }
    setAuthOpen(true);
  };

  const accountActive = pathname === "/panel/user" || pathname.startsWith("/panel/user/");
  const activeNavIndex = accountActive ? visibleNavItems.length : visibleNavItems.findIndex((item) => isActiveLink(item.href));

  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex w-full shrink-0 items-center justify-center px-4 pt-7 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-primary-panel font-bold text-primary-text max-md:bg-transparent! max-md:bg-none! max-md:backdrop-filter-none! md:pointer-events-auto md:static md:h-auto md:border-t md:border-border-default md:p-4 md:shadow-lg md:backdrop-blur">
      {isMobile ? (
        <CurvedNavigation activeIndex={activeNavIndex} itemCount={visibleNavItems.length + 1} className="pointer-events-auto max-w-lg">
          {visibleNavItems.map((item) => {
            const active = isActiveLink(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={footerNavigationClasses(active)}
              >
                <span aria-hidden="true" className={footerNavigationIconClasses(active)}>
                  {item.icon}
                </span>
                <span className="max-w-full truncate leading-4">{item.label}</span>
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
        </CurvedNavigation>
      ) : (
        <div className="flex w-full max-w-7xl flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-xl font-bold">
            <GiSpermWhale aria-hidden="true" />
            <span>وال</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-bold">ارتباط با ما</span>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
              <a
                href="tel:+989176991556"
                dir="ltr"
                aria-label="تماس با شماره ۰۹۱۷۶۹۹۱۵۵۶"
                className="flex items-center gap-2 text-secondary-text transition-colors hover:text-primary focus-visible:text-primary"
              >
                <IoCallOutline className="text-lg" aria-hidden="true" />
                <span>09176991556</span>
              </a>
              <a
                href="mailto:whalestoresupport@gmail.com"
                dir="ltr"
                aria-label="ارسال ایمیل به پشتیبانی وال استور"
                className="flex items-center gap-2 text-secondary-text transition-colors hover:text-primary focus-visible:text-primary"
              >
                <SiGmail className="text-lg" aria-hidden="true" />
                <span>whalestoresupport@gmail.com</span>
              </a>
              <a
                href="https://github.com/saeedheydari98"
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                aria-label="صفحه گیت‌هاب سعید حیدری"
                className="flex items-center gap-2 text-secondary-text transition-colors hover:text-primary focus-visible:text-primary"
              >
                <FaGithub className="text-lg" aria-hidden="true" />
                <span>saeedheydari98</span>
              </a>
              <a
                href="https://www.instagram.com/saeed.heydari.98/"
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                aria-label="صفحه اینستاگرام سعید حیدری"
                className="flex items-center gap-2 text-secondary-text transition-colors hover:text-primary focus-visible:text-primary"
              >
                <FaInstagram className="text-lg" aria-hidden="true" />
                <span>saeed.heydari.98</span>
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/about-wahle" className="text-sm font-bold text-secondary-text transition-colors hover:text-primary">
              درباره وال
            </Link>
          </div>
          <span data-text-wrap className="max-w-4xl text-center text-sm font-normal leading-7 text-secondary-text">
            وال یک پروژه آزمایشی برای ساخت فروشگاهی کاملاً پویاست؛ فروشگاهی که مدیر آن می‌تواند ظاهر و شیوه عملکرد بخش‌های مختلف را بدون تغییر کد مدیریت کند. هدف این پروژه، دستیابی به بالاترین سطح انعطاف‌پذیری در مدیریت فروشگاه است.
          </span>
        </div>
      )}
      <CustomModal
        open={authOpen && !authUser}
        onClose={() => setAuthOpen(false)}
        title="ورود یا ساخت حساب"
        rounded="lg"
        shadow="lg"
        closeOnBackdrop={false}
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
              if (!profileComplete) {
                startRouteLoading();
                router.push("/panel/user");
              }
              router.refresh();
            }}
          />
        </div>
      </CustomModal>
    </footer>
  );
}
