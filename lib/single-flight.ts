// Share the complete operation, including response parsing, across concurrent callers.
const pending = new Map<string, Promise<unknown>>();
export function singleFlight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const task = Promise.resolve().then(run).finally(() => {
    if (pending.get(key) === task) pending.delete(key);
  });
  pending.set(key, task);
  return task;
}
