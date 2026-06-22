import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser } from "@/lib/api/auth";
import { cartItemDto, getOrCreateActiveCart } from "@/lib/api/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfilePayload = {
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  phone?: string;
  isAdminUnlocked?: boolean;
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
  selectedColor?: string | null;
  quantity?: number | string;
};

function normalizeProfile(value: ProfilePayload) {
  return {
    firstName: String(value.firstName ?? "").trim(),
    lastName: String(value.lastName ?? "").trim(),
    nationalId: String(value.nationalId ?? "").trim(),
    phone: String(value.phone ?? "").trim(),
    isAdminUnlocked: value.isAdminUnlocked === true,
  };
}

function isProfileComplete(profile: ReturnType<typeof normalizeProfile>) {
  return Boolean(profile.firstName && profile.lastName && profile.nationalId && profile.phone);
}

function normalizeCartItem(value: CartItemPayload) {
  const productId = Number(value.productId ?? value.id);
  return {
    productId: Number.isInteger(productId) && productId > 0 ? productId : null,
    title: String(value.title ?? "").trim(),
    description: String(value.description ?? "").trim(),
    price: String(value.price ?? "").trim(),
    originalPrice: value.originalPrice ? String(value.originalPrice) : null,
    discountPrice: value.discountPrice ? String(value.discountPrice) : null,
    discountPercent: Number.isFinite(Number(value.discountPercent))
      ? Math.max(0, Math.round(Number(value.discountPercent)))
      : null,
    imageUrl: value.imageUrl ? String(value.imageUrl) : null,
    selectedColor: value.selectedColor ? String(value.selectedColor).trim() : null,
    quantity: Math.max(1, Math.round(Number(value.quantity ?? 1))),
  };
}

function normalizeColorStock(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      Math.max(0, Math.round(Number(val) || 0)),
    ])
  );
}

function readPriceNumber(value?: string | null) {
  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function findLegacyProfile(request: Request, bodyProfile?: ProfilePayload) {
  const authUser = await getAuthUser(request);
  if (authUser) return prisma.customerProfile.findFirst({ where: { userId: authUser.id } });

  const url = new URL(request.url);
  const nationalId = String(bodyProfile?.nationalId ?? url.searchParams.get("nationalId") ?? "").trim();
  if (!nationalId) return null;
  return prisma.customerProfile.findUnique({ where: { nationalId } });
}

async function upsertLegacyProfile(request: Request, profile: ReturnType<typeof normalizeProfile>) {
  const authUser = await getAuthUser(request);
  return prisma.customerProfile.upsert({
    where: { nationalId: profile.nationalId },
    update: {
      ...(authUser ? { userId: authUser.id } : {}),
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      isAdminUnlocked: profile.isAdminUnlocked,
    },
    create: {
      userId: authUser?.id ?? null,
      firstName: profile.firstName,
      lastName: profile.lastName,
      nationalId: profile.nationalId,
      phone: profile.phone,
      isAdminUnlocked: profile.isAdminUnlocked,
    },
  });
}

async function activeCartForProfile(profileId: string) {
  return prisma.cart.upsert({
    where: { profileId_status: { profileId, status: "active" } },
    update: {},
    create: { profileId, status: "active" },
    include: { profile: true, items: { orderBy: { createdAt: "asc" } } },
  });
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const authUser = await getAuthUser(request);
    const cart = authUser
      ? await getOrCreateActiveCart(authUser.id)
      : await findLegacyProfile(request).then((profile) =>
          profile ? activeCartForProfile(profile.id) : null
        );

    return apiOk({
      user: { profile: cart?.profile ?? null },
      cart: { items: cart?.items.map(cartItemDto) ?? [] },
    });
  } catch (error) {
    console.error("Cart GET error:", error);
    return apiServerError();
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const profile = normalizeProfile(body.profile ?? {});
  const items = Array.isArray(body.items) ? body.items.map(normalizeCartItem) : [];
  if (!isProfileComplete(profile)) return apiFail("complete profile is required", 400);

  try {
    const savedProfile = await upsertLegacyProfile(request, profile);
    const cart = await activeCartForProfile(savedProfile.id);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      for (const item of items) {
        if (!item.title || !item.price) continue;
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
            selectedColor: item.selectedColor,
            quantity: item.quantity,
          },
        });
      }
    });

    const savedCart = await activeCartForProfile(savedProfile.id);
    return apiOk({
      user: { profile: savedCart.profile },
      cart: { items: savedCart.items.map(cartItemDto) },
    });
  } catch (error) {
    console.error("Cart POST error:", error);
    return apiServerError();
  }
}

export async function PATCH(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const profile = await findLegacyProfile(request, body.profile ?? {});
  if (!profile) return apiFail("profile not found", 404);

  try {
    const cart = await activeCartForProfile(profile.id);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const authUser = await getAuthUser(request);
      let total = 0;
      const order = authUser
        ? await tx.order.create({
            data: {
              userId: authUser.id,
              profileId: profile.id,
              status: "paid",
              total: "0",
            },
          })
        : null;

      for (const item of cart.items) {
        total += readPriceNumber(item.discountPrice || item.price) * item.quantity;
        if (order) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              title: item.title,
              description: item.description,
              price: item.price,
              originalPrice: item.originalPrice,
              discountPrice: item.discountPrice,
              discountPercent: item.discountPercent,
              imageUrl: item.imageUrl,
              selectedColor: item.selectedColor,
              quantity: item.quantity,
            },
          });
        }
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`${item.title} is out of stock`);
        }
        const colorStock = normalizeColorStock(product.colorStock);
        if (item.selectedColor) {
          if ((colorStock[item.selectedColor] ?? 0) < item.quantity) {
            throw new Error(`${item.title} ${item.selectedColor} is out of stock`);
          }
          colorStock[item.selectedColor] -= item.quantity;
        }
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: product.stockQuantity - item.quantity,
            salesCount: { increment: item.quantity },
            colorStock: Object.keys(colorStock).length > 0 ? colorStock : Prisma.JsonNull,
          },
        });
      }
      if (order) await tx.order.update({ where: { id: order.id }, data: { total: String(total) } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    });

    return apiOk({ user: { profile }, cart: { items: [] } });
  } catch (error) {
    console.error("Cart checkout error:", error);
    return apiServerError(error instanceof Error ? error.message : "server error");
  }
}

export async function DELETE(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const profile = await findLegacyProfile(request, body.profile ?? {});
  if (!profile) return apiOk({ user: { profile: null }, cart: { items: [] } });

  try {
    const cart = await activeCartForProfile(profile.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return apiOk({ user: { profile }, cart: { items: [] } });
  } catch (error) {
    console.error("Cart DELETE error:", error);
    return apiServerError();
  }
}
