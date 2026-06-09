import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

const hasProductModel =
  (prisma as any).product &&
  typeof (prisma as any).product.findMany === "function";

function normalizeProduct(value: Partial<ProductPayload>, index: number): ProductPayload {
  return {
    id: value.id,
    showcaseId: String(value.showcaseId ?? "default-showcase").trim(),
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

function getProductKey(product: Partial<ProductPayload>) {
  return [
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("all") === "1";

  if (!hasProductModel) {
    return NextResponse.json({ ok: true, data: [] });
  }

  try {
    const data = await (prisma as any).product.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ ok: true, data: dedupeProducts(data) });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ ok: true, data: [] });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const products = Array.isArray(body.products) ? body.products : [];
  const normalized = dedupeProducts(
    products
      .map((item: Partial<ProductPayload>, index: number) => normalizeProduct(item, index))
      .filter((item: ProductPayload) => item.title && item.description && item.price)
  );

  if (!hasProductModel) {
    return NextResponse.json({ ok: true, data: sortProducts(normalized) });
  }

  try {
    await (prisma as any).$transaction([
      (prisma as any).product.deleteMany(),
      ...(sortProducts(normalized).map((item) =>
        (prisma as any).product.create({
          data: {
            title: item.title,
            showcaseId: item.showcaseId || "default-showcase",
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
        })
      )),
    ]);

    const data = await (prisma as any).product.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ ok: true, data: sortProducts(normalized) });
  }
}
