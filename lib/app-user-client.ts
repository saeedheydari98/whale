"use client";

import {
  readCachedAuthUser,
  setCachedAuthUser,
  type AuthClientUser,
} from "@/lib/auth-client";
import {
  getCartCount,
  hasLocalCartSnapshot,
  readLocalCart,
} from "@/lib/cart-client";
import { fetchJsonDeduped } from "@/lib/fetch-json";

export const APP_USER_UPDATED_EVENT = "app-user-updated";

const APP_USER_CACHE_KEY = "app-user:v1";
const LEGACY_APP_USER_CACHE_KEY = "app-global:v2";
const APP_USER_CACHE_MS = Number.POSITIVE_INFINITY;
const APP_USER_RETRY_DELAYS_MS = [200, 700] as const;
const APP_USER_SOFT_TIMEOUT_MS = 2500;

export type AppClientProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string;
  isAdminUnlocked: boolean;
};

export type AppClientUser = Omit<AuthClientUser, "avatarUrl" | "email" | "profile"> & {
  profile?: AppClientProfile | null;
};

export type AppUserData = {
  user: AppClientUser | null;
  cart: {
    count: number;
  };
};

type CachedUserData = {
  at: number;
  data: AppUserData;
};

type AppUserDataInput = Partial<Omit<AppUserData, "user">> & {
  user?: AuthClientUser | AppClientUser | null;
};

let memoryCache: CachedUserData | null = null;
let pendingUser: Promise<AppUserData> | null = null;

const fallbackUserData: AppUserData = {
  user: null,
  cart: { count: 0 },
};

function emitUserUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APP_USER_UPDATED_EVENT));
}

function isFresh(cached: CachedUserData | null) {
  return Boolean(cached && Date.now() - cached.at < APP_USER_CACHE_MS);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isApiFailure(payload: unknown) {
  return Boolean(payload && typeof payload === "object" && (payload as { ok?: unknown }).ok === false);
}

function normalizeAppProfile(profile: unknown): AppClientProfile | null {
  if (!profile || typeof profile !== "object") return null;
  const value = profile as Partial<AppClientProfile>;

  return {
    firstName: String(value.firstName ?? ""),
    lastName: String(value.lastName ?? ""),
    phone: String(value.phone ?? ""),
    email: value.email ? String(value.email) : null,
    address: String(value.address ?? ""),
    isAdminUnlocked: value.isAdminUnlocked === true,
  };
}

function normalizeAppUser(user: AuthClientUser | AppClientUser | null | undefined): AppClientUser | null {
  if (!user || typeof user !== "object") return null;
  const {
    avatarUrl: _avatarUrl,
    email: _email,
    profile,
    ...safeUser
  } = user as AuthClientUser & { avatarUrl?: unknown };
  return {
    ...safeUser,
    profile: normalizeAppProfile(profile),
  };
}

function resolveCartCount(
  user: AppClientUser | null,
  serverCartCount: number | undefined
) {
  const authUser = user ?? readCachedAuthUser();
  const localCartCount = getCartCount(readLocalCart(authUser));

  if (hasLocalCartSnapshot(authUser)) {
    return localCartCount;
  }

  if (user && serverCartCount !== undefined && Number.isFinite(serverCartCount)) {
    return Math.max(0, serverCartCount);
  }

  return localCartCount;
}

function normalizeUserData(data: AppUserDataInput | null | undefined): AppUserData {
  const user = normalizeAppUser(data?.user);
  const serverCartCount = Number(data?.cart?.count);

  return {
    user,
    cart: {
      count: resolveCartCount(
        user,
        Number.isFinite(serverCartCount) ? serverCartCount : undefined
      ),
    },
  };
}

export function syncCachedCartCount(user?: AppClientUser | null) {
  const current = readAnyCachedUserData() ?? fallbackUserData;
  const nextCount = resolveCartCount(
    user ?? current.user,
    current.cart.count
  );

  if (current.cart.count === nextCount) {
    return current;
  }

  return updateCachedAppUser({ cart: { count: nextCount } });
}

function withCurrentAuthUserFallback(data: AppUserData) {
  const currentUser = readCachedAuthUser();
  if (!currentUser || data.user) return data;

  return normalizeUserData({
    ...data,
    user: currentUser,
  });
}

function readLocalUserCache() {
  if (typeof window === "undefined") return null;

  try {
    const rawCache =
      localStorage.getItem(APP_USER_CACHE_KEY)
      ?? localStorage.getItem(LEGACY_APP_USER_CACHE_KEY)
      ?? "null";
    const parsed = JSON.parse(rawCache) as CachedUserData | null;
    if (!parsed || typeof parsed !== "object") return null;
    const currentUser = readCachedAuthUser();
    const parsedData = parsed.data ?? fallbackUserData;

    return {
      at: Number(parsed.at) || 0,
      data: normalizeUserData({
        ...parsedData,
        user: parsedData.user ?? currentUser ?? null,
      }),
    };
  } catch {
    return null;
  }
}

function readAnyCachedUserData() {
  return (memoryCache?.data ? withCurrentAuthUserFallback(memoryCache.data) : null)
    ?? readLocalUserCache()?.data
    ?? null;
}

function writeUserCache(data: AppUserData) {
  const cached = { at: Date.now(), data };
  memoryCache = cached;
  setCachedAuthUser(data.user, { emit: false });

  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(APP_USER_CACHE_KEY, JSON.stringify(cached));
    localStorage.removeItem(LEGACY_APP_USER_CACHE_KEY);
  } catch {
  }
}

