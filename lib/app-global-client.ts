"use client";

import {
  readCachedAuthUser,
  setCachedAuthUser,
  type AuthClientUser,
} from "@/lib/auth-client";
import { getCartCount, readLocalCart } from "@/lib/cart-client";
import { THEME_STATE_STORAGE_KEY } from "@/app/design-system/theme/storage";

export const APP_GLOBAL_UPDATED_EVENT = "app-global-updated";

const APP_GLOBAL_CACHE_KEY = "app-global:v1";
const APP_GLOBAL_CACHE_MS = Number.POSITIVE_INFINITY;
const APP_GLOBAL_RETRY_DELAYS_MS = [200, 700, 1500] as const;

export type AppGlobalData = {
  user: AuthClientUser | null;
  cart: {
    count: number;
  };
  theme: {
    primary: string;
    style: string;
  };
};

type CachedGlobalData = {
  at: number;
  data: AppGlobalData;
};

let memoryCache: CachedGlobalData | null = null;
let pendingGlobal: Promise<AppGlobalData> | null = null;

const fallbackGlobalData: AppGlobalData = {
  user: null,
  cart: { count: 0 },
  theme: { primary: "gray", style: "light" },
};

function normalizeTheme(
  theme: Partial<AppGlobalData["theme"]> | null | undefined,
  fallback: AppGlobalData["theme"] = fallbackGlobalData.theme
) {
  return {
    ...fallback,
    ...(theme ?? {}),
  };
}

function readStoredThemeFallback(): AppGlobalData["theme"] | null {
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

    return normalizeTheme({
      primary: typeof parsed.adminTheme?.primary === "string" ? parsed.adminTheme.primary : undefined,
      style: typeof parsed.adminTheme?.style === "string"
        ? parsed.adminTheme.style
        : typeof parsed.style === "string"
          ? parsed.style
          : undefined,
    });
  } catch {
    return null;
  }
}

function emitGlobalUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APP_GLOBAL_UPDATED_EVENT));
}

function isFresh(cached: CachedGlobalData | null) {
  return Boolean(cached && Date.now() - cached.at < APP_GLOBAL_CACHE_MS);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isApiFailure(payload: unknown) {
  return Boolean(payload && typeof payload === "object" && (payload as { ok?: unknown }).ok === false);
}

function readAnyCachedGlobalData() {
  return (memoryCache?.data ? withCurrentAuthUserFallback(memoryCache.data) : null)
    ?? readLocalGlobalCache()?.data
    ?? null;
}

function normalizeGlobalData(
  data: Partial<AppGlobalData> | null | undefined,
  options?: { themeFallback?: AppGlobalData["theme"] }
): AppGlobalData {
  const user = data?.user ?? null;
  const serverCartCount = Number(data?.cart?.count);
  const localCartCount = getCartCount(readLocalCart(null));
  return {
    user,
    cart: {
      count: user && Number.isFinite(serverCartCount) ? serverCartCount : localCartCount,
    },
    theme: normalizeTheme(data?.theme, options?.themeFallback),
  };
}

function readLocalGlobalCache() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(localStorage.getItem(APP_GLOBAL_CACHE_KEY) || "null") as CachedGlobalData | null;
    if (!parsed || typeof parsed !== "object") return null;
    const currentUser = readCachedAuthUser();
    const parsedData = parsed.data ?? fallbackGlobalData;
    return {
      at: Number(parsed.at) || 0,
      data: normalizeGlobalData({
        ...parsedData,
        user: parsedData.user ?? currentUser ?? null,
      }, {
        themeFallback: readStoredThemeFallback() ?? fallbackGlobalData.theme,
      }),
    };
  } catch {
    return null;
  }
}

function withCurrentAuthUserFallback(data: AppGlobalData) {
  const currentUser = readCachedAuthUser();
  if (!currentUser || data.user) return data;

  return normalizeGlobalData({
    ...data,
    user: currentUser,
  }, { themeFallback: data.theme });
}

function writeGlobalCache(data: AppGlobalData) {
  const cached = { at: Date.now(), data };
  memoryCache = cached;
  setCachedAuthUser(data.user, { emit: false });

  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(APP_GLOBAL_CACHE_KEY, JSON.stringify(cached));
  } catch {
  }
}

