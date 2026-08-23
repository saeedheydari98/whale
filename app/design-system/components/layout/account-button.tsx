"use client";

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
  const className = isFooter
    ? `flex h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-bold transition-colors ${
        active ? "text-primary" : "text-secondary-text hover:text-primary"
      }`
    : `flex h-20 shrink-0 items-center justify-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
        active ? "text-primary-text" : "border-transparent text-primary-text hover:text-primary"
      }`;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      className={className}
      aria-label="حساب کاربری"
      aria-current={active ? "page" : undefined}
      style={!isFooter && active ? { borderBottomColor: "color-mix(in srgb, var(--primary-border) 58%, var(--primary-text))" } : undefined}
      onClick={onOpen}
    >
      <span className={isFooter
        ? `flex h-6 min-w-8 items-center justify-center rounded-full text-base transition ${
            active ? "bg-primary text-primary-contrast shadow-sm ring-1 ring-primary-border" : "text-secondary-text"
          }`
        : showsInitial
          ? "flex h-7 w-7 items-center justify-center rounded-full border border-primary-border bg-primary-bg text-xs font-bold"
          : "flex items-center justify-center text-lg"
      }>
        {showsInitial ? <span>{initial}</span> : <IoPersonCircleOutline />}
      </span>
      <span className={isFooter ? "max-w-full truncate leading-none" : undefined}>حساب کاربری</span>
      {isFooter ? (
        <span className={`h-0.5 rounded-full transition-all ${active ? "w-4 bg-primary" : "w-1 bg-transparent"}`} aria-hidden="true" />
      ) : null}
    </button>
  );
}
