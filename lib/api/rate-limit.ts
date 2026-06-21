import { apiFail } from "@/lib/api/response";

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 100;
const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function rateLimit(request: Request, limit = DEFAULT_LIMIT) {
  const now = Date.now();
  const key = getClientKey(request);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (bucket.count >= limit) {
    return apiFail("rate limit exceeded", 403);
  }

  bucket.count += 1;
  return null;
}
