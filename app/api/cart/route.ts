import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfilePayload = {
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  phone?: string;
};

type CartItemPayload = {
  productId?: number | string | null;
  id?: number | string | null;
  title?: string;
  description?: string;
  price?: string;
  originalPrice?: string | null;
  discountPrice?: string | null;
  discountPercent?: number | string | null;
  imageUrl?: string | null;
  quantity?: number | string;
};

function normalizeProfile(profile: ProfilePayload) {
  return {
    firstName: String(profile.firstName ?? "").trim(),
    lastName: String(profile.lastName ?? "").trim(),
    nationalId: String(profile.nationalId ?? "").trim(),
    phone: String(profile.phone ?? "").trim(),
  };
}

function isProfileComplete(profile: ReturnType<typeof normalizeProfile>) {
  return Boolean(profile.firstName && profile.lastName && profile.nationalId && profile.phone);
}

function getProductId(value: CartItemPayload) {
  const raw = value.productId ?? value.id ?? null;
  const numeric = Number(raw);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function normalizeCartItem(value: CartItemPayload) {
  return {
    productId: getProductId(value),
    title: String(value.title ?? "").trim(),
    description: String(value.description ?? "").trim(),
    price: String(value.price ?? "").trim(),
    originalPrice: value.originalPrice ? String(value.originalPrice) : null,
    discountPrice: value.discountPrice ? String(value.discountPrice) : null,
    discountPercent: Number.isFinite(Number(value.discountPercent))
      ? Math.max(0, Math.round(Number(value.discountPercent)))
      : null,
    imageUrl: value.imageUrl ? String(value.imageUrl) : null,
    quantity: Math.max(1, Math.round(Number(value.quantity ?? 1))),
  };
}

function itemKey(item: ReturnType<typeof normalizeCartItem>) {
  return String(item.productId ?? `${item.title}-${item.description}-${item.price}`);
}

function normalizeCartItems(items: CartItemPayload[]) {
  const byKey = new Map<string, ReturnType<typeof normalizeCartItem>>();

  for (const rawItem of items) {
    const item = normalizeCartItem(rawItem);
    if (!item.title || !item.price) continue;

    const key = itemKey(item);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, { ...existing, quantity: existing.quantity + item.quantity });
      continue;
    }
    byKey.set(key, item);
  }

  return Array.from(byKey.values());
}

function toClientCartItem(item: {
  id: string;
  productId: number | null;
  title: string;
  description: string;
  price: string;
  originalPrice: string | null;
  discountPrice: string | null;
  discountPercent: number | null;
  imageUrl: string | null;
  quantity: number;
}) {
  return {
    id: item.id,
    productId: item.productId,
    title: item.title,
    description: item.description,
    price: item.price,
    originalPrice: item.originalPrice ?? "",
    discountPrice: item.discountPrice ?? "",
    discountPercent: item.discountPercent ?? "",
    imageUrl: item.imageUrl ?? "",
    quantity: item.quantity,
  };
}

async function getActiveCart(profileId: string) {
  return prisma.cart.upsert({
    where: {
      profileId_status: {
        profileId,
        status: "active",
      },
    },
    update: {},
    create: {
      profileId,
      status: "active",
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function upsertProfile(profile: ReturnType<typeof normalizeProfile>) {
  return prisma.customerProfile.upsert({
    where: { nationalId: profile.nationalId },
    update: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
    },
    create: profile,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nationalId = String(url.searchParams.get("nationalId") ?? "").trim();

  if (!nationalId) {
    return NextResponse.json(
      { ok: false, error: "profile nationalId is required", data: { items: [] } },
      { status: 400 }
    );
  }

  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { nationalId },
    });

    if (!profile) {
      return NextResponse.json({ ok: true, data: { profile: null, items: [] } });
    }

    const cart = await getActiveCart(profile.id);

    return NextResponse.json({
      ok: true,
      data: {
        profile,
        items: cart.items.map(toClientCartItem),
      },
    });
  } catch (error) {
    console.error("Cart GET error:", error);
    return NextResponse.json(
      { ok: false, error: "server error", data: { items: [] } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const profile = normalizeProfile(body.profile ?? {});
  const items = normalizeCartItems(Array.isArray(body.items) ? body.items : []);

  if (!isProfileComplete(profile)) {
    return NextResponse.json(
      { ok: false, error: "complete profile is required" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const savedProfile = await tx.customerProfile.upsert({
        where: { nationalId: profile.nationalId },
        update: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
        },
        create: profile,
      });

      const cart = await tx.cart.upsert({
        where: {
          profileId_status: {
            profileId: savedProfile.id,
            status: "active",
          },
        },
        update: {},
        create: {
          profileId: savedProfile.id,
          status: "active",
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      for (const item of items) {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            title: item.title,
            description: item.description,
            price: item.price,
            originalPrice: item.originalPrice,
            discountPrice: item.discountPrice,
            discountPercent: item.discountPercent,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
          },
        });
      }

      return tx.cart.findUnique({
        where: { id: cart.id },
        include: {
          profile: true,
          items: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      ok: true,
      data: {
        profile: result?.profile ?? null,
        items: result?.items.map(toClientCartItem) ?? [],
      },
    });
  } catch (error) {
    console.error("Cart POST error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const profile = normalizeProfile(body.profile ?? {});

  if (!profile.nationalId) {
    return NextResponse.json(
      { ok: false, error: "profile nationalId is required" },
      { status: 400 }
    );
  }

  try {
    const savedProfile = await prisma.customerProfile.findUnique({
      where: { nationalId: profile.nationalId },
    });

    if (!savedProfile) {
      return NextResponse.json({ ok: true, data: { items: [] } });
    }

    const cart = await getActiveCart(savedProfile.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return NextResponse.json({ ok: true, data: { items: [] } });
  } catch (error) {
    console.error("Cart DELETE error:", error);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
