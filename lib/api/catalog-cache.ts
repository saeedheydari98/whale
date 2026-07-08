import { publishCatalogSyncEvent } from "@/lib/api/catalog-sync";

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

type CatalogCacheState = {
  memory: Map<string, CacheEntry>;
  version: number;
};

const CATALOG_VERSION_KEY = "catalog:version";
const CATALOG_CACHE_PREFIX = "catalog";

const globalForCatalogCache = globalThis as typeof globalThis & {
  __catalogCacheState?: CatalogCacheState;
};

function getCatalogCacheState() {
  if (!globalForCatalogCache.__catalogCacheState) {
    globalForCatalogCache.__catalogCacheState = {
      memory: new Map(),
      version: 0,
    };
  }

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

async function getCatalogVersion() {
  const state = getCatalogCacheState();
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

async function buildCacheKey(scope: string, parts: unknown[]) {
  const version = await getCatalogVersion();
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

  const key = await buildCacheKey(scope, parts);
  const now = Date.now();
  const state = getCatalogCacheState();
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
      });
      return parsed;
    } catch {
      // Fall through to the loader when a stale Redis value cannot be parsed.
    }
  }

  const value = await loader();
  state.memory.set(key, {
    value,
    expiresAt: now + ttlSeconds * 1000,
  });
  await redisCommand("SET", [key, JSON.stringify(value), "EX", String(ttlSeconds)]);

  return value;
}

export async function invalidateCatalogCache(reason?: string) {
  const state = getCatalogCacheState();
  state.version += 1;
  state.memory.clear();
  await redisCommand("INCR", [CATALOG_VERSION_KEY]);
  publishCatalogSyncEvent(reason);
}

