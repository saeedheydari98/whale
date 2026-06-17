import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeProfile(value: any) {
  return {
    firstName: String(value?.firstName ?? "").trim(),
    lastName: String(value?.lastName ?? "").trim(),
    nationalId: String(value?.nationalId ?? "").trim(),
    phone: String(value?.phone ?? "").trim(),
  };
}

function isComplete(profile: ReturnType<typeof normalizeProfile>) {
  return Boolean(profile.firstName && profile.lastName && profile.nationalId && profile.phone);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nationalId = String(url.searchParams.get("nationalId") ?? "").trim();

  if (!nationalId) {
    return NextResponse.json({ ok: true, data: { profile: null } });
  }

  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { nationalId },
    });
    return NextResponse.json({ ok: true, data: { profile } });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ ok: false, error: "server error", data: { profile: null } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const profile = normalizeProfile(body.profile ?? body);

  if (!isComplete(profile)) {
    return NextResponse.json({ ok: false, error: "complete profile is required" }, { status: 400 });
  }

  try {
    const saved = await prisma.customerProfile.upsert({
      where: { nationalId: profile.nationalId },
      update: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      },
      create: profile,
    });

    return NextResponse.json({ ok: true, data: { profile: saved } });
  } catch (error) {
    console.error("Profile POST error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
