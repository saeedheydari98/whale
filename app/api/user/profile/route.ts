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
    const saved = await prisma.customerProfile.upsert({
      where: { nationalId: profile.nationalId },
      update: {
        ...(authUser ? { userId: authUser.id } : {}),
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        birthDate: profile.birthDate,
        address: profile.address,
        avatarUrl: profile.avatarUrl ?? null,
        ...(profile.themeMode ? { themeMode: profile.themeMode } : {}),
        ...(profile.isAdminUnlocked !== undefined
          ? { isAdminUnlocked: profile.isAdminUnlocked }
          : {}),
      },
      create: {
        userId: authUser?.id ?? null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        nationalId: profile.nationalId,
        birthDate: profile.birthDate,
        phone: profile.phone,
        address: profile.address,
        avatarUrl: profile.avatarUrl ?? null,
        themeMode: profile.themeMode ?? "light",
        isAdminUnlocked: profile.isAdminUnlocked ?? false,
      },
    });
    return apiOk({
      user: authUser
        ? {
            id: authUser.id,
            email: authUser.email,
            username: authUser.username,
            name: authUser.name,
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
