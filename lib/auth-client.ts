"use client";

import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";

export const AUTH_USER_UPDATED_EVENT = "auth-user-updated";
const USER_PROFILE_API_URL = "/api/app/user";

export type AuthClientUser = {
  id?: number | string;
  username?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  profile?: unknown;
};

let cachedUser: AuthClientUser | null = null;
let hasLoadedUser = false;
let pendingUserRequest: Promise<any> | null = null;

function authUserCacheKey(user: AuthClientUser | null | undefined) {
  return [
    user?.id ?? "",
    user?.username ?? "",
    user?.email ?? "",
    user?.role ?? "",
  ].join("|");
}

function emitAuthUserUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
}

export function readCachedAuthUser() {
  return hasLoadedUser ? cachedUser : null;
}

export function setCachedAuthUser(user: AuthClientUser | null, options?: { emit?: boolean }) {
  const previousKey = hasLoadedUser ? authUserCacheKey(cachedUser) : "";
  const nextKey = authUserCacheKey(user);
  cachedUser = user;
  hasLoadedUser = true;
  pendingUserRequest = null;
  if (previousKey !== nextKey) invalidateFetchCache(USER_PROFILE_API_URL);
  if (options?.emit !== false) emitAuthUserUpdated();
}

export function clearCachedAuthUser(options?: { emit?: boolean }) {
  setCachedAuthUser(null, options);
}

export async function fetchCurrentUser(options?: { force?: boolean; allowStaleOnError?: boolean }) {
  const force = options?.force ?? false;
  if (!force && hasLoadedUser) return cachedUser;

  if (!pendingUserRequest) {
    pendingUserRequest = fetchJsonDeduped<any>(USER_PROFILE_API_URL, { force })
      .finally(() => {
        pendingUserRequest = null;
      });
  }

  try {
    const data = await pendingUserRequest;
    if (data?.ok === false) {
      throw new Error(data?.message || data?.error || "بارگذاری پروفایل ناموفق بود.");
    }
    const user = data?.data?.user?.role ? data.data.user as AuthClientUser : null;
    setCachedAuthUser(user, { emit: false });
    return user;
  } catch {
    if (options?.allowStaleOnError === false) {
      setCachedAuthUser(null, { emit: false });
      return null;
    }
    return cachedUser;
  }
}

export function hasAdminRole(user: AuthClientUser | null | undefined) {
  return user?.role === "admin" || user?.role === "superadmin";
}

export function subscribeAuthUser(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(AUTH_USER_UPDATED_EVENT, listener);
  return () => window.removeEventListener(AUTH_USER_UPDATED_EVENT, listener);
}
