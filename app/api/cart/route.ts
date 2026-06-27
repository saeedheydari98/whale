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
  birthDate?: string;
  phone?: string;
  address?: string;
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

type CheckoutCartItem = {
  productId: number | null;
  title: string;
  description: string;
  price: string;
  originalPrice: string | null;
  discountPrice: string | null;
  discountPercent: number | null;
  imageUrl: string | null;
  selectedColor: string | null;
  quantity: number;
};

type ProductUpdatePlan = {
  productId: number;
  stockQuantity: number;
  quantity: number;
  colorStock: Record<string, number>;
};

function normalizeProfile(value: ProfilePayload) {
  return {
    firstName: String(value.firstName ?? "").trim(),
    lastName: String(value.lastName ?? "").trim(),
    nationalId: String(value.nationalId ?? "").trim(),
    birthDate: String(value.birthDate ?? "").trim(),
    phone: String(value.phone ?? "").trim(),
    address: String(value.address ?? "").trim(),
    isAdminUnlocked: value.isAdminUnlocked === true,
  };
}

function isProfileComplete(profile: ReturnType<typeof normalizeProfile>) {
  return Boolean(profile.firstName && profile.lastName && profile.nationalId && profile.birthDate && profile.phone && profile.address);
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

function serverCartItemKey(item: ReturnType<typeof normalizeCartItem>) {
  return item.productId
    ? String(item.productId)
    : `${item.title}|${item.description}|${item.price}|${item.selectedColor ?? ""}`;
}

function mergeCartItems(items: ReturnType<typeof normalizeCartItem>[]) {
  const byKey = new Map<string, ReturnType<typeof normalizeCartItem>>();

  for (const item of items) {
    if (!item.title || !item.price) continue;
    const key = serverCartItemKey(item);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        selectedColor: existing.selectedColor ?? item.selectedColor,
        quantity: existing.quantity + item.quantity,
      });
      continue;
    }
    byKey.set(key, item);
  }

  return Array.from(byKey.values());
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
  const url = new URL(request.url);
  const nationalId = String(bodyProfile?.nationalId ?? url.searchParams.get("nationalId") ?? "").trim();

  if (authUser && nationalId) {
    const profile = await prisma.customerProfile.findFirst({
      where: {
        userId: authUser.id,
        nationalId,
      },
    });
    return profile ?? prisma.customerProfile.findUnique({ where: { nationalId } });
  }

  if (authUser) return prisma.customerProfile.findFirst({ where: { userId: authUser.id } });
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
      birthDate: profile.birthDate,
      phone: profile.phone,
      address: profile.address,
      isAdminUnlocked: profile.isAdminUnlocked,
    },
    create: {
      userId: authUser?.id ?? null,
      firstName: profile.firstName,
      lastName: profile.lastName,
      nationalId: profile.nationalId,
      birthDate: profile.birthDate,
      phone: profile.phone,
      address: profile.address,
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
  const items: ReturnType<typeof normalizeCartItem>[] = Array.isArray(body.items)
    ? body.items.map(normalizeCartItem)
    : [];
  if (!isProfileComplete(profile)) return apiFail("complete profile is required", 400);

  try {
    const savedProfile = await upsertLegacyProfile(request, profile);
    const cart = await activeCartForProfile(savedProfile.id);
    const requestedProductIds = items
      .map((item) => item.productId)
      .filter((id): id is number => typeof id === "number");
    const products = requestedProductIds.length
      ? await prisma.product.findMany({
          where: { id: { in: Array.from(new Set(requestedProductIds)) } },
          select: { id: true },
        })
      : [];
    const validProductIds = new Set(products.map((product: { id: number }) => product.id));
    const safeItems = mergeCartItems(
      items.map((item) => ({
        ...item,
        productId: item.productId && validProductIds.has(item.productId) ? item.productId : null,
      }))
    );

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      for (const item of safeItems) {
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
    const authUser = await getAuthUser(request);
    const cartItems = cart.items as CheckoutCartItem[];
    const productIds = cartItems
      .map((item) => item.productId)
      .filter((id): id is number => typeof id === "number");
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: Array.from(new Set(productIds)) } } })
      : [];
    const productsById = new Map(products.map((product: { id: number }) => [product.id, product]));
    let total = 0;
    const productUpdates: ProductUpdatePlan[] = [];

    for (const item of cartItems) {
      total += readPriceNumber(item.discountPrice || item.price) * item.quantity;
      if (!item.productId) continue;

      const product = productsById.get(item.productId) as
        | { id: number; stockQuantity: number; colorStock: unknown }
        | undefined;
      if (!product || product.stockQuantity < item.quantity) {
        throw new Error(`${item.title} is out of stock`);
      }

      const colorStock = normalizeColorStock(product.colorStock);
      if (Object.keys(colorStock).length > 0 && !item.selectedColor) {
        throw new Error(`Select a color for ${item.title}`);
      }
      if (item.selectedColor) {
        if ((colorStock[item.selectedColor] ?? 0) < item.quantity) {
          throw new Error(`${item.title} ${item.selectedColor} is out of stock`);
        }
        colorStock[item.selectedColor] -= item.quantity;
      }

      productUpdates.push({
        productId: product.id,
        stockQuantity: product.stockQuantity - item.quantity,
        quantity: item.quantity,
        colorStock,
      });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      if (order) {
        await tx.orderItem.createMany({
          data: cartItems.map((item) => ({
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
          })),
        });
      }

      for (const update of productUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: {
            stockQuantity: update.stockQuantity,
            salesCount: { increment: update.quantity },
            colorStock: Object.keys(update.colorStock).length > 0 ? update.colorStock : Prisma.JsonNull,
          },
        });
      }
      if (order) await tx.order.update({ where: { id: order.id }, data: { total: String(total) } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }, {
      timeout: 15_000,
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
