export const ADMIN_SECURITY_CODE_STORAGE_KEY = "admin-security-code";
export const ADMIN_ACCESS_UNLOCKED_STORAGE_KEY = "admin-access-unlocked";
export const ADMIN_ACCESS_UPDATED_EVENT = "admin-access-updated";

function emitAdminAccessUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_ACCESS_UPDATED_EVENT));
}

export function readAdminSecurityCode() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ADMIN_SECURITY_CODE_STORAGE_KEY) ?? "";
}

export async function fetchAdminSecurityCode() {
  const res = await fetch("/api/admin/security", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || "Admin security load failed");
  }
  const code = String(data?.data?.code ?? "");
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_SECURITY_CODE_STORAGE_KEY, code);
  }
  return code;
}

export function writeAdminSecurityCode(code: string) {
  if (typeof window === "undefined") return;

  const normalizedCode = code.trim();
  localStorage.setItem(ADMIN_SECURITY_CODE_STORAGE_KEY, normalizedCode);
  localStorage.setItem(ADMIN_ACCESS_UNLOCKED_STORAGE_KEY, normalizedCode ? "1" : "0");
  emitAdminAccessUpdated();
}

export async function saveAdminSecurityCode(code: string) {
  const normalizedCode = code.trim();
  const res = await fetch("/api/admin/security", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: normalizedCode }),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || "Admin security save failed");
  }
  writeAdminSecurityCode(String(data?.data?.code ?? normalizedCode));
  return String(data?.data?.code ?? normalizedCode);
}

export function isAdminAccessUnlocked() {
  if (typeof window === "undefined") return false;
  const securityCode = readAdminSecurityCode();
  if (!securityCode) return true;
  return localStorage.getItem(ADMIN_ACCESS_UNLOCKED_STORAGE_KEY) === "1";
}

export function unlockAdminAccess(code: string) {
  if (typeof window === "undefined") return false;

  const securityCode = readAdminSecurityCode();
  const isUnlocked = Boolean(securityCode) && code.trim() === securityCode;

  if (isUnlocked) {
    localStorage.setItem(ADMIN_ACCESS_UNLOCKED_STORAGE_KEY, "1");
    emitAdminAccessUpdated();
  }

  return isUnlocked;
}

export function lockAdminAccess() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_ACCESS_UNLOCKED_STORAGE_KEY, "0");
  emitAdminAccessUpdated();
}
