type CacheEntry = {
  data: unknown;
  at: number;
};

const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, CacheEntry>();

/**
 * Deduped JSON fetch: concurrent callers share one in-flight request;
 * successful responses are cached by URL for the session.
 */
export async function fetchJsonDeduped<T>(
  url: string,
  options?: { force?: boolean }
): Promise<T> {
  const force = options?.force ?? false;

  if (!force) {
    const cached = cache.get(url);
    if (cached) return cached.data as T;

    const pending = inflight.get(url);
    if (pending) return pending as Promise<T>;
  } else {
    cache.delete(url);
  }

  const task = fetch(url, force ? { cache: "no-store" } : undefined)
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

export function invalidateFetchCache(urlPrefix?: string) {
  if (!urlPrefix) {
    cache.clear();
    inflight.clear();
    return;
  }

  for (const key of [...cache.keys()]) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(urlPrefix)) inflight.delete(key);
  }
}
