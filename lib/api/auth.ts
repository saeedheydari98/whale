import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { canAccessAdminApi, normalizeAdminPermissions } from "@/lib/admin-permissions";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { apiFail } from "@/lib/api/response";
import { SUPERADMIN_PHONE } from "@/lib/auth-constants";
import { authSecret } from "@/lib/env";

export type AuthUser = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  adminPermissions?: unknown;
  avatarUrl: string | null;
  themeMode?: string | null;
};

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";
const ACCESS_TTL_SECONDS = 60 * 15;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const SUPERADMIN_USERNAME = SUPERADMIN_PHONE;

function secret() {
  return authSecret();
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

type TokenType = "access" | "refresh";
type TokenPayload = {
  sub: string;
  type: TokenType;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  sid?: string;
  jti?: string;
};
const TOKEN_ISSUER = "whale";
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function signPayload(userId: number, type: TokenType, claims: { sid: string } | { jti: string }) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = type === "access" ? ACCESS_TTL_SECONDS : REFRESH_TTL_SECONDS;
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: String(userId), type, iss: TOKEN_ISSUER, aud: `whale:${type}`,
    ...claims, iat: now, exp: now + ttl,
  }));
  const signature = createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function createAccessToken(user: Pick<AuthUser, "id">, sessionHash: string) {
  return signPayload(user.id, "access", { sid: sessionHash });
}

export function createRefreshToken(user: Pick<AuthUser, "id">) {
  return signPayload(user.id, "refresh", { jti: randomBytes(32).toString("base64url") });
}

function verifyToken(token: string | undefined | null, type: TokenType): TokenPayload | null {
  if (!token || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

  try {
    const metadata = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    const ttl = type === "access" ? ACCESS_TTL_SECONDS : REFRESH_TTL_SECONDS;
    if (!metadata || metadata.alg !== "HS256" || metadata.typ !== "JWT" || metadata.crit !== undefined) return null;
    if (!parsed || parsed.type !== type || parsed.iss !== TOKEN_ISSUER || parsed.aud !== `whale:${type}`) return null;
    if (typeof parsed.sub !== "string" || !/^[1-9]\d*$/.test(parsed.sub) || !Number.isSafeInteger(Number(parsed.sub))) return null;
    if (!Number.isSafeInteger(parsed.iat) || !Number.isSafeInteger(parsed.exp)
      || parsed.iat > now || parsed.exp <= now || parsed.exp <= parsed.iat || parsed.exp - parsed.iat > ttl) return null;
    const sessionId = type === "access" ? parsed.sid : parsed.jti;
    if (typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId)) return null;
    return parsed as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyAccessToken(token: string | undefined | null) {
  return verifyToken(token, "access") as (TokenPayload & { sid: string }) | null;
}

export function verifyRefreshToken(token: string | undefined | null) {
  return verifyToken(token, "refresh") as (TokenPayload & { jti: string }) | null;
}

export function hashToken(token: string) {
  return createHmac("sha256", secret()).update(token).digest("base64url");
}

export function verifyHashedToken(token: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const given = Buffer.from(storedHash);
  const expected = Buffer.from(hashToken(token));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    adminPermissions: normalizeAdminPermissions(user.adminPermissions),
    avatarUrl: user.avatarUrl,
    themeMode: user.themeMode === "dark" ? "dark" : "light",
  };
}

async function normalizeRole(user: AuthUser) {
  if (user.username === SUPERADMIN_USERNAME && user.role !== "superadmin") {
    user.role = "superadmin";
    await prisma.user.update({ where: { id: user.id }, data: { role: "superadmin" } });
  }
  if (user.username !== SUPERADMIN_USERNAME && user.role === "superadmin") {
    user.role = "user";
    await prisma.user.update({ where: { id: user.id }, data: { role: "user" } });
  }
  return user;
}

async function findSessionUser(id: number) {
  const users = await prisma.$queryRaw<Array<AuthUser & { refreshTokenHash: string | null }>>`
    SELECT "id", "email", "username", "name", "role", "avatarUrl", "themeMode", "adminPermissions", "refreshTokenHash"
    FROM "users"
    WHERE "id" = ${id}
    LIMIT 1
  `;
  const user = users[0];
  if (!user) return null;

  return user;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : null;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const store = await cookies();
  const bearer = bearerToken(request);
  const payload = verifyAccessToken(request.headers.has("authorization") ? bearer : store.get(ACCESS_COOKIE)?.value);
  if (payload) {
    const user = await findSessionUser(Number(payload.sub));
    if (user?.refreshTokenHash === payload.sid) return normalizeRole(publicUser(user));
  }
  // An explicitly supplied credential must never fall back to another account's cookies.
  if (request.headers.has("authorization")) return null;

  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  const refreshPayload = verifyRefreshToken(refreshToken);
  if (!refreshToken || !refreshPayload) return null;
  const user = await findSessionUser(Number(refreshPayload.sub));
  if (!user || !verifyHashedToken(refreshToken, user.refreshTokenHash)) return null;
  const normalizedUser = await normalizeRole(publicUser(user));
  await setAccessCookie(createAccessToken(normalizedUser, hashToken(refreshToken)));
  return normalizedUser;
}

export async function revokeAuthSession(request: Request) {
  const store = await cookies();
  const bearer = bearerToken(request);
  const access = verifyAccessToken(request.headers.has("authorization") ? bearer : store.get(ACCESS_COOKIE)?.value);
  const refreshToken = request.headers.has("authorization") ? undefined : store.get(REFRESH_COOKIE)?.value;
  const refresh = verifyRefreshToken(refreshToken);
  const session = refresh && refreshToken
    ? { id: Number(refresh.sub), refreshTokenHash: hashToken(refreshToken) }
    : access ? { id: Number(access.sub), refreshTokenHash: access.sid } : null;
  // A delayed logout cannot revoke a newer login/refresh session.
  if (session) {
    await prisma.$transaction(async tx => {
      const revoked = await tx.user.updateMany({ where: session, data: { refreshTokenHash: null } });
      if (revoked.count) await tx.pushSubscription.deleteMany({ where: { userId: session.id } });
    });
  }
  await clearAuthCookies();
}

export async function requireUser(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return { ok: false as const, response: apiFail("برای ادامه باید وارد حساب شوید.", 401) };
  return { ok: true as const, user };
}

export async function requireAdmin(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;
  if (auth.user.role !== "admin" && auth.user.role !== "superadmin") {
    return { ok: false as const, response: apiFail("دسترسی شما برای این بخش کافی نیست.", 403) };
  }
  if (!canAccessAdminApi(auth.user, new URL(request.url), request.method)) {
    return { ok: false as const, response: apiFail("دسترسی این بخش برای شما فعال نیست.", 403) };
  }
  return auth;
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
}

export async function setAccessCookie(accessToken: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getRefreshTokenFromRequest(request: Request) {
  return request.headers.has("authorization")
    ? bearerToken(request)
    : (await cookies()).get(REFRESH_COOKIE)?.value;
}
