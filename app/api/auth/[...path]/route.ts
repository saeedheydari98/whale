import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import {
  authLoginSchema,
  authRegisterSchema,
  resetPasswordSchema,
  resetRequestSchema,
} from "@/lib/api/schemas";
import {
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  getAuthUser,
  getRefreshTokenFromRequest,
  hashPassword,
  hashToken,
  publicUser,
  setAuthCookies,
  verifyPassword,
  verifyToken,
} from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ path?: string[] }> };

async function authTokens(user: { id: number; email: string; role: string }) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: hashToken(refreshToken) },
  });
  await setAuthCookies(accessToken, refreshToken);
  return { accessToken, refreshToken };
}

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const action = (await context.params).path?.join("/") || "";
  if (action !== "me") return apiFail("not found", 404);

  const user = await getAuthUser(request);
  if (!user) return apiFail("unauthorized", 401);
  return apiOk({ user: publicUser(user) });
}

export async function POST(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const action = (await context.params).path?.join("/") || "";

  try {
    if (action === "register") {
      const parsed = await parseJsonBody(request, authRegisterSchema);
      if (!parsed.ok) return parsed.response;

      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (existing) return apiFail("email already exists", 400);

      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      const user = await prisma.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name ?? null,
          passwordHash: hashPassword(parsed.data.password),
          role: adminCount === 0 ? "admin" : "user",
        },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true },
      });
      const tokens = await authTokens(user);
      return apiOk({ user: publicUser(user), ...tokens }, { status: 201 });
    }

    if (action === "login") {
      const parsed = await parseJsonBody(request, authLoginSchema);
      if (!parsed.ok) return parsed.response;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true, email: true, name: true, role: true, passwordHash: true, avatarUrl: true },
      });
      if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
        return apiFail("invalid credentials", 401);
      }
      const tokens = await authTokens(user);
      return apiOk({ user: publicUser(user), ...tokens });
    }

    if (action === "logout") {
      const user = await getAuthUser(request);
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null } });
      }
      await clearAuthCookies();
      return apiOk({ loggedOut: true });
    }

    if (action === "refresh-token") {
      const refreshToken = await getRefreshTokenFromRequest(request);
      const payload = verifyToken(refreshToken);
      const userId = Number(payload?.sub);
      if (!refreshToken || payload?.type !== "refresh" || !Number.isInteger(userId)) {
        return apiFail("unauthorized", 401);
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, refreshTokenHash: true, avatarUrl: true },
      });
      if (!user || user.refreshTokenHash !== hashToken(refreshToken)) return apiFail("unauthorized", 401);
      const tokens = await authTokens(user);
      return apiOk({ user: publicUser(user), ...tokens });
    }

    if (action === "forgot-password") {
      const parsed = await parseJsonBody(request, resetRequestSchema);
      if (!parsed.ok) return parsed.response;
      const token = randomBytes(32).toString("base64url");
      await prisma.user.updateMany({
        where: { email: parsed.data.email },
        data: {
          resetTokenHash: hashToken(token),
          resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      return apiOk({ resetToken: token });
    }

    if (action === "reset-password") {
      const parsed = await parseJsonBody(request, resetPasswordSchema);
      if (!parsed.ok) return parsed.response;
      const user = await prisma.user.findFirst({
        where: {
          resetTokenHash: hashToken(parsed.data.token),
          resetTokenExpiresAt: { gt: new Date() },
        },
      });
      if (!user) return apiFail("invalid reset token", 400);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(parsed.data.password),
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          refreshTokenHash: null,
        },
      });
      return apiOk({ reset: true });
    }

    return apiFail("not found", 404);
  } catch (error) {
    console.error("Auth API error:", error);
    return apiServerError();
  }
}