function mergeUserPatch(current: AppUserData, patch: Partial<AppUserData>) {
  return normalizeUserData({
    ...current,
    ...patch,
    cart: {
      ...current.cart,
      ...(patch.cart ?? {}),
    },
  });
}

function syncCachedAuthUserFromLocalUser(user: AuthClientUser | null) {
  if (user || !readCachedAuthUser()) {
    setCachedAuthUser(user, { emit: false });
  }
}

function fallbackFromCache() {
  const cached = readAnyCachedUserData();
  const currentUser = readCachedAuthUser();

  return normalizeUserData({
    ...(cached ?? fallbackUserData),
    user: currentUser ?? cached?.user ?? null,
  });
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

export function readCachedAppUser(options?: { allowStale?: boolean }) {
  if (isFresh(memoryCache)) return memoryCache?.data ? withCurrentAuthUserFallback(memoryCache.data) : fallbackUserData;
  const cached = readLocalUserCache();
  if (isFresh(cached)) {
    memoryCache = cached;
    syncCachedAuthUserFromLocalUser(cached?.data.user ?? null);
    return cached?.data ?? fallbackUserData;
  }
  if (options?.allowStale) return cached?.data ?? (memoryCache?.data ? withCurrentAuthUserFallback(memoryCache.data) : null);
  return null;
}

export async function fetchAppUser(options?: { force?: boolean }) {
  const cached = readCachedAppUser({ allowStale: true });
  const cachedEntry = memoryCache ?? readLocalUserCache();
  const USER_STALE_MS = 60_000;

  if (options?.force) {
    if (pendingUser) return pendingUser;
  } else {
    if (cached) {
      if (
        cachedEntry
        && Date.now() - cachedEntry.at >= USER_STALE_MS
        && !pendingUser
      ) {
        void fetchAppUserPayload({ force: true })
          .then((payload) => {
            const data = normalizeUserData(payload?.data);
            writeUserCache(data);
            emitUserUpdated();
          })
          .catch(() => undefined);
      }
      return cached;
    }
    if (pendingUser) return pendingUser;
  }

  const requestTask = fetchAppUserPayload({ force: options?.force })
    .then((payload) => {
      const data = normalizeUserData(payload?.data);
      writeUserCache(data);
      emitUserUpdated();
      return data;
    })
    .catch(() => cached ?? fallbackFromCache());

  pendingUser = withSoftTimeout(requestTask, APP_USER_SOFT_TIMEOUT_MS, () => cached ?? fallbackFromCache())
    .finally(() => {
      pendingUser = null;
    });

  return pendingUser;
}

type AppUserApiPayload = {
  ok?: boolean;
  data?: AppUserDataInput;
  message?: string;
  error?: string;
};

async function fetchAppUserPayload(options?: { force?: boolean }) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= APP_USER_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const payload = await fetchJsonDeduped<AppUserApiPayload>("/api/app/user", {
        force: options?.force || attempt > 0,
        staleMs: APP_USER_CACHE_MS,
      });
      if (isApiFailure(payload)) {
        throw new Error(payload?.message || payload?.error || "User bootstrap load failed.");
      }
      return payload;
    } catch (error) {
      lastError = error;
      const delay = APP_USER_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await wait(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("User bootstrap load failed.");
}

export function clearAppUserCache() {
  memoryCache = null;
  pendingUser = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(APP_USER_CACHE_KEY);
      localStorage.removeItem(LEGACY_APP_USER_CACHE_KEY);
    } catch {
    }
    emitUserUpdated();
  }
}

export function clearCachedAppUser() {
  const cached = readAnyCachedUserData();
  if (!cached) {
    setCachedAuthUser(null);
    return;
  }

  const next = normalizeUserData({
    ...cached,
    user: null,
    cart: { count: 0 },
  });
  writeUserCache(next);
  emitUserUpdated();
}

export function updateCachedAppUser(patch: Partial<AppUserData>) {
  const current = readAnyCachedUserData() ?? fallbackUserData;
  const next = mergeUserPatch(current, patch);
  writeUserCache(next);
  emitUserUpdated();
  return next;
}
