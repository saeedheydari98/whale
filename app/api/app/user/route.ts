import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser, type AuthUser } from "@/lib/api/auth";
import { validationError } from "@/lib/api/validation";
import { profileSchema } from "@/lib/api/schemas";
import { readWithRetry } from "@/lib/api/read-retry";
import { PHONE_PATTERN } from "@/lib/validation-patterns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const appUserProfileSelect = {
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  address: true,
  isAdminUnlocked: true,
} as const;

type AppUserProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string;
  isAdminUnlocked: boolean;
};

type AppUserCart = {
  items: Array<{ quantity: number }>;
};

function normalizeThemeMode(value: unknown) {
  return value === "dark" ? "dark" as const : "light" as const;
}

function appUserPayload(user: AuthUser, profile: AppUserProfile | null) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    themeMode: normalizeThemeMode(user.themeMode),
    profile,
  };
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const authUser = await readWithRetry(() => getAuthUser(request));
    const profilePromise = authUser
      ? readWithRetry<AppUserProfile | null>(() => prisma.customerProfile.findFirst({
          where: { userId: authUser.id },
          select: appUserProfileSelect,
        })).catch((error: unknown) => {
          console.error("App user profile load error:", error);
          return null;
        })
      : Promise.resolve(null);
    const cartPromise = authUser
      ? readWithRetry<AppUserCart | null>(() => prisma.cart.findFirst({
          where: { status: "active", profile: { userId: authUser.id } },
          select: { items: { select: { quantity: true } } },
        })).catch((error: unknown) => {
          console.error("App user cart load error:", error);
          return null;
        })
      : Promise.resolve(null);
    const [profile, cart] = await Promise.all([
      profilePromise,
      cartPromise,
    ]);
    const cartItems = Array.isArray(cart?.items)
      ? cart.items as Array<{ quantity: number }>
      : [];
    const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return apiOk({
      user: authUser ? appUserPayload(authUser, profile) : null,
      cart: { count },
    });
  } catch (error) {
    console.error("App user GET error:", error);
    return apiServerError();
  }
}

export async function PUT(request: Request) {
  return saveProfile(request);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);

  if (body && typeof body === "object" && "themeMode" in body) {
    return saveThemeMode(request, body.themeMode);
  }

  return saveProfile(request, body);
}

async function saveThemeMode(request: Request, value: unknown) {
  const limited = rateLimit(request);
  if (limited) return limited;
  if (value !== "light" && value !== "dark") {
    return apiFail("حالت نمایش نامعتبر است.", 400);
  }

  try {
    const authUser = await readWithRetry(() => getAuthUser(request));
    if (!authUser) return apiFail("برای ذخیره حالت نمایش باید وارد حساب شوید.", 401);

    await prisma.$executeRaw`
      UPDATE "users"
      SET "themeMode" = ${value}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${authUser.id}
    `;

    return apiOk({ themeMode: normalizeThemeMode(value) });
  } catch (error) {
    console.error("User theme mode save error:", error);
    return apiServerError();
  }
}

async function saveProfile(request: Request, requestBody?: unknown) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const [body, authUser] = await Promise.all([
      requestBody === undefined ? request.json().catch(() => null) : Promise.resolve(requestBody),
      readWithRetry(() => getAuthUser(request)),
    ]);
    const bodyValue = body && typeof body === "object" ? body as { profile?: unknown } : null;
    const parsed = profileSchema.safeParse(bodyValue?.profile ?? body);
    if (!parsed.success) {
      return validationError(parsed.error, parsed.error.issues[0]?.message ?? "اطلاعات پروفایل معتبر نیست.");
    }

    const profile = parsed.data;
    const verifiedPhone = authUser?.username && PHONE_PATTERN.test(authUser.username)
      ? authUser.username
      : profile.phone;
    const verifiedEmail = authUser?.email && !authUser.email.endsWith("@local.user")
      ? authUser.email
      : profile.email;
    const existingProfile = authUser
      ? await prisma.customerProfile.findFirst({
          where: { userId: authUser.id },
          select: { id: true },
        })
      : null;
    const profileData = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: verifiedPhone,
      email: verifiedEmail || null,
      address: profile.address,
      ...(profile.isAdminUnlocked !== undefined
        ? { isAdminUnlocked: profile.isAdminUnlocked }
        : {}),
    };

    const phoneOwner = existingProfile
      ? null
      : await prisma.customerProfile.findFirst({
          where: {
            phone: verifiedPhone,
            OR: [
              { userId: null },
              ...(authUser ? [{ userId: authUser.id }] : []),
            ],
          },
          select: { id: true },
        });
    const matchedProfile = existingProfile ?? phoneOwner;
    const saved = matchedProfile
      ? await prisma.customerProfile.update({
          where: { id: matchedProfile.id },
          data: {
            ...(authUser ? { userId: authUser.id } : {}),
            ...profileData,
          },
          select: appUserProfileSelect,
        })
      : await prisma.customerProfile.create({
          data: {
            userId: authUser?.id ?? null,
            ...profileData,
            isAdminUnlocked: profile.isAdminUnlocked ?? false,
          },
          select: appUserProfileSelect,
        });
    const fullName = `${saved.firstName} ${saved.lastName}`.trim();
    if (authUser && fullName && authUser.name !== fullName) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { name: fullName },
      });
    }

    return apiOk({
      user: authUser
        ? appUserPayload({ ...authUser, name: fullName || authUser.name }, saved)
        : { profile: saved },
    });
  } catch (error) {
    console.error("App user profile save error:", error);
    return apiServerError();
  }
}
