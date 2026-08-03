"use client";

import {
  THEME_STATE_STORAGE_KEY,
} from "@/app/design-system/theme/storage";
import type { ThemeColorKey, ThemeStyle } from "@/app/design-system/theme/theme";

export const APP_THEME_UPDATED_EVENT = "app-theme-updated";

const APP_THEME_API_URL = "/api/theme";
const APP_THEME_ADMIN_API_URL = "/api/admin/theme";
const APP_THEME_CACHE_KEY = "app-theme:v1";
const APP_THEME_CACHE_MS = Number.POSITIVE_INFINITY;
const APP_THEME_RETRY_DELAYS_MS = [150] as const;
const APP_THEME_SOFT_TIMEOUT_MS = 1500;

const themeColors: readonly ThemeColorKey[] = ["green", "red", "blue", "yellow", "gray", "orange", "purple"];
const themeStyles: readonly ThemeStyle[] = ["light", "dark", "fantasy"];

export type AppThemeData = {
  primary: ThemeColorKey;
  style: ThemeStyle;
};

type CachedThemeData = {
  at: number;
  data: AppThemeData;
};

let memoryCache: CachedThemeData | null = null;
let pendingTheme: Promise<AppThemeData> | null = null;

export const fallbackAppTheme: AppThemeData = {
  primary: "gray",
  style: "light",
};

function isThemeStyle(value: unknown): value is ThemeStyle {
  return themeStyles.includes(value as ThemeStyle);
}

function isThemeColor(value: unknown): value is ThemeColorKey {
  return themeColors.includes(value as ThemeColorKey);
}

export function normalizeAppTheme(
  value: Partial<AppThemeData> | null | undefined,
  fallback: AppThemeData = fallbackAppTheme
): AppThemeData {
  return {
    primary: isThemeColor(value?.primary) ? value.primary : fallback.primary,
    style: isThemeStyle(value?.style) ? value.style : fallback.style,
  };
}

function emitThemeUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APP_THEME_UPDATED_EVENT));
}

function isFresh(cached: CachedThemeData | null) {
  return Boolean(cached && Date.now() - cached.at < APP_THEME_CACHE_MS);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isApiFailure(payload: unknown) {
  return Boolean(payload && typeof payload === "object" && (payload as { ok?: unknown }).ok === false);
}

function readThemePayload(payload: unknown, fallback: AppThemeData) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as { data?: { theme?: unknown } };
  return normalizeAppTheme(
    record.data?.theme && typeof record.data.theme === "object"
      ? record.data.theme as Partial<AppThemeData>
      : null,
    fallback
  );
}

function readStoredThemeFallback(): AppThemeData | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(localStorage.getItem(THEME_STATE_STORAGE_KEY) || "null") as {
      style?: unknown;
      adminTheme?: {
        primary?: unknown;
        style?: unknown;
      };
    } | null;
    if (!parsed || typeof parsed !== "object") return null;

    const primary = isThemeColor(parsed.adminTheme?.primary) ? parsed.adminTheme.primary : undefined;
    const style = isThemeStyle(parsed.adminTheme?.style)
      ? parsed.adminTheme.style
      : isThemeStyle(parsed.style)
        ? parsed.style
        : undefined;
    if (!primary && !style) return null;

    return normalizeAppTheme({ primary, style });
  } catch {
    return null;
  }
}

function readLocalThemeCache() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(localStorage.getItem(APP_THEME_CACHE_KEY) || "null") as CachedThemeData | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      at: Number(parsed.at) || 0,
      data: normalizeAppTheme(parsed.data, readStoredThemeFallback() ?? fallbackAppTheme),
    };
  } catch {
    return null;
  }
}

function readAnyCachedAppTheme() {
  return memoryCache?.data
    ?? readLocalThemeCache()?.data
    ?? readStoredThemeFallback()
    ?? null;
}

function writeThemeCache(data: AppThemeData) {
  const cached = { at: Date.now(), data };
  memoryCache = cached;

  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(APP_THEME_CACHE_KEY, JSON.stringify(cached));
  } catch {
  }
}

function fallbackFromCache() {
  return readAnyCachedAppTheme() ?? fallbackAppTheme;
}

function withSoftTimeout<T>(task: Promise<T>, ms: number, fallback: () => T | Promise<T>) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timer = new Promise<T>((resolve) => {
    timeout = setTimeout(() => {
      void Promise.resolve(fallback()).then(resolve);
    }, ms);
  });

  return Promise.race([task, timer]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export function readCachedAppTheme(options?: { allowStale?: boolean }) {
  if (isFresh(memoryCache)) return memoryCache?.data ?? fallbackAppTheme;
  const cached = readLocalThemeCache();
  if (isFresh(cached)) {
    memoryCache = cached;
    return cached?.data ?? fallbackAppTheme;
  }
  if (options?.allowStale) return cached?.data ?? memoryCache?.data ?? readStoredThemeFallback();
  return null;
}

export async function fetchAppTheme(options?: { force?: boolean; timeoutMs?: number }) {
  if (options?.force) {
    memoryCache = null;
    if (pendingTheme) return pendingTheme;
  } else {
    const cached = readCachedAppTheme();
    if (cached) return cached;
    if (pendingTheme) return pendingTheme;
  }

  const requestTask = fetchAppThemeResponse()
    .then(async (res) => {
      const payload = await res.json();
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.message || payload?.error || "Theme load failed.");
      }
      const data = readThemePayload(payload, fallbackFromCache());
      writeThemeCache(data);
      emitThemeUpdated();
      return data;
    })
    .catch(fallbackFromCache);

  pendingTheme = withSoftTimeout(requestTask, options?.timeoutMs ?? APP_THEME_SOFT_TIMEOUT_MS, fallbackFromCache)
    .finally(() => {
      pendingTheme = null;
    });

  return pendingTheme;
}

async function fetchAppThemeResponse() {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= APP_THEME_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const res = await fetch(APP_THEME_API_URL, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = await res.clone().json().catch(() => null);
      if (!res.ok || isApiFailure(payload)) {
        throw new Error(payload?.message || payload?.error || "Theme load failed.");
      }
      return res;
    } catch (error) {
      lastError = error;
      const delay = APP_THEME_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await wait(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Theme load failed.");
}

export async function saveAppTheme(theme: AppThemeData) {
  const res = await fetch(APP_THEME_ADMIN_API_URL, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(theme),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.message || payload?.error || "Theme save failed.");
  }

  const nextTheme = readThemePayload(payload, theme);
  writeThemeCache(nextTheme);
  emitThemeUpdated();
  return nextTheme;
}

export function updateCachedAppTheme(theme: Partial<AppThemeData>) {
  const current = readAnyCachedAppTheme() ?? fallbackAppTheme;
  const next = normalizeAppTheme({
    ...current,
    ...theme,
  }, current);
  writeThemeCache(next);
  emitThemeUpdated();
  return next;
}
