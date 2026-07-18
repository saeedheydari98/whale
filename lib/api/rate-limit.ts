import { apiFail } from "@/lib/api/response";

const WINDOW_MS = 60_000;
const DEFAULT_READ_LIMIT = 240;
const DEFAULT_WRITE_LIMIT = 80;
const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request) {
  const url = new URL(request.url);
  const client =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";

  return `${client}:${request.method}:${url.pathname}`;
}

export function rateLimit(
  request: Request,
  limit = request.method === "GET" ? DEFAULT_READ_LIMIT : DEFAULT_WRITE_LIMIT
) {
  const now = Date.now();
  const key = getClientKey(request);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (bucket.count >= limit) {
    return apiFail("rate limit exceeded", 429);
  }

  bucket.count += 1;
  return null;
}
