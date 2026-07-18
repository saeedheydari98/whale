"use client";

import {
  readCachedAuthUser,
  type AuthClientUser,
} from "@/lib/auth-client";
import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";

export type UserProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  isAdminUnlocked: boolean;
};

export const USER_PROFILE_STORAGE_KEY = "user-profile";
export const USER_PROFILE_UPDATED_EVENT = "user-profile-updated";
const GUEST_USER_PROFILE_STORAGE_KEY = `${USER_PROFILE_STORAGE_KEY}:guest`;

export const EMPTY_USER_PROFILE: UserProfile = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  isAdminUnlocked: false,
};

const PHONE_PATTERN = /^09\d{9}$/;
const USER_PROFILE_API_URL = "/api/user/profile";

function readProfileFromApiData(data: any) {
  return data?.data?.user?.profile ?? data?.data?.profile ?? null;
}

function areProfilesEqual(first: UserProfile | null, second: UserProfile | null) {
  if (!first || !second) return first === second;

  return (
    first.firstName === second.firstName &&
    first.lastName === second.lastName &&
    first.phone === second.phone &&
    first.email === second.email &&
    first.address === second.address &&
    first.isAdminUnlocked === second.isAdminUnlocked
  );
}

function getProfileStorageKey(user: AuthClientUser | null | undefined = readCachedAuthUser()) {
  const userId = user?.id == null ? "" : String(user.id).trim();
  if (userId) return `${USER_PROFILE_STORAGE_KEY}:user:${userId}`;

  const username = String(user?.username ?? "").trim().toLowerCase();
  if (username) return `${USER_PROFILE_STORAGE_KEY}:username:${username}`;

  const email = String(user?.email ?? "").trim().toLowerCase();
  if (email) return `${USER_PROFILE_STORAGE_KEY}:email:${email}`;

  return GUEST_USER_PROFILE_STORAGE_KEY;
}

function readRawStoredProfile(storageKey: string) {
  const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
  return parsed && typeof parsed === "object"
    ? normalizeUserProfile(parsed as Partial<UserProfile>)
    : null;
}

function migrateLegacyGuestProfile(targetKey: string) {
  if (typeof window === "undefined" || targetKey !== GUEST_USER_PROFILE_STORAGE_KEY) return;
  if (localStorage.getItem(targetKey) !== null) return;

  const legacyProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (legacyProfile === null) return;

  localStorage.setItem(targetKey, legacyProfile);
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
}

export function normalizeUserProfile(value: Partial<UserProfile> | null | undefined): UserProfile {
  return {
    firstName: String(value?.firstName ?? ""),
    lastName: String(value?.lastName ?? ""),
    phone: String(value?.phone ?? ""),
    email: String(value?.email ?? ""),
    address: String(value?.address ?? ""),
    isAdminUnlocked: value?.isAdminUnlocked === true,
  };
}

export function isUserProfileComplete(profile: Partial<UserProfile> | null | undefined) {
  const normalized = normalizeUserProfile(profile);

  return Boolean(
    normalized.firstName.trim() &&
      normalized.lastName.trim() &&
      PHONE_PATTERN.test(normalized.phone.trim()) &&
      normalized.address.trim().length >= 5
  );
}

export function readUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const storageKey = getProfileStorageKey();
    migrateLegacyGuestProfile(storageKey);
    const profile = readRawStoredProfile(storageKey);
    return isUserProfileComplete(profile) ? profile : null;
  } catch {
    return null;
  }
}

export function writeUserProfile(profile: UserProfile, options?: { emit?: boolean }) {
  if (typeof window === "undefined") return;

  const nextProfile = normalizeUserProfile(profile);
  const currentProfile = readUserProfile();
  if (areProfilesEqual(currentProfile, nextProfile)) return;

  localStorage.setItem(getProfileStorageKey(), JSON.stringify(nextProfile));
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  if (options?.emit !== false) {
    window.dispatchEvent(new Event(USER_PROFILE_UPDATED_EVENT));
  }
}

export function clearUserProfile(user?: AuthClientUser | null, options?: { emit?: boolean }) {
  if (typeof window === "undefined") return;

  localStorage.removeItem(getProfileStorageKey(user ?? readCachedAuthUser()));
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  if (options?.emit !== false) {
    window.dispatchEvent(new Event(USER_PROFILE_UPDATED_EVENT));
  }
}

export async function fetchUserProfile(options?: { write?: boolean; emit?: boolean; force?: boolean }) {
  const data = await fetchJsonDeduped<any>(USER_PROFILE_API_URL, { force: options?.force });
  if (data?.ok === false) {
    throw new Error(data?.message || data?.error || "بارگذاری پروفایل ناموفق بود.");
  }

  const profileData = readProfileFromApiData(data);
  const profile = profileData
    ? normalizeUserProfile(profileData as Partial<UserProfile>)
    : null;
  if (profile && isUserProfileComplete(profile)) {
    if (options?.write !== false) {
      writeUserProfile(profile, { emit: options?.emit });
    }
    return profile;
  }

  return null;
}

export async function saveUserProfile(profile: UserProfile) {
  const nextProfile = normalizeUserProfile(profile);
  const res = await fetch("/api/user/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: nextProfile }),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "ذخیره پروفایل ناموفق بود.");
  }

  const savedProfile = normalizeUserProfile(readProfileFromApiData(data) ?? nextProfile);
  invalidateFetchCache(USER_PROFILE_API_URL);
  writeUserProfile(savedProfile);
  return savedProfile;
}
