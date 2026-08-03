import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser, type AuthUser } from "@/lib/api/auth";
import { validationError } from "@/lib/api/validation";
import { profileSchema } from "@/lib/api/schemas";

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

function appUserPayload(user: AuthUser, profile: AppUserProfile | null) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    profile,
  };
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const authUser = await getAuthUser(request);
    const profilePromise = authUser
      ? prisma.customerProfile.findFirst({
          where: { userId: authUser.id },
          select: appUserProfileSelect,
        })
      : Promise.resolve(null);
    const cartPromise = authUser
      ? prisma.cart.findFirst({
          where: { status: "active", profile: { userId: authUser.id } },
          select: { items: { select: { quantity: true } } },
        })
      : Promise.resolve(null);
    const [profile, cart] = await Promise.all([profilePromise, cartPromise]);
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
  return saveProfile(request);
}

async function saveProfile(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const [body, authUser] = await Promise.all([
    request.json().catch(() => null),
    getAuthUser(request),
  ]);
  const parsed = profileSchema.safeParse(body?.profile ?? body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const profile = parsed.data;
    const existingProfile = authUser
      ? await prisma.customerProfile.findFirst({
          where: { userId: authUser.id },
          select: { id: true },
        })
      : null;
    const profileData = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email || null,
      address: profile.address,
      ...(profile.isAdminUnlocked !== undefined
        ? { isAdminUnlocked: profile.isAdminUnlocked }
        : {}),
    };

    const phoneOwner = existingProfile
      ? null
      : await prisma.customerProfile.findFirst({
          where: {
            phone: profile.phone,
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
