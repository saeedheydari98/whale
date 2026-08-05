type CacheEntry = {
  data: unknown;
  at: number;
};

type FetchJsonOptions = {
  force?: boolean;
  /** Return cached data immediately and refresh in the background after this age. */
  staleMs?: number;
};

const DEFAULT_STALE_MS = 60_000;
const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, CacheEntry>();
const revalidating = new Set<string>();

function fetchFresh<T>(url: string, force: boolean): Promise<T> {
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;

  if (force) cache.delete(url);

  const task = fetch(url, {
    ...(force ? { cache: "no-store" as const } : {}),
    credentials: "same-origin",
  })
    .then(async (res) => ({
      ok: res.ok,
      data: await res.json() as T,
    }))
    .then(({ ok, data }) => {
      const apiOk = !(data && typeof data === "object" && (data as { ok?: unknown }).ok === false);
      if (ok && apiOk) {
        cache.set(url, { data, at: Date.now() });
      }
      return data;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, task);
  return task;
}

function revalidateInBackground(url: string) {
  if (revalidating.has(url) || inflight.has(url)) return;
  revalidating.add(url);
  void fetchFresh(url, true)
    .catch(() => undefined)
    .finally(() => {
      revalidating.delete(url);
    });
}

/**
 * Deduped JSON fetch: concurrent callers share one in-flight request;
 * successful responses are cached by URL for the session.
 */
export async function fetchJsonDeduped<T>(
  url: string,
  options?: FetchJsonOptions
): Promise<T> {
  const force = options?.force ?? false;
  const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;

  if (!force) {
    const pending = inflight.get(url);
    if (pending) return pending as Promise<T>;

    const cached = cache.get(url);
    if (cached) {
      if (Date.now() - cached.at >= staleMs) {
        revalidateInBackground(url);
      }
      return cached.data as T;
    }
  }

  return fetchFresh<T>(url, force);
}

export function invalidateFetchCache(urlPrefix?: string) {
  if (!urlPrefix) {
    cache.clear();
    inflight.clear();
    revalidating.clear();
    return;
  }

  for (const key of [...cache.keys()]) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(urlPrefix)) inflight.delete(key);
  }
  for (const key of [...revalidating]) {
    if (key.startsWith(urlPrefix)) revalidating.delete(key);
  }
}
