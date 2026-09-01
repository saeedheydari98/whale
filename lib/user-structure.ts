import { NOTIFICATION_SILENT_HEADER } from "@/lib/app-notifications";
import { fetchJsonDeduped, invalidateFetchCache } from "@/lib/fetch-json";

export const USER_STRUCTURE_URL = "/api/user/structure";

export type UserPanelStructure = {
  orders: number;
  discounts: number;
  unseenDiscounts: number;
};

function asCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

export function normalizeUserPanelStructure(value: unknown): UserPanelStructure | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    orders: asCount(record.orders),
    discounts: asCount(record.discounts),
    unseenDiscounts: asCount(record.unseenDiscounts),
  };
}

export async function getUserPanelStructure(options?: { force?: boolean }) {
  const json = await fetchJsonDeduped<{
    ok?: boolean;
    data?: { structure?: unknown };
    message?: string;
    error?: string;
  }>(USER_STRUCTURE_URL, { force: options?.force });

  if (json?.ok === false) throw new Error(json.message || json.error || "دریافت ساختار حساب ممکن نشد.");
  return normalizeUserPanelStructure(json?.data?.structure);
}

export async function markUserDiscountsSeen() {
  const response = await fetch(USER_STRUCTURE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [NOTIFICATION_SILENT_HEADER]: "true",
    },
    credentials: "same-origin",
    body: JSON.stringify({ seenDiscounts: true }),
  });
  const json = await response.json().catch(() => null) as {
    ok?: boolean;
    data?: { structure?: unknown };
    message?: string;
    error?: string;
  } | null;
  if (!response.ok || json?.ok === false) {
    throw new Error(json?.message || json?.error || "به‌روزرسانی ساختار حساب ممکن نشد.");
  }
  invalidateFetchCache(USER_STRUCTURE_URL);
  return normalizeUserPanelStructure(json?.data?.structure);
}
