import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProductPayload = {
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

const hasShowcaseModel =
  prisma.showcase && typeof prisma.showcase.findMany === "function";

function dedupeProducts(products: ProductPayload[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = [String(product.showcaseId ?? "").trim().toLowerCase(), product.title, product.description, product.price]
      .map((v) => String(v ?? "").trim().toLowerCase())
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("all") === "1";
  const id = url.searchParams.get("id") ?? null;

  if (!hasShowcaseModel) {
    return NextResponse.json({ ok: true, data: id ? { showcase: null } : { showcases: [] } });
  }

  try {
    if (id) {
      const showcase = await prisma.showcase.findUnique({
        where: { id: String(id) },
        include: {
          products: {
            where: includeInactive ? undefined : { active: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          },
          banners: true,
        },
      });
      return NextResponse.json({ ok: true, data: { showcase: showcase ?? null } });
    }

    const showcases = await prisma.showcase.findMany({
      include: {
        products: {
          where: includeInactive ? undefined : { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        },
        banners: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ ok: true, data: { showcases } });
  } catch (error) {
    console.error("Showcases GET error:", error);
    return NextResponse.json({ ok: false, error: "server error", data: { showcases: [] } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const incoming = body.showcase ?? body;

  if (!incoming || !incoming.id && !incoming.title) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  try {
    // upsert showcase by id (if id provided) or create new
    const showcaseId = incoming.id ?? undefined;

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const sc = showcaseId
        ? await tx.showcase.upsert({
            where: { id: showcaseId },
            update: {
              title: incoming.title,
              description: incoming.description ?? null,
              imageUrl: incoming.imageUrl ?? null,
              active: incoming.active ?? true,
              sortOrder: Number.isFinite(Number(incoming.sortOrder)) ? Number(incoming.sortOrder) : 0,
            },
            create: {
              id: showcaseId,
              title: incoming.title,
              description: incoming.description ?? null,
              imageUrl: incoming.imageUrl ?? null,
              active: incoming.active ?? true,
              sortOrder: Number.isFinite(Number(incoming.sortOrder)) ? Number(incoming.sortOrder) : 0,
            },
          })
        : await tx.showcase.create({
            data: {
              title: incoming.title,
              description: incoming.description ?? null,
              imageUrl: incoming.imageUrl ?? null,
              active: incoming.active ?? true,
              sortOrder: Number.isFinite(Number(incoming.sortOrder)) ? Number(incoming.sortOrder) : 0,
            },
          });

      // replace products for this showcase (delete then create)
      if (Array.isArray(incoming.products)) {
        await tx.product.deleteMany({ where: { showcaseId: sc.id } });
        for (const p of incoming.products) {
          await tx.product.create({ data: { title: p.title ?? "", description: p.description ?? "", price: p.price ?? "", showcaseId: sc.id, originalPrice: p.originalPrice ?? null, discountPrice: p.discountPrice ?? null, discountPercent: p.discountPercent ?? null, imageUrl: p.imageUrl ?? null, badge: p.badge ?? null, ctaLabel: p.ctaLabel ?? null, ctaHref: p.ctaHref ?? null, active: p.active ?? true, sortOrder: p.sortOrder ?? 0 } });
        }
      }

      // replace banners
      if (Array.isArray(incoming.banners)) {
        await tx.banner.deleteMany({ where: { showcaseId: sc.id } });
        for (const b of incoming.banners) {
          await tx.banner.create({
            data: {
              id: b.id ? String(b.id) : undefined,
              title: b.title ?? null,
              showcaseId: sc.id,
              images: b.imageUrls ?? b.images ?? undefined,
              active: b.active ?? true,
              sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
            },
          });
        }
      }

      return sc;
    });

    return NextResponse.json({ ok: true, data: { showcase: result } });
  } catch (error) {
    console.error("Showcases POST error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
