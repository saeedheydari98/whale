import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matchesSearchQuery } from "@/lib/product-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type ProductPayload = {
  id?: number | string;
  showcaseId?: string;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  discountPrice?: string;
  discountPercent?: number | string;
  imageUrl?: string;
  badge?: string;
  ctaLabel?: string;
  ctaHref?: string;
  active: boolean;
  sortOrder: number;
};

type ShowcasePayload = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  active?: boolean;
  sortOrder?: number | string;
};

type BannerPayload = {
  id: string;
  title?: string;
  showcaseId?: string;
  imageUrls?: string[];
  images?: unknown;
  active?: boolean;
  sortOrder?: number | string;
};

type BannerRecord = {
  id: string;
  title: string | null;
  showcaseId: string | null;
  active: boolean;
  sortOrder: number;
  images: Prisma.JsonValue | null;
};

const hasProductModel =
  prisma.product && typeof prisma.product.findMany === "function";

const hasShowcaseModel =
  prisma.showcase && typeof prisma.showcase.findMany === "function";

function normalizeProduct(value: Partial<ProductPayload>, index: number): ProductPayload {
  return {
    id: value.id,
    showcaseId: String(value.showcaseId ?? "").trim(),
    title: String(value.title ?? "").trim(),
    description: String(value.description ?? "").trim(),
    price: String(value.price ?? "").trim(),
    originalPrice: String(value.originalPrice ?? "").trim(),
    discountPrice: String(value.discountPrice ?? "").trim(),
    discountPercent: Number.isFinite(Number(value.discountPercent)) ? Math.max(0, Math.round(Number(value.discountPercent))) : 0,
    imageUrl: String(value.imageUrl ?? "").trim(),
    badge: String(value.badge ?? "").trim(),
    ctaLabel: String(value.ctaLabel ?? "").trim(),
    ctaHref: String(value.ctaHref ?? "").trim(),
    active: Boolean(value.active),
    sortOrder: Number.isFinite(Number(value.sortOrder)) ? Number(value.sortOrder) : index + 1,
  };
}

function sortProducts(products: ProductPayload[]) {
  return [...products].sort((a, b) => a.sortOrder - b.sortOrder);
}

function sortByOrder<T extends { sortOrder?: number | string }>(items: T[]) {
  return [...items].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}

