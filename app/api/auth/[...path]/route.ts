import { randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import { authOtpRequestSchema, authOtpVerifySchema } from "@/lib/api/schemas";
import { isLocalAccountEmail, SUPERADMIN_PHONE } from "@/lib/auth-constants";
import {
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  getAuthUser,
  getRefreshTokenFromRequest,
  hashToken,
  publicUser,
  setAuthCookies,
  verifyHashedToken,
  verifyToken,
} from "@/lib/api/auth";
import { sendAuthOtpEmail } from "@/lib/gmail";
import { EMAIL_PATTERN, PERSIAN_NAME_PATTERN, PHONE_PATTERN } from "@/lib/validation-patterns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ path?: string[] }> };
type AuthIdentity = { phone: string; email: string };

const OTP_EXPIRES_MINUTES = 5;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

class AuthIdentityConflictError extends Error {}

function createOtpCode() {
  return String(randomInt(100_000, 1_000_000));
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

async function normalizeRole<T extends { id: number; username: string | null; role: string }>(user: T) {
  const expectedRole = user.username === SUPERADMIN_PHONE
    ? "superadmin"
    : user.role === "superadmin" ? "user" : user.role;
  if (expectedRole !== user.role) {
    user.role = expectedRole;
    await prisma.user.update({ where: { id: user.id }, data: { role: expectedRole } });
  }
  return user;
}

async function findIdentityUser(identity: AuthIdentity, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const [phoneUser, emailUser] = await Promise.all([
    tx.user.findUnique({ where: { username: identity.phone } }),
    tx.user.findUnique({ where: { email: identity.email } }),
  ]);
  if (phoneUser && emailUser && phoneUser.id !== emailUser.id) {
    throw new AuthIdentityConflictError("شماره موبایل و ایمیل متعلق به یک حساب نیستند.");
  }
  const user = phoneUser ?? emailUser;
  if (!user) return null;
  if (user.username && user.username !== identity.phone) {
    throw new AuthIdentityConflictError("شماره موبایل و ایمیل متعلق به یک حساب نیستند.");
  }
  if (!isLocalAccountEmail(user.email) && user.email !== identity.email) {
    throw new AuthIdentityConflictError("شماره موبایل و ایمیل متعلق به یک حساب نیستند.");
  }
  return user;
}

async function findOrCreateVerifiedUser(identity: AuthIdentity) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await findIdentityUser(identity, tx);
    const role = identity.phone === SUPERADMIN_PHONE
      ? "superadmin"
      : existing?.role === "superadmin" ? "user" : existing?.role ?? "user";
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { username: identity.phone, email: identity.email, role },
        })
      : await tx.user.create({ data: { username: identity.phone, email: identity.email, role } });

    const linkedProfile = await tx.customerProfile.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (linkedProfile) {
      await tx.customerProfile.update({
        where: { id: linkedProfile.id },
        data: { phone: identity.phone, email: identity.email },
      });
    } else {
      const guestProfile = await tx.customerProfile.findFirst({
        where: { userId: null, phone: identity.phone },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      if (guestProfile) {
        await tx.customerProfile.update({
          where: { id: guestProfile.id },
          data: { userId: user.id, email: identity.email },
        });
      }
    }
    return user;
  });
}

async function isProfileComplete(userId: number) {
  const profile = await prisma.customerProfile.findFirst({
    where: { userId },
    select: { firstName: true, lastName: true, phone: true, email: true, address: true },
  });
  return Boolean(
    profile
      && PERSIAN_NAME_PATTERN.test(profile.firstName.trim())
      && PERSIAN_NAME_PATTERN.test(profile.lastName.trim())
      && PHONE_PATTERN.test(profile.phone.trim())
      && EMAIL_PATTERN.test(String(profile.email ?? "").trim().toLowerCase())
      && profile.address.trim().length >= 5
  );
}

function actionRateLimit(request: Request, action: string) {
  if (action === "request-otp") return rateLimit(request, 5);
  if (action === "verify-otp") return rateLimit(request, 15);
  return rateLimit(request);
}

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const action = (await context.params).path?.join("/") || "";
  if (action !== "me" && action !== "session") return apiFail("مسیر پیدا نشد.", 404);
  const user = await getAuthUser(request);
  return apiOk({ user: user ? publicUser(user) : null });
}

