import { createHmac, randomBytes, timingSafeEqual, pbkdf2Sync } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { apiFail } from "@/lib/api/response";

export type AuthUser = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  avatarUrl: string | null;
};

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";
const ACCESS_TTL_SECONDS = 60 * 15;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const SUPERADMIN_USERNAME = "saeedheydari98";

function secret() {
  return process.env.JWT_SECRET || process.env.AUTH_SECRET || "development-jwt-secret-change-me";
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(data: Record<string, unknown>, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ ...data, iat: now, exp: now + ttlSeconds }));
  const signature = createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function createAccessToken(user: Pick<AuthUser, "id" | "email" | "role">) {
  return signPayload({ sub: String(user.id), email: user.email, role: user.role }, ACCESS_TTL_SECONDS);
}

export function createRefreshToken(user: Pick<AuthUser, "id" | "email" | "role">) {
  return signPayload({ sub: String(user.id), email: user.email, role: user.role, type: "refresh" }, REFRESH_TTL_SECONDS);
}

export function verifyToken(token: string | undefined | null) {
  if (!token) return null;
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;

  const expected = createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      role?: string;
      exp?: number;
      type?: string;
    };
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("base64url");
  return `${salt}.${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [salt, hash] = stored.split(".");
  if (!salt || !hash) return false;
  const nextHash = pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("base64url");
  const given = Buffer.from(hash);
  const wanted = Buffer.from(nextHash);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export function hashToken(token: string) {
  return createHmac("sha256", secret()).update(token).digest("base64url");
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
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

async function findPublicUser(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, name: true, role: true, avatarUrl: true },
  });
  return user ? normalizeRole(user) : null;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : null;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const store = await cookies();
  const token = bearerToken(request) || store.get(ACCESS_COOKIE)?.value;
  const payload = verifyToken(token);
  const id = Number(payload?.sub);

  if (Number.isInteger(id) && id > 0) {
    return findPublicUser(id);
  }

  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  const refreshPayload = verifyToken(refreshToken);
  const refreshUserId = Number(refreshPayload?.sub);
  if (!refreshToken || refreshPayload?.type !== "refresh" || !Number.isInteger(refreshUserId) || refreshUserId <= 0) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: refreshUserId },
    select: { id: true, email: true, username: true, name: true, role: true, refreshTokenHash: true, avatarUrl: true },
  });
  if (!user || user.refreshTokenHash !== hashToken(refreshToken)) return null;

  const normalizedUser = await normalizeRole(user);
  const accessToken = createAccessToken(normalizedUser);
  const nextRefreshToken = createRefreshToken(normalizedUser);
  await prisma.user.update({
    where: { id: normalizedUser.id },
    data: { refreshTokenHash: hashToken(nextRefreshToken) },
  });
  await setAuthCookies(accessToken, nextRefreshToken);

  return {
    id: normalizedUser.id,
    email: normalizedUser.email,
    username: normalizedUser.username,
    name: normalizedUser.name,
    role: normalizedUser.role,
    avatarUrl: normalizedUser.avatarUrl,
  };
}

export async function requireUser(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return { ok: false as const, response: apiFail("unauthorized", 401) };
  return { ok: true as const, user };
}

export async function requireAdmin(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;
  if (auth.user.role !== "admin" && auth.user.role !== "superadmin") {
    return { ok: false as const, response: apiFail("forbidden", 403) };
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

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getRefreshTokenFromRequest(request: Request) {
  return bearerToken(request) || (await cookies()).get(REFRESH_COOKIE)?.value;
}
