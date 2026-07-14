import { publishCatalogSyncEvent } from "@/lib/api/catalog-sync";

type CacheEntry = {
  value: unknown;
  expiresAt: number;
  version: number;
};

type CatalogCacheState = {
  memory: Map<string, CacheEntry>;
  inflight: Map<string, Promise<unknown>>;
  version: number;
  versionCheckedAt: number;
};

const CATALOG_VERSION_KEY = "catalog:version";
const CATALOG_CACHE_PREFIX = "catalog";
const VERSION_REFRESH_INTERVAL_MS = 5_000;

const globalForCatalogCache = globalThis as typeof globalThis & {
  __catalogCacheState?: CatalogCacheState;
};

function getCatalogCacheState() {
  if (!globalForCatalogCache.__catalogCacheState) {
    globalForCatalogCache.__catalogCacheState = {
      memory: new Map(),
      inflight: new Map(),
      version: 0,
      versionCheckedAt: 0,
    };
  }

  const state = globalForCatalogCache.__catalogCacheState;
  state.inflight ??= new Map();
  state.versionCheckedAt ??= 0;

  return globalForCatalogCache.__catalogCacheState;
}

function getRedisConfig() {
  const url = process.env.REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return {
    url: url.replace(/\/$/, ""),
    token,
  };
}

async function redisCommand<T>(command: string, args: string[]): Promise<T | null> {
  const config = getRedisConfig();
  if (!config) return null;

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([command, ...args]),
      cache: "no-store",
    });

    if (!response.ok) return null;
    const json = await response.json();
    return json?.result as T;
  } catch {
    return null;
  }
}

async function getCatalogVersion(options?: { force?: boolean }) {
  const state = getCatalogCacheState();
  const now = Date.now();

  if (!options?.force && now - state.versionCheckedAt < VERSION_REFRESH_INTERVAL_MS) {
    return state.version;
  }

  state.versionCheckedAt = now;
  const redisVersion = await redisCommand<string | number>("GET", [CATALOG_VERSION_KEY]);
  const parsed = Number(redisVersion);

  if (Number.isFinite(parsed)) {
    state.version = parsed;
  }

  return state.version;
}

function stableCachePart(value: unknown): string {
  if (value instanceof URLSearchParams) {
    return [...value.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${key}=${item}`)
      .join("&");
  }

  if (Array.isArray(value)) return value.map(stableCachePart).join(":");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${key}=${stableCachePart(item)}`)
      .join("&");
  }

  return String(value ?? "");
}

function buildCacheKey(version: number, scope: string, parts: unknown[]) {
  const suffix = parts.map(stableCachePart).filter(Boolean).join(":");
  return `${CATALOG_CACHE_PREFIX}:v${version}:${scope}${suffix ? `:${suffix}` : ""}`;
}

export async function withCatalogCache<T>(
  scope: string,
  parts: unknown[],
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  if (ttlSeconds <= 0) return loader();

  const now = Date.now();
  const state = getCatalogCacheState();
  const localVersion = state.version;
  const localKey = buildCacheKey(localVersion, scope, parts);
  const localMemoryEntry = state.memory.get(localKey);

  if (localMemoryEntry && localMemoryEntry.expiresAt > now) {
    if (now - state.versionCheckedAt < VERSION_REFRESH_INTERVAL_MS) {
      return localMemoryEntry.value as T;
    }

    const latestVersion = await getCatalogVersion({ force: true });
    if (latestVersion === (localMemoryEntry.version ?? localVersion)) {
      return localMemoryEntry.value as T;
    }
  }

  const version = await getCatalogVersion();
  const key = buildCacheKey(version, scope, parts);
  const memoryEntry = state.memory.get(key);

  if (memoryEntry && memoryEntry.expiresAt > now) {
    return memoryEntry.value as T;
  }

  const redisValue = await redisCommand<string>("GET", [key]);
  if (redisValue) {
    try {
      const parsed = JSON.parse(redisValue) as T;
      state.memory.set(key, {
        value: parsed,
        expiresAt: now + ttlSeconds * 1000,
        version,
      });
      return parsed;
    } catch {
      // Fall through to the loader when a stale Redis value cannot be parsed.
    }
  }

  const pending = state.inflight.get(key);
  if (pending) return pending as Promise<T>;

  const task = loader()
    .then(async (value) => {
      state.memory.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
        version,
      });
      await redisCommand("SET", [key, JSON.stringify(value), "EX", String(ttlSeconds)]);
      return value;
    })
    .finally(() => {
      state.inflight.delete(key);
    });

  state.inflight.set(key, task);
  return task;
}

export async function invalidateCatalogCache(reason?: string) {
  const state = getCatalogCacheState();
  state.version += 1;
  state.versionCheckedAt = Date.now();
  state.memory.clear();
  state.inflight.clear();
  await redisCommand("INCR", [CATALOG_VERSION_KEY]);
  publishCatalogSyncEvent(reason);
}
