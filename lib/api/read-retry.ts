const DEFAULT_RETRY_DELAY_MS = 150;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readWithRetry<T>(
  load: () => Promise<T>,
  options?: { retries?: number; delayMs?: number }
): Promise<T> {
  const retries = Math.max(0, options?.retries ?? 1);
  const delayMs = Math.max(0, options?.delayMs ?? DEFAULT_RETRY_DELAY_MS);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await wait(delayMs);
    }
  }

  throw lastError;
}
