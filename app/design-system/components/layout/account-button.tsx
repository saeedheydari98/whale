"use client";

import { headerNavigationClasses, headerNavigationStyle, footerNavigationClasses, footerNavigationIconClasses, footerNavigationIndicatorClasses } from "@/app/design-system/variants/navigation.variant";

import { CustomActionButton } from "@/app/design-system/components/ui/action";

import { useEffect, useState } from "react";
import { IoPersonCircleOutline } from "react-icons/io5";
import {
  isUserProfileComplete,
  normalizeUserProfile,
  writeUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import { getProfileFullName, getUserPhone } from "@/lib/user-display";

export type AccountUser = {
  id?: number | string;
  username?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  profile?: unknown;
};

type AccountProfile = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isAdminUnlocked?: boolean | null;
};

export function readAccountProfileFromUser(user: AccountUser | null | undefined) {
  const profile = normalizeUserProfile(user?.profile as Partial<UserProfile> | null | undefined);
  return isUserProfileComplete(profile) ? profile : null;
}

export function syncStoredProfileFromUser(user: AccountUser | null | undefined) {
  const profile = readAccountProfileFromUser(user);
  if (profile) writeUserProfile(profile, { emit: false });
  return profile;
}

export function AccountButton({
  user,
  profile,
  active = false,
  variant = "desktop",
  onOpen,
}: {
  user: AccountUser | null;
  profile: UserProfile | null;
  active?: boolean;
  variant?: "desktop" | "footer";
  onOpen: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const label = getProfileFullName(profile ?? user?.profile) || getUserPhone(user, profile) || "";
  const initial = label.trim().charAt(0).toUpperCase();
  const showsInitial = Boolean(mounted && user && initial);
  const isFooter = variant === "footer";
  const className = isFooter ? footerNavigationClasses(active) : `${headerNavigationClasses(active)} shrink-0`;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <CustomActionButton
      type="button"
      className={className}
      aria-label="حساب کاربری"
      aria-current={active ? "page" : undefined}
      style={!isFooter ? headerNavigationStyle(active) : undefined}
      onClick={onOpen}
    >
      <span className={isFooter
        ? footerNavigationIconClasses(active)
        : showsInitial
          ? "flex h-7 w-7 items-center justify-center rounded-full border border-primary-border bg-primary-bg text-xs font-bold"
          : "flex items-center justify-center text-lg"
      }>
        {showsInitial ? <span>{initial}</span> : <IoPersonCircleOutline />}
      </span>
      <span className={isFooter ? "max-w-full truncate leading-none" : undefined}>حساب کاربری</span>
      {isFooter ? (
        <span className={footerNavigationIndicatorClasses(active)} aria-hidden="true" />
      ) : null}
    </CustomActionButton>
  );
}
