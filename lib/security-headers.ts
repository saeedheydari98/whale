function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function securityHeaders() {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss: http: ws:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    isProduction() ? "upgrade-insecure-requests" : "",
  ].filter(Boolean).join("; ");

  const headers: Record<string, string> = {
    "Content-Security-Policy": csp,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "X-DNS-Prefetch-Control": "off",
  };

  if (isProduction()) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

export function securityHeaderList() {
  return Object.entries(securityHeaders()).map(([key, value]) => ({ key, value }));
}
