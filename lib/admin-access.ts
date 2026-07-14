"use client";

import { clearAppGlobalCache } from "@/lib/app-global-client";
import { fetchCurrentUser, hasAdminRole, readCachedAuthUser } from "@/lib/auth-client";

export const ADMIN_ACCESS_UPDATED_EVENT = "admin-access-updated";

export type AdminAccessRequestStatus = "pending" | "approved" | "rejected" | "revoked" | string;

export type AdminAccessRequestRecord = {
  id: string;
  username: string;
  phone: string;
  status: AdminAccessRequestStatus;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    username?: string | null;
    role?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

const ADMIN_REQUESTS_CACHE_MS = 5000;
const ADMIN_REQUESTS_ENDPOINT = "/api/admin/security/requests";
let cachedAdminRequests: { value: AdminAccessRequestRecord[]; expiresAt: number } | null = null;
let pendingAdminRequests: Promise<AdminAccessRequestRecord[]> | null = null;

function emitAdminAccessUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_ACCESS_UPDATED_EVENT));
}

function now() {
  return Date.now();
}

function invalidateAdminRequestsCache() {
  cachedAdminRequests = null;
  pendingAdminRequests = null;
}

async function readApiJson(response: Response, fallbackMessage: string) {
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || fallbackMessage);
  }
  return data;
}

export function isAdminAccessUnlocked() {
  return hasAdminRole(readCachedAuthUser());
}

export async function fetchAdminAccess(options?: { force?: boolean }) {
  return hasAdminRole(await fetchCurrentUser(options));
}

export async function requestAdminAccess() {
  const response = await fetch(ADMIN_REQUESTS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await readApiJson(response, "ثبت درخواست مدیریت ناموفق بود.");
  invalidateAdminRequestsCache();
  emitAdminAccessUpdated();
  return data?.data?.request as AdminAccessRequestRecord | null;
}

export async function fetchAdminAccessRequests(options?: { force?: boolean }) {
  if (!options?.force && cachedAdminRequests && cachedAdminRequests.expiresAt > now()) {
    return cachedAdminRequests.value;
  }

  if (!options?.force && pendingAdminRequests) {
    return pendingAdminRequests;
  }

  if (options?.force) invalidateAdminRequestsCache();

  pendingAdminRequests = fetch(ADMIN_REQUESTS_ENDPOINT, { cache: "no-store" })
    .then(async (response) => {
      const data = await readApiJson(response, "بارگذاری درخواست های مدیریت ناموفق بود.");
      const requests = Array.isArray(data?.data?.requests)
        ? data.data.requests as AdminAccessRequestRecord[]
        : [];
      cachedAdminRequests = {
        value: requests,
        expiresAt: now() + ADMIN_REQUESTS_CACHE_MS,
      };
      return requests;
    })
    .finally(() => {
      pendingAdminRequests = null;
    });

  return pendingAdminRequests;
}

export async function reviewAdminAccessRequest(
  id: string,
  action: "approve" | "reject" | "revoke"
) {
  const response = await fetch(ADMIN_REQUESTS_ENDPOINT, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action }),
  });
  const data = await readApiJson(response, "به روزرسانی درخواست مدیریت ناموفق بود.");
  invalidateAdminRequestsCache();
  clearAppGlobalCache();
  emitAdminAccessUpdated();
  return data?.data?.request as AdminAccessRequestRecord | null;
}

export function subscribeAdminAccess(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(ADMIN_ACCESS_UPDATED_EVENT, listener);

  return () => {
    window.removeEventListener(ADMIN_ACCESS_UPDATED_EVENT, listener);
  };
}
