"use client";
import { readCachedAuthUser } from "@/lib/auth-client";
import { singleFlight } from "@/lib/single-flight";

export function notificationRequest(url: string, method = "GET", body?: unknown) {
  const account = readCachedAuthUser()?.id ?? "guest";
  return singleFlight(`notification:${account}:${method}:${url}:${JSON.stringify(body)}`, async () => {
    const response = await fetch(url, { method, cache: "no-store", headers: {
      "content-type": "application/json", "x-account-id": String(account),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.showMessage || "عملیات انجام نشد.");
    return json.data;
  });
}

const OFF_KEY = "browser-push-disabled:v1";
let generation = 0;
const restored = new Set<string>();
export function rememberBrowserPush(account: string | number, endpoint: string) { restored.add(`${account}:${endpoint}`); }
export function resetPushRestore() { generation++; restored.clear(); }
export function setBrowserPushDisabled(disabled: boolean) {
  localStorage.setItem(OFF_KEY, String(disabled));
  resetPushRestore();
}
export function browserPushDisabled() { return localStorage.getItem(OFF_KEY) === "true"; }
export function restoreBrowserPush(account: string | number) {
  return singleFlight(`restore-push:${account}:${generation}`, async () => {
    const version = generation;
    if (browserPushDisabled() || !window.isSecureContext || !("Notification" in window)
      || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription || version !== generation || String(readCachedAuthUser()?.id) !== String(account)) return;
    const key = `${account}:${subscription.endpoint}`;
    if (restored.has(key)) return;
    await notificationRequest("/api/user/push", "POST", subscription.toJSON());
    if (version === generation) rememberBrowserPush(account, subscription.endpoint);
  });
}