function mergeGlobalPatch(current: AppGlobalData, patch: Partial<AppGlobalData>) {
  const themeFallback = patch.theme
    ? normalizeTheme(patch.theme, current.theme)
    : current.theme;

  return normalizeGlobalData({
    ...current,
    ...patch,
    cart: {
      ...current.cart,
      ...(patch.cart ?? {}),
    },
    theme: themeFallback,
  }, { themeFallback });
}

function syncCachedAuthUserFromLocalGlobal(user: AuthClientUser | null) {
  if (user || !readCachedAuthUser()) {
    setCachedAuthUser(user, { emit: false });
  }
}

export function readCachedAppGlobal(options?: { allowStale?: boolean }) {
  if (isFresh(memoryCache)) return memoryCache?.data ? withCurrentAuthUserFallback(memoryCache.data) : fallbackGlobalData;
  const cached = readLocalGlobalCache();
  if (isFresh(cached)) {
    memoryCache = cached;
    syncCachedAuthUserFromLocalGlobal(cached?.data.user ?? null);
    return cached?.data ?? fallbackGlobalData;
  }
  if (options?.allowStale) return cached?.data ?? (memoryCache?.data ? withCurrentAuthUserFallback(memoryCache.data) : null);
  return null;
}

export async function fetchAppGlobal(options?: { force?: boolean }) {
  if (options?.force) {
    memoryCache = null;
    if (pendingGlobal) return pendingGlobal;
  } else {
    const cached = readCachedAppGlobal();
    if (cached) return cached;
    if (pendingGlobal) return pendingGlobal;
  }

  pendingGlobal = fetchAppGlobalResponse()
    .then(async (res) => {
      const payload = await res.json();
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.message || payload?.error || "Global app load failed.");
      }
      const data = normalizeGlobalData(payload?.data);
      writeGlobalCache(data);
      emitGlobalUpdated();
      return data;
    })
    .catch(() => {
      const cached = readAnyCachedGlobalData();
      const currentUser = readCachedAuthUser();
      const themeFallback = cached?.theme ?? readStoredThemeFallback() ?? fallbackGlobalData.theme;
      return normalizeGlobalData({
        ...(cached ?? fallbackGlobalData),
        user: currentUser ?? cached?.user ?? null,
        theme: themeFallback,
      }, { themeFallback });
    })
    .finally(() => {
      pendingGlobal = null;
    });

  return pendingGlobal;
}

async function fetchAppGlobalResponse() {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= APP_GLOBAL_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const res = await fetch("/api/app/global", { cache: "no-store", credentials: "same-origin" });
      const payload = await res.clone().json().catch(() => null);
      if (!res.ok || isApiFailure(payload)) {
        throw new Error(payload?.message || payload?.error || "Global app load failed.");
      }
      return res;
    } catch (error) {
      lastError = error;
      const delay = APP_GLOBAL_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await wait(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Global app load failed.");
}

export function clearAppGlobalCache() {
  memoryCache = null;
  pendingGlobal = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(APP_GLOBAL_CACHE_KEY);
    } catch {
    }
    emitGlobalUpdated();
  }
}

export function clearCachedGlobalUser() {
  const cached = readAnyCachedGlobalData();
  if (!cached) {
    setCachedAuthUser(null);
    return;
  }

  const next = normalizeGlobalData({
    ...cached,
    user: null,
    cart: { count: 0 },
  });
  writeGlobalCache(next);
  emitGlobalUpdated();
}

export function updateCachedAppGlobal(patch: Partial<AppGlobalData>) {
  const current = readAnyCachedGlobalData() ?? fallbackGlobalData;
  const next = mergeGlobalPatch(current, patch);
  writeGlobalCache(next);
  emitGlobalUpdated();
  return next;
}

export function updateCachedGlobalTheme(theme: Partial<AppGlobalData["theme"]>) {
  return updateCachedAppGlobal({
    theme: normalizeTheme(theme, readAnyCachedGlobalData()?.theme ?? fallbackGlobalData.theme),
  });
}
