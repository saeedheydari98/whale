"use client";

import { clearAppUserCache } from "@/lib/app-user-client";

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
const ADMIN_REQUESTS_ENDPOINT = "/api/admin/security/requests";

function emitAdminAccessUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_ACCESS_UPDATED_EVENT));
}

async function readApiJson(response: Response, fallbackMessage: string) {
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.showMessage || fallbackMessage);
  }
  return data;
}

export async function requestAdminAccess() {
  const response = await fetch(ADMIN_REQUESTS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await readApiJson(response, "ثبت درخواست ناموفق بود.");
  emitAdminAccessUpdated();
  return data?.data?.request as AdminAccessRequestRecord | null;
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
  const data = await readApiJson(response, "به‌روزرسانی درخواست ناموفق بود.");
  clearAppUserCache();
  emitAdminAccessUpdated();
  return data?.data?.request as AdminAccessRequestRecord | null;
}

export async function grantAdminAccessToUser(userId: number) {
  const response = await fetch(ADMIN_REQUESTS_ENDPOINT, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, action: "grant" }),
  });
  const data = await readApiJson(response, "اعطای دسترسی مدیریت ناموفق بود.");
  clearAppUserCache();
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
