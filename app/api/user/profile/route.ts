import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser } from "@/lib/api/auth";
import { validationError } from "@/lib/api/validation";
import { profileSchema } from "@/lib/api/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const authUser = await getAuthUser(request);
    const profile = authUser
      ? await prisma.customerProfile.findFirst({ where: { userId: authUser.id } })
      : null;

    return apiOk({
      user: authUser
        ? {
            id: authUser.id,
            email: authUser.email,
            username: authUser.username,
            name: authUser.name,
            role: authUser.role,
            profile,
          }
        : { profile },
    });
  } catch (error) {
    console.error("User profile GET error:", error);
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
      ? await prisma.customerProfile.findFirst({ where: { userId: authUser.id } })
      : null;
    const profileData = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email || null,
      address: profile.address,
      avatarUrl: profile.avatarUrl ?? null,
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
      });
    const matchedProfile = existingProfile ?? phoneOwner;
    const saved = matchedProfile
      ? await prisma.customerProfile.update({
        where: { id: matchedProfile.id },
        data: {
          ...(authUser ? { userId: authUser.id } : {}),
          ...profileData,
        },
      })
      : await prisma.customerProfile.create({
        data: {
          userId: authUser?.id ?? null,
          ...profileData,
          isAdminUnlocked: profile.isAdminUnlocked ?? false,
        },
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
        ? {
            id: authUser.id,
            email: authUser.email,
            username: authUser.username,
            name: fullName || authUser.name,
            role: authUser.role,
            profile: saved,
          }
        : { profile: saved },
    });
  } catch (error) {
    console.error("User profile save error:", error);
    return apiServerError();
  }
}
