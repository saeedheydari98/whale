import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidPastPersianDate, normalizePersianDate } from "@/lib/persian-date";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeProfile(value: any) {
  return {
    firstName: String(value?.firstName ?? "").trim(),
    lastName: String(value?.lastName ?? "").trim(),
    nationalId: String(value?.nationalId ?? "").trim(),
    birthDate: normalizePersianDate(String(value?.birthDate ?? "")),
    phone: String(value?.phone ?? "").trim(),
    email: String(value?.email ?? "").trim().toLowerCase(),
    address: String(value?.address ?? "").trim(),
  };
}

function readAdminUnlocked(value: any) {
  return value?.isAdminUnlocked === true;
}

function isComplete(profile: ReturnType<typeof normalizeProfile>) {
  return Boolean(
    profile.firstName &&
    profile.lastName &&
    (!profile.nationalId || /^\d{10}$/.test(profile.nationalId)) &&
    (!profile.birthDate || isValidPastPersianDate(profile.birthDate)) &&
    profile.phone &&
    profile.address
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nationalId = String(url.searchParams.get("nationalId") ?? "").trim();

  if (!nationalId) {
    return NextResponse.json({ ok: true, data: { user: { profile: null } } });
  }

  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { nationalId },
    });
    return NextResponse.json({ ok: true, data: { user: { profile } } });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ ok: false, error: "خطای سرور رخ داد.", data: { user: { profile: null } } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawProfile = body.profile ?? body;
  const profile = normalizeProfile(rawProfile);
  const includesAdminUnlocked = typeof rawProfile?.isAdminUnlocked === "boolean";

  if (!isComplete(profile)) {
    return NextResponse.json({ ok: false, error: "برای ادامه باید پروفایل را کامل کنید." }, { status: 400 });
  }

  try {
    const nationalId = profile.nationalId || `guest-${profile.phone}`;
    const saved = await prisma.customerProfile.upsert({
      where: { nationalId },
      update: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        birthDate: profile.birthDate,
        phone: profile.phone,
        email: profile.email || null,
        address: profile.address,
        ...(includesAdminUnlocked
          ? { isAdminUnlocked: readAdminUnlocked(rawProfile) }
          : {}),
      },
      create: {
        ...profile,
        nationalId,
        isAdminUnlocked: readAdminUnlocked(rawProfile),
      },
    });

    return NextResponse.json({ ok: true, data: { user: { profile: saved } } });
  } catch (error) {
    console.error("Profile POST error:", error);
    return NextResponse.json({ ok: false, error: "خطای سرور رخ داد." }, { status: 500 });
  }
}
