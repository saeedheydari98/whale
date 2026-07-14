"use client";

export const AUTH_USER_UPDATED_EVENT = "auth-user-updated";

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
let pendingUser: Promise<AuthClientUser | null> | null = null;

function emitAuthUserUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
}

export function readCachedAuthUser() {
  return hasLoadedUser ? cachedUser : null;
}

export function setCachedAuthUser(user: AuthClientUser | null, options?: { emit?: boolean }) {
  cachedUser = user;
  hasLoadedUser = true;
  pendingUser = null;
  if (options?.emit !== false) emitAuthUserUpdated();
}

export function clearCachedAuthUser(options?: { emit?: boolean }) {
  setCachedAuthUser(null, options);
}

export async function fetchCurrentUser(options?: { force?: boolean }) {
  if (!options?.force && hasLoadedUser) return cachedUser;
  if (!options?.force && pendingUser) return pendingUser;

  pendingUser = fetch("/api/user/profile", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("بارگذاری پروفایل ناموفق بود.");
      return res.json();
    })
    .then((data) => {
      const user = data?.data?.user?.role ? data.data.user as AuthClientUser : null;
      setCachedAuthUser(user, { emit: false });
      return user;
    })
    .catch(() => {
      return cachedUser;
    })
    .finally(() => {
      pendingUser = null;
    });

  return pendingUser;
}

export function hasAdminRole(user: AuthClientUser | null | undefined) {
  return user?.role === "admin" || user?.role === "superadmin";
}

export function subscribeAuthUser(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(AUTH_USER_UPDATED_EVENT, listener);
  return () => window.removeEventListener(AUTH_USER_UPDATED_EVENT, listener);
}
