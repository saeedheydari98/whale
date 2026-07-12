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
import { IoAlertCircleOutline, IoCheckmarkCircleOutline, IoClose } from "react-icons/io5";
import {
  APP_NOTIFY_EVENT,
  NOTIFICATION_SILENT_HEADER,
  notifyApp,
  type AppNotificationPayload,
} from "@/lib/app-notifications";

export { APP_NOTIFY_EVENT, NOTIFICATION_SILENT_HEADER, notifyApp };

type NotificationItem = Required<AppNotificationPayload> & {
  id: number;
};

type NotificationContextValue = {
  notify: (payload: AppNotificationPayload) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function isMutationMethod(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
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

function getSuccessMessage(method: string, url: string) {
  if (url.includes("/api/auth/login")) return "ورود با موفقیت انجام شد.";
  if (url.includes("/api/auth/logout")) return "خروج با موفقیت انجام شد.";
  if (url.includes("/comments")) {
    if (method === "DELETE") return "دیدگاه با موفقیت حذف شد.";
    if (method === "PUT" || method === "PATCH") return "دیدگاه با موفقیت به‌روزرسانی شد.";
    return "دیدگاه با موفقیت ثبت شد.";
  }
  if (url.includes("/api/cart") && method === "PATCH") return "پرداخت با موفقیت انجام شد.";
  if (url.includes("/api/cart") && method === "DELETE") return "سبد خرید خالی شد.";
  if (url.includes("/api/cart")) return "سبد خرید به‌روزرسانی شد.";
  if (url.includes("/api/profile") || url.includes("/api/user/profile")) return "پروفایل با موفقیت ذخیره شد.";
  if (url.includes("/api/user/change-password")) return "رمز عبور با موفقیت تغییر کرد.";
  if (url.includes("/api/admin/security")) return "تنظیمات امنیتی با موفقیت ذخیره شد.";
  if (url.includes("/api/admin/theme") || url.includes("/api/theme/admin")) return "ظاهر فروشگاه با موفقیت ذخیره شد.";
  if (url.includes("/api/banners")) return method === "DELETE" ? "بنر با موفقیت حذف شد." : "بنر با موفقیت ذخیره شد.";
  if (url.includes("/api/showcases")) return method === "DELETE" ? "ویترین با موفقیت حذف شد." : "ویترین با موفقیت ذخیره شد.";
  if (url.includes("/api/products")) return method === "DELETE" ? "آیتم با موفقیت حذف شد." : "اطلاعات فروشگاه با موفقیت ذخیره شد.";
  if (method === "DELETE") return "حذف با موفقیت انجام شد.";
  if (method === "POST") return "ثبت با موفقیت انجام شد.";
  return "تغییرات با موفقیت ذخیره شد.";
}

function getErrorMessage(data: unknown) {
  const record = data && typeof data === "object" ? data as { message?: unknown; error?: unknown } : null;
  const raw = String(record?.message ?? record?.error ?? "").trim();
  const normalized = raw.toLowerCase();

  if (!raw) return "عملیات ناموفق بود.";
  if (normalized === "complete profile is required" || normalized === "complete profile is required.") {
    return "برای این عملیات اطلاعات پروفایل باید کامل باشد.";
  }
  if (normalized === "server error") return "خطای سرور رخ داد.";
  return raw;
}

function parseResponseData(response: Response) {
  return response.clone().json().catch(() => null);
}

export function AppNotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const notifyRef = useRef<(payload: AppNotificationPayload) => void>(() => undefined);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((payload: AppNotificationPayload) => {
    const message = payload.message.trim();
    if (!message) return;

    const id = Date.now() + Math.round(Math.random() * 1000);
    setItems((current) => [
      ...current.slice(-3),
      { id, type: payload.type ?? "info", message },
    ]);
    window.setTimeout(() => remove(id), 4200);
  }, [remove]);

  notifyRef.current = notify;

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
      const shouldNotify = isMutationMethod(method) && isApiUrl(url) && !hasSilentHeader(input, init);

      try {
        const response = await originalFetch(input, init);

        if (shouldNotify) {
          void parseResponseData(response).then((data) => {
            if (!response.ok || data?.ok === false) {
              notifyRef.current({ type: "error", message: getErrorMessage(data) });
              return;
            }

            notifyRef.current({
              type: "success",
              message: String(data?.message ?? "").trim() || getSuccessMessage(method, url),
            });
          });
        }

        return response;
      } catch (error) {
        if (shouldNotify) {
          notifyRef.current({ type: "error", message: "ارتباط با سرور ناموفق بود." });
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    notify,
    success: (message) => notify({ type: "success", message }),
    error: (message) => notify({ type: "error", message }),
  }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-4 right-4 top-24 z-[80] flex flex-col items-center gap-2">
        {items.map((item) => {
          const isSuccess = item.type === "success";
          const isError = item.type === "error";
          const Icon = isSuccess ? IoCheckmarkCircleOutline : IoAlertCircleOutline;

          return (
            <div
              key={item.id}
              role={isError ? "alert" : "status"}
              className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur ${
                isSuccess
                  ? "border-success-border-nomode bg-success-base text-success-text-nomode"
                  : isError
                    ? "border-danger-border-nomode bg-danger-base text-danger-text-nomode"
                    : "border-primary-border bg-primary-card text-primary-text"
              }`}
            >
              <Icon className="shrink-0 text-xl" aria-hidden="true" />
              <span className="min-w-0 flex-1">{item.message}</span>
              <button
                type="button"
                className="flex shrink-0 items-center justify-center rounded-md p-1 transition hover:bg-primary-base/60"
                aria-label="بستن پیام"
                onClick={() => remove(item.id)}
              >
                <IoClose aria-hidden="true" />
              </button>
            </div>
          );
        })}
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
