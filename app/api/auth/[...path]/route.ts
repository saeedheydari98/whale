import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import {
  authLoginSchema,
  authOtpRequestSchema,
  authOtpVerifySchema,
  authRegisterSchema,
  resetPasswordSchema,
  resetRequestSchema,
} from "@/lib/api/schemas";
import {
  accountEmailFromPhone,
  SUPERADMIN_PHONE,
} from "@/lib/auth-constants";
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
const SUPERADMIN_USERNAME = SUPERADMIN_PHONE;

function phoneUsername(phone: string) {
  return phone.trim();
}

function phoneEmail(phone: string) {
  return accountEmailFromPhone(phone);
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function findUserByPhone(phone: string) {
  return prisma.user.findFirst({
    where: { OR: [{ username: phone }, { email: phoneEmail(phone) }] },
    select: { id: true, email: true, username: true, name: true, role: true, avatarUrl: true },
  });
}

async function findOrCreateOtpUser(phone: string) {
  const existing = await findUserByPhone(phone);
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: phoneEmail(phone),
      username: phone,
      role: phone === SUPERADMIN_USERNAME ? "superadmin" : "user",
    },
    select: { id: true, email: true, username: true, name: true, role: true, avatarUrl: true },
  });
}

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

async function normalizeRole(user: { id: number; username: string | null; role: string }) {
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

async function getSessionUser(request: Request) {
  const accessUser = await getAuthUser(request);
  if (accessUser) return accessUser;

  const refreshToken = await getRefreshTokenFromRequest(request);
  const payload = verifyToken(refreshToken);
  const userId = Number(payload?.sub);
  if (!refreshToken || payload?.type !== "refresh" || !Number.isInteger(userId)) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, name: true, role: true, refreshTokenHash: true, avatarUrl: true },
  });
  if (!user || user.refreshTokenHash !== hashToken(refreshToken)) return null;

  await normalizeRole(user);
  await authTokens(user);
  return user;
}

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const action = (await context.params).path?.join("/") || "";
  if (action !== "me" && action !== "session") return apiFail("not found", 404);

  const user = await getSessionUser(request);
  return apiOk({ user: user ? publicUser(user) : null });
}

export async function POST(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const action = (await context.params).path?.join("/") || "";

  try {
    if (action === "register") {
      const parsed = await parseJsonBody(request, authRegisterSchema);
      if (!parsed.ok) return parsed.response;

      const phone = parsed.data.phone || parsed.data.profile?.phone || "";
      const username = parsed.data.username?.trim().toLowerCase() || (phone ? phoneUsername(phone) : null);
      const email = parsed.data.email || (phone ? phoneEmail(phone) : username ? `${username}@local.user` : "");
      const profile = parsed.data.profile;
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, ...(username ? [{ username }] : [])] },
      });
      if (existing) return apiFail("account already exists", 400);

      const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const createdUser = await tx.user.create({
          data: {
            email,
            username,
            name: parsed.data.name ?? (profile ? `${profile.firstName} ${profile.lastName}` : null),
            passwordHash: hashPassword(parsed.data.password),
            role: username === SUPERADMIN_USERNAME ? "superadmin" : "user",
          },
          select: { id: true, email: true, username: true, name: true, role: true, avatarUrl: true },
        });

        if (profile) {
          const nationalId = profile.nationalId || `user-${createdUser.id}`;
          await tx.customerProfile.upsert({
            where: { nationalId },
            update: {
              userId: createdUser.id,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email || null,
              birthDate: profile.birthDate,
              phone: profile.phone,
              address: profile.address,
            },
            create: {
              userId: createdUser.id,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email || null,
              nationalId,
              birthDate: profile.birthDate,
              phone: profile.phone,
              address: profile.address,
            },
          });
        }

        return createdUser;
      });
      const tokens = await authTokens(user);
      return apiOk({ user: publicUser(user), ...tokens }, { status: 201 });
    }

    if (action === "login") {
      const parsed = await parseJsonBody(request, authLoginSchema);
      if (!parsed.ok) return parsed.response;

      const identifier = (parsed.data.phone || parsed.data.identifier || parsed.data.username || parsed.data.email || "").trim().toLowerCase();
      const identifierEmail = /^09\d{9}$/.test(identifier) ? phoneEmail(identifier) : identifier;
      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifierEmail }, { username: identifier }] },
        select: { id: true, email: true, username: true, name: true, role: true, passwordHash: true, avatarUrl: true },
      });
      if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
        return apiFail("invalid credentials", 401);
      }
      await normalizeRole(user);
      const tokens = await authTokens(user);
      return apiOk({ user: publicUser(user), ...tokens });
    }

    if (action === "request-otp") {
      const parsed = await parseJsonBody(request, authOtpRequestSchema);
      if (!parsed.ok) return parsed.response;

      const code = createOtpCode();
      await prisma.authOtp.create({
        data: {
          phone: parsed.data.phone,
          purpose: parsed.data.purpose,
          codeHash: hashToken(code),
          expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        },
      });

      return apiOk({
        sent: true,
        developmentCode: process.env.NODE_ENV === "production" ? undefined : code,
      });
    }

    if (action === "verify-otp") {
      const parsed = await parseJsonBody(request, authOtpVerifySchema);
      if (!parsed.ok) return parsed.response;

      const otp = await prisma.authOtp.findFirst({
        where: {
          phone: parsed.data.phone,
          purpose: parsed.data.purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!otp || otp.codeHash !== hashToken(parsed.data.code)) {
        return apiFail("invalid otp", 401);
      }

      await prisma.authOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      });

      const user = await findOrCreateOtpUser(parsed.data.phone);
      await normalizeRole(user);
      if (parsed.data.purpose === "admin" && user.role !== "admin" && user.role !== "superadmin") {
        return apiFail("forbidden", 403);
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
        select: { id: true, email: true, username: true, name: true, role: true, refreshTokenHash: true, avatarUrl: true },
      });
      if (!user || user.refreshTokenHash !== hashToken(refreshToken)) return apiFail("unauthorized", 401);
      await normalizeRole(user);
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
