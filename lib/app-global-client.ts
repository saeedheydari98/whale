"use client";

import {
  setCachedAuthUser,
  type AuthClientUser,
} from "@/lib/auth-client";
import { getCartCount, readLocalCart } from "@/lib/cart-client";

export const APP_GLOBAL_UPDATED_EVENT = "app-global-updated";

const APP_GLOBAL_CACHE_KEY = "app-global:v1";

type AppMenuItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export type AppGlobalData = {
  site: {
    name: string;
    locale: string;
    dir: "rtl" | "ltr";
  };
  menu: AppMenuItem[];
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
  site: { name: "وال", locale: "fa-IR", dir: "rtl" },
  menu: [
    { href: "/", label: "خانه" },
    { href: "/categories", label: "دسته بندی" },
    { href: "/products", label: "ویترین" },
    { href: "/panel/user", label: "حساب کاربری" },
  ],
  user: null,
  cart: { count: 0 },
  theme: { primary: "gray", style: "light" },
};

function emitGlobalUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APP_GLOBAL_UPDATED_EVENT));
}

function isFresh(cached: CachedGlobalData | null) {
  return Boolean(cached);
}

function readAnyCachedGlobalData() {
  return memoryCache?.data ?? readLocalGlobalCache()?.data ?? null;
}

function normalizeGlobalData(data: Partial<AppGlobalData> | null | undefined): AppGlobalData {
  const user = data?.user ?? null;
  const serverCartCount = Number(data?.cart?.count);
  const localCartCount = getCartCount(readLocalCart(null));
  return {
    site: {
      ...fallbackGlobalData.site,
      ...(data?.site ?? {}),
      dir: data?.site?.dir === "ltr" ? "ltr" : "rtl",
    },
    menu: Array.isArray(data?.menu) && data.menu.length > 0 ? data.menu : fallbackGlobalData.menu,
    user,
    cart: {
      count: user && Number.isFinite(serverCartCount) ? serverCartCount : localCartCount,
    },
    theme: {
      ...fallbackGlobalData.theme,
      ...(data?.theme ?? {}),
    },
  };
}

function readLocalGlobalCache() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(localStorage.getItem(APP_GLOBAL_CACHE_KEY) || "null") as CachedGlobalData | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      at: Number(parsed.at) || 0,
      data: normalizeGlobalData(parsed.data),
    };
  } catch {
    return null;
  }
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

export function readCachedAppGlobal() {
  if (isFresh(memoryCache)) return memoryCache?.data ?? fallbackGlobalData;
  const cached = readLocalGlobalCache();
  if (isFresh(cached)) {
    memoryCache = cached;
    setCachedAuthUser(cached?.data.user ?? null, { emit: false });
    return cached?.data ?? fallbackGlobalData;
  }
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

  pendingGlobal = fetch("/api/app/global", { cache: "no-store" })
    .then(async (res) => {
      const payload = await res.json();
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.message || payload?.error || "بارگذاری اطلاعات کلی سامانه ناموفق بود.");
      }
      const data = normalizeGlobalData(payload?.data);
      writeGlobalCache(data);
      emitGlobalUpdated();
      return data;
    })
    .catch(() => {
      const data = readAnyCachedGlobalData() ?? normalizeGlobalData(fallbackGlobalData);
      setCachedAuthUser(data.user, { emit: false });
      if (!memoryCache) memoryCache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      pendingGlobal = null;
    });

  return pendingGlobal;
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
