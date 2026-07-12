"use client";

export const APP_NOTIFY_EVENT = "app-notify";
export const NOTIFICATION_SILENT_HEADER = "x-skip-notification";

export type AppNotificationType = "success" | "error" | "info";

export type AppNotificationPayload = {
  type?: AppNotificationType;
  message: string;
};

export function notifyApp(payload: AppNotificationPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AppNotificationPayload>(APP_NOTIFY_EVENT, { detail: payload }));
}