function getProductKey(product: Partial<ProductPayload>) {
  return [
    String(product.showcaseId ?? "").trim().toLowerCase(),
    product.title,
    product.description,
    product.price,
    product.originalPrice,
    product.discountPrice,
    product.imageUrl,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function dedupeProducts(products: ProductPayload[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = getProductKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toClientBanner(banner: BannerRecord) {
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

function buildCatalogTree(
  products: ProductPayload[],
  showcases: Array<{
    id: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    active: boolean;
    sortOrder: number;
  }>,
  banners: BannerRecord[],
  includeInactive: boolean
) {
  const visibleProducts = includeInactive
    ? products
    : products.filter((product) => product.active !== false);
  const visibleShowcases = includeInactive
    ? showcases
    : showcases.filter((showcase) => showcase.active !== false);
  const visibleBanners = includeInactive
    ? banners
    : banners.filter((banner) => banner.active !== false);

  const bannerSections = visibleBanners.map((banner) => ({
    type: "banner" as const,
    sortOrder: banner.sortOrder,
    item: toClientBanner(banner),
  }));

  const showcaseSections = visibleShowcases
    .map((showcase) => ({
      type: "showcase" as const,
      sortOrder: showcase.sortOrder,
      item: showcase,
      products: visibleProducts.filter(
        (product) => String(product.showcaseId ?? "") === showcase.id
      ),
    }))
    .filter((section) => includeInactive || section.products.length > 0);

  return {
    sections: [...bannerSections, ...showcaseSections].sort(
      (a, b) => a.sortOrder - b.sortOrder
    ),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("all") === "1";
  const id = url.searchParams.get("id") ?? null;
  const query = String(url.searchParams.get("q") ?? url.searchParams.get("search") ?? "").trim();
  const showcaseId = String(url.searchParams.get("showcaseId") ?? "").trim();
  const onlyDiscounted = url.searchParams.get("discounted") === "1";
  const priceMinParam = url.searchParams.get("priceMin");
  const priceMaxParam = url.searchParams.get("priceMax");
  const priceMin = priceMinParam ? Number(priceMinParam) : NaN;
  const priceMax = priceMaxParam ? Number(priceMaxParam) : NaN;

  const parsePrice = (value: unknown) => {
    const normalized = String(value || "").replace(/[^\d.]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  if (!hasProductModel) {
    return NextResponse.json({ ok: true, data: { products: [], showcases: [], tree: [] } });
  }

  try {
    if (id) {
      const maybeIdNum = Number(id);
      const where =
        Number.isFinite(maybeIdNum) && !Number.isNaN(maybeIdNum)
          ? { id: maybeIdNum }
          : { id: String(id) };
      const item = await prisma.product.findFirst({ where });
      if (!item) {
        return NextResponse.json({ ok: false, data: { product: null } }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: { product: item } });
    }

    const productsData = await prisma.product.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const products = dedupeProducts(productsData as ProductPayload[]).filter((product) => {
      if (showcaseId && String(product.showcaseId ?? "") !== showcaseId) return false;
      if (query && !matchesSearchQuery(product, query)) return false;
      if (onlyDiscounted) {
        const percent = Number(product.discountPercent || 0);
        if (!(percent > 0 || String(product.discountPrice || "").trim())) return false;
      }
      const productPrice = Number.isFinite(parsePrice(product.discountPrice))
        ? parsePrice(product.discountPrice)
        : parsePrice(product.price);
      if (Number.isFinite(priceMin) && Number.isFinite(productPrice) && productPrice < priceMin) return false;
      if (Number.isFinite(priceMax) && Number.isFinite(productPrice) && productPrice > priceMax) return false;
      return true;
    });

    const showcases = hasShowcaseModel
      ? await prisma.showcase.findMany({
          include: { products: true, banners: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : [];

    const banners =
      "banner" in prisma && typeof prisma.banner?.findMany === "function"
        ? await prisma.banner.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          })
        : [];
    const clientBanners = (banners as BannerRecord[]).map(toClientBanner);
    const tree = buildCatalogTree(
      products,
      showcases,
      banners as BannerRecord[],
      includeInactive
    );

    return NextResponse.json({
      ok: true,
      data: { products, showcases, banners: clientBanners, tree, search: { query, count: products.length } },
    });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ ok: false, error: "server error", data: { products: [], showcases: [], banners: [] } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const products = Array.isArray(body.products) ? body.products : [];
  const showcases = Array.isArray(body.showcases) ? (body.showcases as ShowcasePayload[]) : [];
  const banners = Array.isArray(body.banners) ? (body.banners as BannerPayload[]) : [];
  const normalized = dedupeProducts(
    products
      .map((item: Partial<ProductPayload>, index: number) => normalizeProduct(item, index))
      .filter((item: ProductPayload) => item.title && item.description && item.price)
  );

  // All products must be assigned to a showcase for consistency
  const missingShowcase = normalized.some((p) => !String(p.showcaseId ?? "").trim());
  if (missingShowcase) {
    return NextResponse.json({ ok: false, error: "showcaseId is required for every product" }, { status: 400 });
  }

  if (!hasProductModel) {
    return NextResponse.json({ ok: false, error: "product model is unavailable" }, { status: 500 });
  }

  try {
    const showcaseIds = [
      ...new Set([
        ...showcases.map((item) => String(item.id ?? "").trim()).filter(Boolean),
        ...normalized.map((item) => String(item.showcaseId ?? "").trim()).filter(Boolean),
      ]),
    ];

    const showcaseById = new Map(
      showcases
        .map((item) => [String(item.id ?? "").trim(), item] as const)
        .filter(([id]) => Boolean(id))
    );

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if ("banner" in tx && typeof tx.banner?.deleteMany === "function") {
        await tx.banner.deleteMany();
      }

      await tx.product.deleteMany();

      if (hasShowcaseModel) {
        await tx.showcase.deleteMany({
          where: {
            id: { notIn: showcaseIds },
          },
        });
      }

      for (const showcaseId of showcaseIds) {
        if (!hasShowcaseModel) continue;
        const meta = showcaseById.get(showcaseId);
        await tx.showcase.upsert({
          where: { id: showcaseId },
          update: {
            title: meta?.title ?? undefined,
            description: meta?.description ?? undefined,
            imageUrl: meta?.imageUrl ?? undefined,
            active: meta?.active ?? undefined,
            sortOrder: Number.isFinite(Number(meta?.sortOrder)) ? Number(meta?.sortOrder) : undefined,
          },
          create: {
            id: showcaseId,
            title: meta?.title ?? null,
            description: meta?.description ?? null,
            imageUrl: meta?.imageUrl ?? null,
            active: meta?.active ?? true,
            sortOrder: Number.isFinite(Number(meta?.sortOrder)) ? Number(meta?.sortOrder) : 0,
          },
        });
      }

      for (const item of sortProducts(normalized)) {
        await tx.product.create({
          data: {
            title: item.title,
            showcaseId: String(item.showcaseId ?? "").trim(),
            description: item.description,
            price: item.price,
            originalPrice: item.originalPrice || null,
            discountPrice: item.discountPrice || null,
            discountPercent: Number(item.discountPercent) || null,
            imageUrl: item.imageUrl || null,
            badge: item.badge || null,
            ctaLabel: item.ctaLabel || null,
            ctaHref: item.ctaHref || null,
            active: item.active,
            sortOrder: item.sortOrder,
          },
        });
      }

      if ("banner" in tx && typeof tx.banner?.create === "function") {
        for (const item of sortByOrder(banners)) {
          const bannerId = String(item.id ?? "").trim();
          const imageUrls = Array.isArray(item.imageUrls)
            ? item.imageUrls.map((value) => String(value)).filter(Boolean)
            : [];
          await tx.banner.create({
            data: {
              id: bannerId || undefined,
              title: item.title ?? null,
              showcaseId: item.showcaseId ? String(item.showcaseId) : null,
              images: imageUrls.length > 0 ? imageUrls : Prisma.JsonNull,
              active: item.active ?? true,
              sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : 0,
            },
          });
        }
      }
    });

    const data = await prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const savedShowcases = hasShowcaseModel
      ? await prisma.showcase.findMany({
          include: { products: true, banners: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : [];
    const savedBanners =
      "banner" in prisma && typeof prisma.banner?.findMany === "function"
        ? await prisma.banner.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          })
        : [];
    const clientBanners = (savedBanners as BannerRecord[]).map(toClientBanner);
    const tree = buildCatalogTree(
      data as ProductPayload[],
      savedShowcases,
      savedBanners as BannerRecord[],
      true
    );

    return NextResponse.json({
      ok: true,
      data: { products: data, showcases: savedShowcases, banners: clientBanners, tree },
    });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
