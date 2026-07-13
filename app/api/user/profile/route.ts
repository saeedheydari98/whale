import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser } from "@/lib/api/auth";
import { validationError } from "@/lib/api/validation";
import { profileSchema } from "@/lib/api/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isUniqueConflict(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002";
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const url = new URL(request.url);
  const nationalId = String(url.searchParams.get("nationalId") ?? "").trim();

  try {
    const authUser = await getAuthUser(request);
    const profile = authUser
      ? await prisma.customerProfile.findFirst({ where: { userId: authUser.id } })
      : nationalId
        ? await prisma.customerProfile.findUnique({ where: { nationalId } })
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
    const requestedNationalId = profile.nationalId.trim();
    const fallbackNationalId = authUser ? `user-${authUser.id}` : `guest-${profile.phone}`;
    const profileData = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email || null,
      birthDate: profile.birthDate,
      address: profile.address,
      avatarUrl: profile.avatarUrl ?? null,
      ...(profile.isAdminUnlocked !== undefined
        ? { isAdminUnlocked: profile.isAdminUnlocked }
        : {}),
    };

    const nationalOwner = requestedNationalId
      ? await prisma.customerProfile.findUnique({ where: { nationalId: requestedNationalId } })
      : null;
    const canUseRequestedNationalId = existingProfile
      ? Boolean(requestedNationalId && (!nationalOwner || nationalOwner.id === existingProfile.id))
      : Boolean(requestedNationalId && (!nationalOwner || !authUser || !nationalOwner.userId || nationalOwner.userId === authUser.id));
    const nationalId = canUseRequestedNationalId ? requestedNationalId : existingProfile?.nationalId || fallbackNationalId;

    const matchedProfile = existingProfile
      ? null
      : canUseRequestedNationalId && nationalOwner
        ? nationalOwner
        : await prisma.customerProfile.findUnique({ where: { nationalId } });
    const saveProfileRecord = async () => existingProfile
      ? prisma.customerProfile.update({
        where: { id: existingProfile.id },
        data: {
          ...profileData,
          nationalId,
        },
      })
      : matchedProfile
          ? prisma.customerProfile.update({
            where: { id: matchedProfile.id },
            data: {
              ...(authUser ? { userId: authUser.id } : {}),
              ...profileData,
            },
          })
          : prisma.customerProfile.create({
            data: {
              userId: authUser?.id ?? null,
              ...profileData,
              nationalId,
              isAdminUnlocked: profile.isAdminUnlocked ?? false,
            },
          });
    let saved: Awaited<ReturnType<typeof saveProfileRecord>>;
    try {
      saved = await saveProfileRecord();
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const safeNationalId = existingProfile?.nationalId || fallbackNationalId;
      saved = existingProfile
        ? await prisma.customerProfile.update({
          where: { id: existingProfile.id },
          data: profileData,
        })
        : await prisma.customerProfile.upsert({
          where: { nationalId: safeNationalId },
          update: {
            ...(authUser ? { userId: authUser.id } : {}),
            ...profileData,
          },
          create: {
            userId: authUser?.id ?? null,
            ...profileData,
            nationalId: safeNationalId,
            isAdminUnlocked: profile.isAdminUnlocked ?? false,
          },
        });
    }
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
