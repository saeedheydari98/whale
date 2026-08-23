import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EMAIL_PATTERN, PERSIAN_NAME_PATTERN, PHONE_PATTERN } from "@/lib/validation-patterns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeProfile(value: any) {
  return {
    firstName: String(value?.firstName ?? "").trim(),
    lastName: String(value?.lastName ?? "").trim(),
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
    PERSIAN_NAME_PATTERN.test(profile.firstName) &&
    PERSIAN_NAME_PATTERN.test(profile.lastName) &&
    PHONE_PATTERN.test(profile.phone) &&
    (!profile.email || EMAIL_PATTERN.test(profile.email)) &&
    profile.address.length >= 5
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = String(url.searchParams.get("phone") ?? "").trim();

  if (!phone) {
    return NextResponse.json({ ok: true, data: { user: { profile: null } } });
  }

  try {
    const profile = await prisma.customerProfile.findFirst({
      where: { phone },
      orderBy: { updatedAt: "desc" },
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
    const existing = await prisma.customerProfile.findFirst({
      where: { phone: profile.phone, userId: null },
      orderBy: { updatedAt: "desc" },
    });
    const saved = existing
      ? await prisma.customerProfile.update({
        where: { id: existing.id },
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          email: profile.email || null,
          address: profile.address,
          ...(includesAdminUnlocked
            ? { isAdminUnlocked: readAdminUnlocked(rawProfile) }
            : {}),
        },
      })
      : await prisma.customerProfile.create({
        data: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        email: profile.email || null,
        address: profile.address,
        isAdminUnlocked: readAdminUnlocked(rawProfile),
        },
      });

    return NextResponse.json({ ok: true, data: { user: { profile: saved } } });
  } catch (error) {
    console.error("Profile POST error:", error);
    return NextResponse.json({ ok: false, error: "خطای سرور رخ داد." }, { status: 500 });
  }
}
