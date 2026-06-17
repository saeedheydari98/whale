import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BannerPayload = {
  id?: string;
  title?: string;
  showcaseId?: string | null;
  imageUrls?: string[];
  images?: unknown;
  active?: boolean;
  sortOrder?: number | string;
};

function normalizeImages(value: BannerPayload) {
  if (Array.isArray(value.imageUrls)) {
    return value.imageUrls.map((item) => String(item)).filter(Boolean);
  }

  if (Array.isArray(value.images)) {
    return value.images.map((item) => String(item)).filter(Boolean);
  }

  return [];
}

function normalizeBanner(value: BannerPayload, index: number) {
  return {
    id: String(value.id ?? `banner-${Date.now()}-${index}`).trim(),
    title: String(value.title ?? "").trim(),
    showcaseId: value.showcaseId ? String(value.showcaseId).trim() : null,
    imageUrls: normalizeImages(value),
    active: value.active !== false,
    sortOrder: Number.isFinite(Number(value.sortOrder)) ? Number(value.sortOrder) : index + 1,
  };
}

function toClientBanner(banner: {
  id: string;
  title: string | null;
  showcaseId: string | null;
  images: Prisma.JsonValue | null;
  active: boolean;
  sortOrder: number;
}) {
  const imageUrls = Array.isArray(banner.images)
    ? banner.images.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    id: banner.id,
    title: banner.title ?? "",
    showcaseId: banner.showcaseId,
    imageUrls,
    active: banner.active,
    sortOrder: banner.sortOrder,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("all") === "1";

  try {
    const banners = await prisma.banner.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      data: { banners: banners.map(toClientBanner) },
    });
  } catch (error) {
    console.error("Banners GET error:", error);
    return NextResponse.json(
      { ok: false, error: "server error", data: { banners: [] } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const incoming: BannerPayload[] = Array.isArray(body.banners) ? body.banners : [];
  const banners = incoming
    .map((item: BannerPayload, index: number) => normalizeBanner(item, index))
    .filter((item: ReturnType<typeof normalizeBanner>) => item.imageUrls.length > 0);

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.banner.deleteMany();

      for (const banner of banners) {
        await tx.banner.create({
          data: {
            id: banner.id || undefined,
            title: banner.title || null,
            showcaseId: banner.showcaseId,
            images: banner.imageUrls.length > 0 ? banner.imageUrls : Prisma.JsonNull,
            active: banner.active,
            sortOrder: banner.sortOrder,
          },
        });
      }
    });

    const saved = await prisma.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      data: { banners: saved.map(toClientBanner) },
    });
  } catch (error) {
    console.error("Banners POST error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