export async function POST(request: Request, context: Context) {
  const action = (await context.params).path?.join("/") || "";
  const limited = actionRateLimit(request, action);
  if (limited) return limited;

  try {
    if (action === "request-otp") {
      const parsed = await parseJsonBody(request, authOtpRequestSchema);
      if (!parsed.ok) return parsed.response;
      const identity = { phone: parsed.data.phone, email: parsed.data.email };
      const cooldownStart = new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000);
      const [, latestOtp] = await Promise.all([
        findIdentityUser(identity),
        prisma.authOtp.findFirst({
          where: { ...identity, purpose: parsed.data.purpose },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      if (latestOtp && latestOtp.createdAt > cooldownStart) {
        const retryAfterSeconds = Math.max(1, Math.ceil(
          (latestOtp.createdAt.getTime() + OTP_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
        ));
        return apiFail("برای ارسال دوباره کد کمی صبر کنید.", 429, [], { retryAfterSeconds });
      }

      const code = createOtpCode();
      const otp = await prisma.authOtp.create({
        data: {
          ...identity,
          purpose: parsed.data.purpose,
          codeHash: hashToken(code),
          expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
        },
      });
      try {
        await sendAuthOtpEmail({
          email: identity.email,
          code,
          expiresInMinutes: OTP_EXPIRES_MINUTES,
        });
      } catch (error) {
        await prisma.authOtp.delete({ where: { id: otp.id } }).catch(() => undefined);
        console.error("Gmail SMTP OTP delivery error:", error);
        return apiFail("ارسال ایمیل ورود انجام نشد. تنظیمات Gmail SMTP را بررسی کنید.", 503);
      }
      await prisma.authOtp.updateMany({
        where: {
          ...identity,
          purpose: parsed.data.purpose,
          id: { not: otp.id },
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      return apiOk({
        sent: true,
        retryAfterSeconds: OTP_COOLDOWN_SECONDS,
        expiresInSeconds: OTP_EXPIRES_MINUTES * 60,
        developmentCode: process.env.AUTH_OTP_EXPOSE_CODE === "true" ? code : undefined,
      });
    }

    if (action === "verify-otp") {
      const parsed = await parseJsonBody(request, authOtpVerifySchema);
      if (!parsed.ok) return parsed.response;
      const identity = { phone: parsed.data.phone, email: parsed.data.email };
      const otp = await prisma.authOtp.findFirst({
        where: {
          ...identity,
          purpose: parsed.data.purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) {
        return apiFail("کد ورود معتبر نیست یا منقضی شده است.", 401);
      }
      if (!verifyHashedToken(parsed.data.code, otp.codeHash)) {
        const attempts = otp.attempts + 1;
        await prisma.authOtp.update({
          where: { id: otp.id },
          data: { attempts, ...(attempts >= OTP_MAX_ATTEMPTS ? { consumedAt: new Date() } : {}) },
        });
        return apiFail(
          "کد ورود معتبر نیست یا منقضی شده است.",
          401,
          [],
          { remainingAttempts: Math.max(0, OTP_MAX_ATTEMPTS - attempts) }
        );
      }

      const consumed = await prisma.authOtp.updateMany({
        where: { id: otp.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) return apiFail("این کد قبلاً استفاده شده است.", 401);

      const user = await normalizeRole(await findOrCreateVerifiedUser(identity));
      const [tokens, profileComplete] = await Promise.all([authTokens(user), isProfileComplete(user.id)]);
      return apiOk({ user: publicUser(user), profileComplete, ...tokens });
    }

    if (action === "logout") {
      const user = await getAuthUser(request);
      if (user) await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null } });
      await clearAuthCookies();
      return apiOk({ loggedOut: true });
    }

    if (action === "refresh-token") {
      const refreshToken = await getRefreshTokenFromRequest(request);
      const payload = verifyToken(refreshToken);
      const userId = Number(payload?.sub);
      if (!refreshToken || payload?.type !== "refresh" || !Number.isInteger(userId)) {
        return apiFail("برای ادامه باید وارد حساب شوید.", 401);
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
        return apiFail("برای ادامه باید وارد حساب شوید.", 401);
      }
      await normalizeRole(user);
      const tokens = await authTokens(user);
      return apiOk({ user: publicUser(user), ...tokens });
    }

    return apiFail("مسیر پیدا نشد.", 404);
  } catch (error) {
    if (error instanceof AuthIdentityConflictError) return apiFail(error.message, 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiFail("شماره موبایل یا ایمیل قبلاً به حساب دیگری متصل شده است.", 409);
    }
    console.error("Auth API error:", error);
    return apiServerError();
  }
}
