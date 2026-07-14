import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BannerPayload = {
  id?: string;
  title?: string;
  showcaseId?: string | null;
  imageUrls?: string[];
  images?: unknown;
  active?: boolean;
  showOnHome?: boolean;
  showOnShowcase?: boolean;
  showOnCategories?: boolean;
  showOnProducts?: boolean;
  homeSortOrder?: number | string;
  showcaseSortOrder?: number | string;
  categorySortOrder?: number | string;
  productSortOrder?: number | string;
  sortOrder?: number | string;
  intervalSeconds?: number | string;
  heightPercent?: number | string;
};

function normalizeImages(value: BannerPayload) {
  if (Array.isArray(value.imageUrls)) {
    return value.imageUrls.map((item) => String(item)).filter(Boolean);
  }

  if (Array.isArray(value.images)) {
    return value.images.map((item) => String(item)).filter(Boolean);
  }

  const imageMeta = readImageMeta(value.images);
  const urls = Array.isArray(imageMeta.urls) ? imageMeta.urls : imageMeta.imageUrls;
  if (Array.isArray(urls)) {
    return urls.map((item) => String(item)).filter(Boolean);
  }

  return [];
}

function readImageMeta(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Partial<BannerPayload> & { urls?: unknown; imageUrls?: unknown };
}

function normalizeBanner(value: BannerPayload, index: number) {
  const imageMeta = readImageMeta(value.images);
  const sortOrder = Number.isFinite(Number(value.sortOrder)) ? Number(value.sortOrder) : index + 1;
  const homeSortOrder = Number.isFinite(Number(value.homeSortOrder ?? imageMeta.homeSortOrder)) ? Number(value.homeSortOrder ?? imageMeta.homeSortOrder) : sortOrder;
  const showcaseSortOrder = Number.isFinite(Number(value.showcaseSortOrder ?? imageMeta.showcaseSortOrder)) ? Number(value.showcaseSortOrder ?? imageMeta.showcaseSortOrder) : sortOrder;
  return {
    id: String(value.id ?? `banner-${Date.now()}-${index}`).trim(),
    title: String(value.title ?? "").trim(),
    showcaseId: value.showcaseId ? String(value.showcaseId).trim() : null,
    imageUrls: normalizeImages(value),
    active: value.active !== false,
    showOnHome: (value.showOnHome ?? imageMeta.showOnHome) !== false,
    showOnShowcase: (value.showOnShowcase ?? imageMeta.showOnShowcase) === true,
    showOnCategories: (value.showOnCategories ?? imageMeta.showOnCategories) === true,
    showOnProducts: (value.showOnProducts ?? imageMeta.showOnProducts) === true,
    homeSortOrder,
    showcaseSortOrder,
    categorySortOrder: Number.isFinite(Number(value.categorySortOrder ?? imageMeta.categorySortOrder)) ? Number(value.categorySortOrder ?? imageMeta.categorySortOrder) : homeSortOrder,
    productSortOrder: Number.isFinite(Number(value.productSortOrder ?? imageMeta.productSortOrder)) ? Number(value.productSortOrder ?? imageMeta.productSortOrder) : showcaseSortOrder,
    sortOrder,
    intervalSeconds: Number.isFinite(Number(value.intervalSeconds)) ? Math.max(1, Math.round(Number(value.intervalSeconds))) : 5,
    heightPercent: Number.isFinite(Number(value.heightPercent)) ? Math.max(10, Math.min(100, Math.round(Number(value.heightPercent)))) : 28,
  };
}

function toClientBanner(banner: {
  id: string;
  title: string | null;
  showcaseId: string | null;
  images: Prisma.JsonValue | null;
  active: boolean;
  sortOrder: number;
  intervalSeconds: number;
  heightPercent: number;
}) {
  const meta = readImageMeta(banner.images);
  const urls = Array.isArray(meta.urls) ? meta.urls : meta.imageUrls;
  const imageUrls = Array.isArray(banner.images)
    ? banner.images.map((item) => String(item)).filter(Boolean)
    : Array.isArray(urls)
      ? urls.map((item) => String(item)).filter(Boolean)
      : [];

  return {
    id: banner.id,
    title: banner.title ?? "",
    showcaseId: banner.showcaseId,
    imageUrls,
    active: banner.active,
    showOnHome: typeof meta.showOnHome === "boolean" ? meta.showOnHome : true,
    showOnShowcase: meta.showOnShowcase === true,
    showOnCategories: meta.showOnCategories === true,
    showOnProducts: meta.showOnProducts === true,
    homeSortOrder: Number.isFinite(Number(meta.homeSortOrder)) ? Number(meta.homeSortOrder) : banner.sortOrder,
    showcaseSortOrder: Number.isFinite(Number(meta.showcaseSortOrder)) ? Number(meta.showcaseSortOrder) : banner.sortOrder,
    categorySortOrder: Number.isFinite(Number(meta.categorySortOrder)) ? Number(meta.categorySortOrder) : banner.sortOrder,
    productSortOrder: Number.isFinite(Number(meta.productSortOrder)) ? Number(meta.productSortOrder) : banner.sortOrder,
    sortOrder: banner.sortOrder,
    intervalSeconds: banner.intervalSeconds,
    heightPercent: banner.heightPercent,
  };
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

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
      { ok: false, error: "خطای سرور رخ داد.", data: { banners: [] } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

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
            images: banner.imageUrls.length > 0
              ? {
                  urls: banner.imageUrls,
                  showOnHome: banner.showOnHome,
                  showOnShowcase: banner.showOnShowcase,
                  showOnCategories: banner.showOnCategories,
                  showOnProducts: banner.showOnProducts,
                  homeSortOrder: banner.homeSortOrder,
                  showcaseSortOrder: banner.showcaseSortOrder,
                  categorySortOrder: banner.categorySortOrder,
                  productSortOrder: banner.productSortOrder,
                }
              : Prisma.JsonNull,
            active: banner.active,
            sortOrder: banner.sortOrder,
            intervalSeconds: banner.intervalSeconds,
            heightPercent: banner.heightPercent,
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
    return NextResponse.json({ ok: false, error: "خطای سرور رخ داد." }, { status: 500 });
  }
}
