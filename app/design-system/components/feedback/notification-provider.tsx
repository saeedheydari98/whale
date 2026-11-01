"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoClose,
  IoInformationCircleOutline,
  IoWarningOutline,
} from "react-icons/io5";
import {
  APP_NOTIFY_EVENT,
  NOTIFICATION_SILENT_HEADER,
  notifyApp,
  type AppNotificationPayload,
  type AppNotificationType,
} from "@/lib/app-notifications";

export { APP_NOTIFY_EVENT, NOTIFICATION_SILENT_HEADER, notifyApp };

type NotificationItem = {
  id: number;
  type: AppNotificationType;
  message: string;
  time: number;
};

type NotificationContextValue = {
  notify: (payload: AppNotificationPayload) => void;
  apiNotificationTime: () => number;
  success: (message: string, time?: number) => void;
  error: (message: string, time?: number) => void;
  info: (message: string, time?: number) => void;
  warning: (message: string, time?: number) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
const ERROR_MESSAGE_PATTERN = /نشد|ناموفق|خطا|نامعتبر|الزامی|لطفاً|باید|نیست|وارد کنید|وارد حساب شوید|پیدا نشد|کامل کنید|مجاز نیست|دسترسی ندارید|failed|invalid|error|required|unauthorized/i;

function isMutationMethod(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function isQuietMutation(url: string) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return pathname === "/api/user/structure"
      || pathname === "/api/cart/quote"
      || pathname === "/api/admin/orders/in-person/quote";
  } catch {
    return url.includes("/api/user/structure");
  }
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  return String(init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function getRequestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return input.url;
  return String(input);
}

function isApiUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/");
  } catch {
    return url.startsWith("/api/");
  }
}

function hasSilentHeader(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers.get(NOTIFICATION_SILENT_HEADER) === "true" || headers.get("x-notify") === "false";
}

function parseResponseData(response: Response) {
  return response.clone().json().catch(() => null);
}

type AppNotificationViewProps = NotificationItem & {
  onClose: (id: number) => void;
};

function AppNotification({ id, type, message, time, onClose }: AppNotificationViewProps) {
  useEffect(() => {
    if (time <= 0) return;
    const timer = window.setTimeout(() => onClose(id), time * 1000);
    return () => window.clearTimeout(timer);
  }, [id, onClose, time]);

  const isSuccess = type === "success";
  const isError = type === "error";
  const isWarning = type === "warning";
  const Icon = isSuccess
    ? IoCheckmarkCircleOutline
    : isError
      ? IoAlertCircleOutline
      : isWarning
        ? IoWarningOutline
        : IoInformationCircleOutline;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur ${
        isSuccess
          ? "border-success-border-nomode bg-success-base text-success-text-nomode"
          : isError
            ? "border-danger-border-nomode bg-danger-base text-danger-text-nomode"
            : isWarning
              ? "border-warning-border bg-warning-bg text-warning-text"
              : "border-primary-border bg-primary-card text-primary-text"
      }`}
    >
      <Icon className="shrink-0 text-xl" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        className="flex shrink-0 items-center justify-center rounded-md p-1 transition hover:bg-primary-base/60"
        aria-label="بستن پیام"
        onClick={() => onClose(id)}
      >
        <IoClose aria-hidden="true" />
      </button>
    </div>
  );
}

export function AppNotificationProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<NotificationItem | null>(null);
  const notifyRef = useRef<(payload: AppNotificationPayload) => void>(() => undefined);
  const recentNotificationRef = useRef({ key: "", time: 0 });
  const lastApiNotificationTimeRef = useRef(0);

  const remove = useCallback((id: number) => {
    setItem((current) => current?.id === id ? null : current);
  }, []);

  const notify = useCallback((payload: AppNotificationPayload) => {
    const message = payload.message.trim();
    if (!message) return;
    const type = payload.type ?? "info";
    const key = `${type}:${message}`;
    const now = Date.now();
    if (recentNotificationRef.current.key === key && now - recentNotificationRef.current.time < 800) return;
    recentNotificationRef.current = { key, time: now };

    const id = now + Math.round(Math.random() * 1000);
    setItem({ id, type, message, time: payload.time ?? 2 });
  }, []);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    const handleNotify = (event: Event) => {
      const detail = (event as CustomEvent<AppNotificationPayload>).detail;
      if (detail?.message) notifyRef.current(detail);
    };

    window.addEventListener(APP_NOTIFY_EVENT, handleNotify);
    return () => window.removeEventListener(APP_NOTIFY_EVENT, handleNotify);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const method = getRequestMethod(input, init);
      const url = getRequestUrl(input);
      const shouldInspect = isApiUrl(url) && !hasSilentHeader(input, init);
      const shouldNotifySuccess = shouldInspect && isMutationMethod(method) && !isQuietMutation(url);

      try {
        const response = await originalFetch(input, init);

        if (shouldInspect && (isMutationMethod(method) || !response.ok)) {
          const data = await parseResponseData(response);
          const record = data && typeof data === "object"
            ? data as { ok?: unknown; showMessage?: unknown }
            : null;
          const showMessage = typeof record?.showMessage === "string" ? record.showMessage.trim() : "";
          const isError = !response.ok || record?.ok === false;

          if (showMessage && (isError || shouldNotifySuccess)) {
            lastApiNotificationTimeRef.current = Date.now();
            notifyRef.current({ type: isError ? "error" : "success", message: showMessage });
          }
        }

        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    notify,
    apiNotificationTime: () => lastApiNotificationTimeRef.current,
    success: (message, time) => notify({ type: "success", message, time }),
    error: (message, time) => notify({ type: "error", message, time }),
    info: (message, time) => notify({ type: "info", message, time }),
    warning: (message, time) => notify({ type: "warning", message, time }),
  }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-4 right-4 top-24 z-[80] flex flex-col items-center gap-2">
        {item ? <AppNotification {...item} onClose={remove} /> : null}
      </div>
    </NotificationContext.Provider>
  );
}

export function useAppNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useAppNotification must be used inside AppNotificationProvider");
  }
  return context;
}

export function useTransientAppMessage(message: string, time = 2) {
  const context = useAppNotification();

  useEffect(() => {
    const normalized = message.trim();
    if (!normalized) return;
    if (Date.now() - context.apiNotificationTime() < 1500) return;
    context.notify({ type: ERROR_MESSAGE_PATTERN.test(normalized) ? "error" : "success", message: normalized, time });
  }, [context.apiNotificationTime, context.notify, message, time]);
}
