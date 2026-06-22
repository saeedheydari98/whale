import {
  fetchUserProfile,
  isUserProfileComplete,
  normalizeUserProfile,
  readUserProfile,
  writeUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  USER_PROFILE_STORAGE_KEY,
} from "@/lib/user-profile";

export const ADMIN_ACCESS_UPDATED_EVENT = "admin-access-updated";

export type AdminSecurity = {
  hasCode: boolean;
  isPanelLocked: boolean;
};

const ADMIN_SECURITY_CACHE_MS = 5000;
const ADMIN_SECURITY_STATUS_ENDPOINT = "/api/admin/security/status";
let cachedAdminSecurity: { value: AdminSecurity; expiresAt: number } | null = null;
let pendingAdminSecurity: Promise<AdminSecurity> | null = null;

function emitAdminAccessUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_ACCESS_UPDATED_EVENT));
}

function readNow() {
  return Date.now();
}

function cacheAdminSecurity(security: AdminSecurity) {
  cachedAdminSecurity = {
    value: security,
    expiresAt: readNow() + ADMIN_SECURITY_CACHE_MS,
  };
}

function invalidateAdminSecurityCache() {
  cachedAdminSecurity = null;
  pendingAdminSecurity = null;
}

export function isAdminAccessUnlocked(profile = readUserProfile()) {
  if (cachedAdminSecurity?.value.isPanelLocked === false) return true;
  return profile?.isAdminUnlocked === true;
}

export async function fetchAdminAccess() {
  const me = await fetch("/api/auth/me", { cache: "no-store" })
    .then((res) => res.ok ? res.json() : null)
    .catch(() => null);
  const role = me?.data?.user?.role;
  if (role === "admin" || role === "superadmin") return true;

  const security = await fetchAdminSecurity();
  if (!security.isPanelLocked) return true;

  const profile = await fetchUserProfile(undefined, { write: false });
  return isAdminAccessUnlocked(profile);
}

export async function unlockAdminAccessWithCode(code: string, username: string, profile = readUserProfile()) {

  const res = await fetch("/api/admin/security/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, username, profile }),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Admin code was not accepted.");
  }

  const savedProfile = normalizeUserProfile(data?.data?.user?.profile ?? data?.data?.profile ?? {
    ...(profile ?? {}),
    isAdminUnlocked: true,
  });
  if (isUserProfileComplete(savedProfile)) writeUserProfile(savedProfile);
  emitAdminAccessUpdated();
  return data?.data?.access?.isAdminUnlocked === true || savedProfile.isAdminUnlocked;
}

export async function fetchAdminSecurity(options?: { force?: boolean }) {
  if (!options?.force && cachedAdminSecurity && cachedAdminSecurity.expiresAt > readNow()) {
    return cachedAdminSecurity.value;
  }

  if (!options?.force && pendingAdminSecurity) {
    return pendingAdminSecurity;
  }

  pendingAdminSecurity = fetch(ADMIN_SECURITY_STATUS_ENDPOINT, { cache: "no-store" })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || "Admin security load failed");
      }

      const security = {
        hasCode: data?.data?.security?.hasCode === true,
        isPanelLocked: data?.data?.security?.isPanelLocked === true,
      } satisfies AdminSecurity;
      cacheAdminSecurity(security);
      return security;
    })
    .finally(() => {
      pendingAdminSecurity = null;
    });

  return pendingAdminSecurity;
}

export async function saveAdminAccessCode(currentCode: string, code: string, confirmCode: string) {
  const endpoint = currentCode.trim()
    ? "/api/admin/security/change-code"
    : "/api/admin/security/set-code";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentCode, code, confirmCode }),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Admin security save failed");
  }

  const savedSecurity = {
    hasCode: data?.data?.security?.hasCode === true,
    isPanelLocked: data?.data?.security?.isPanelLocked === true,
  } satisfies AdminSecurity;
  cacheAdminSecurity(savedSecurity);

  const profile = readUserProfile();
  if (profile) {
    writeUserProfile({
      ...profile,
      isAdminUnlocked: false,
    });
  }
  emitAdminAccessUpdated();

  return savedSecurity;
}

export async function saveAdminPanelLock(isPanelLocked: boolean) {
  invalidateAdminSecurityCache();
  const res = await fetch(isPanelLocked ? "/api/admin/security/lock" : "/api/admin/security/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "", profile: readUserProfile() ?? undefined }),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Admin lock update failed");
  }

  const savedSecurity = {
    hasCode: data?.data?.security?.hasCode === true,
    isPanelLocked: data?.data?.security?.isPanelLocked === true,
  } satisfies AdminSecurity;
  cacheAdminSecurity(savedSecurity);
  emitAdminAccessUpdated();

  return savedSecurity;
}

export function subscribeAdminAccess(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(ADMIN_ACCESS_UPDATED_EVENT, listener);
  window.addEventListener(USER_PROFILE_UPDATED_EVENT, listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === USER_PROFILE_STORAGE_KEY) listener();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(ADMIN_ACCESS_UPDATED_EVENT, listener);
    window.removeEventListener(USER_PROFILE_UPDATED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
