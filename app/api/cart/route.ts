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
  phone?: string;
  email?: string;
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
  selectedColors?: Record<string, unknown> | null;
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

type CartProductSnapshot = {
  id: number;
  stockQuantity: number;
  colorStock: Prisma.JsonValue | null;
  isAvailable: boolean;
  active: boolean;
  isActive: boolean;
};

const COLOR_SELECTION_PREFIX = "colors:";

function normalizeProfile(value: ProfilePayload) {
  return {
    firstName: String(value.firstName ?? "").trim(),
    lastName: String(value.lastName ?? "").trim(),
    phone: String(value.phone ?? "").trim(),
    email: String(value.email ?? "").trim().toLowerCase(),
    address: String(value.address ?? "").trim(),
    isAdminUnlocked: value.isAdminUnlocked === true,
  };
}

function isProfileComplete(profile: ReturnType<typeof normalizeProfile>) {
  return Boolean(
    profile.firstName &&
    profile.lastName &&
    profile.phone &&
    profile.address
  );
}

function normalizeColorSelection(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([color, count]) => [
        color.trim(),
        Math.max(0, Math.round(Number(count))),
      ] as const)
      .filter(([color, count]) => color && Number.isFinite(count) && count > 0)
  );
}

function readColorSelection(selectedColor: unknown, quantity: number, selectedColors?: unknown) {
  const fromObject = normalizeColorSelection(selectedColors);
  if (Object.keys(fromObject).length > 0) return fromObject;

  const text = String(selectedColor ?? "").trim();
  if (!text) return {};

  if (text.startsWith(COLOR_SELECTION_PREFIX)) {
    try {
      return normalizeColorSelection(JSON.parse(text.slice(COLOR_SELECTION_PREFIX.length)));
    } catch {
      return {};
    }
  }

  return { [text]: Math.max(1, Math.round(Number(quantity) || 1)) };
}

function colorSelectionTotal(selection: Record<string, number>) {
  return Object.values(selection).reduce((sum, count) => sum + Math.max(0, Math.round(Number(count) || 0)), 0);
}

function serializeColorSelection(selection: Record<string, number>) {
  const normalized = normalizeColorSelection(selection);
  const entries = Object.entries(normalized);
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0][0];
  return `${COLOR_SELECTION_PREFIX}${JSON.stringify(Object.fromEntries(entries))}`;
}

function normalizeCartItem(value: CartItemPayload) {
  const productId = Number(value.productId ?? value.id);
  const quantity = Math.max(1, Math.round(Number(value.quantity ?? 1)));
  const selectedColors = readColorSelection(value.selectedColor, quantity, value.selectedColors);
  const selectedTotal = colorSelectionTotal(selectedColors);

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
    selectedColor: serializeColorSelection(selectedColors) ?? (value.selectedColor ? String(value.selectedColor).trim() : null),
    selectedColors,
    quantity: selectedTotal > 0 ? selectedTotal : quantity,
  };
}

function serverCartItemKey(item: ReturnType<typeof normalizeCartItem>) {
  return item.productId
    ? String(item.productId)
    : `${item.title}|${item.description}|${item.price}`;
}

function mergeCartItems(items: ReturnType<typeof normalizeCartItem>[]) {
  const byKey = new Map<string, ReturnType<typeof normalizeCartItem>>();

  for (const item of items) {
    if (!item.title || !item.price) continue;
    const key = serverCartItemKey(item);
    const existing = byKey.get(key);
    if (existing) {
      const selectedColors = { ...existing.selectedColors };
      for (const [color, count] of Object.entries(item.selectedColors)) {
        selectedColors[color] = (selectedColors[color] ?? 0) + count;
      }
      const selectedTotal = colorSelectionTotal(selectedColors);

      byKey.set(key, {
        ...existing,
        ...item,
        selectedColors,
        selectedColor: serializeColorSelection(selectedColors) ?? existing.selectedColor ?? item.selectedColor,
        quantity: selectedTotal > 0 ? selectedTotal : existing.quantity + item.quantity,
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
  const phone = String(bodyProfile?.phone ?? url.searchParams.get("phone") ?? "").trim();

  if (authUser) return prisma.customerProfile.findFirst({ where: { userId: authUser.id } });
  if (!phone) return null;
  return prisma.customerProfile.findFirst({
    where: { phone },
    orderBy: { updatedAt: "desc" },
  });
}

async function upsertLegacyProfile(request: Request, profile: ReturnType<typeof normalizeProfile>) {
  const authUser = await getAuthUser(request);
  const existing = authUser
    ? await prisma.customerProfile.findFirst({ where: { userId: authUser.id } })
    : await prisma.customerProfile.findFirst({
      where: { phone: profile.phone, userId: null },
      orderBy: { updatedAt: "desc" },
    });
  const profileData = {
    ...(authUser ? { userId: authUser.id } : {}),
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    email: profile.email || null,
    address: profile.address,
    isAdminUnlocked: profile.isAdminUnlocked,
  };

  return existing
    ? prisma.customerProfile.update({
      where: { id: existing.id },
      data: profileData,
    })
    : prisma.customerProfile.create({
      data: {
        userId: authUser?.id ?? null,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email || null,
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
  const authUser = await getAuthUser(request);
  const hasCompleteProfile = isProfileComplete(profile);
  if (!authUser && !hasCompleteProfile) return apiFail("برای ادامه باید پروفایل را کامل کنید.", 400);

  try {
    const cart = hasCompleteProfile
      ? await upsertLegacyProfile(request, profile).then((savedProfile) => activeCartForProfile(savedProfile.id))
      : await getOrCreateActiveCart(authUser!.id);
    const requestedProductIds = items
      .map((item) => item.productId)
      .filter((id): id is number => typeof id === "number");
    const products: CartProductSnapshot[] = requestedProductIds.length
      ? await prisma.product.findMany({
          where: { id: { in: Array.from(new Set(requestedProductIds)) } },
          select: { id: true, stockQuantity: true, colorStock: true, isAvailable: true, active: true, isActive: true },
        })
      : [];
    const productsById = new Map(products.map((product) => [product.id, product]));
    const safeItems = mergeCartItems(
      items
        .map((item) => {
          const product = item.productId ? productsById.get(item.productId) : null;
          if (!product) return { ...item, productId: null };

          const colorStock = normalizeColorStock(product.colorStock);
          const hasColorStock = Object.keys(colorStock).length > 0;
          const productStock = Math.max(0, Math.round(Number(product.stockQuantity) || 0));
          if (product.active === false || product.isActive === false || product.isAvailable === false || productStock <= 0) return null;

          if (!hasColorStock) {
            return {
              ...item,
              quantity: Math.max(1, Math.min(item.quantity, productStock)),
            };
          }

          const selectedColors = Object.fromEntries(
            Object.entries(item.selectedColors)
              .map(([color, count]) => [
                color,
                Math.min(Math.max(0, Math.round(Number(count) || 0)), colorStock[color] ?? 0),
              ] as const)
              .filter(([, count]) => count > 0)
          );
          const selectedTotal = colorSelectionTotal(selectedColors);
          if (selectedTotal <= 0) return null;

          return {
            ...item,
            selectedColors,
            selectedColor: serializeColorSelection(selectedColors),
            quantity: selectedTotal,
          };
        })
        .filter((item): item is ReturnType<typeof normalizeCartItem> => Boolean(item))
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

    const savedCart = await activeCartForProfile(cart.profileId);
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
  if (!profile) return apiFail("پروفایل پیدا نشد.", 404);

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
        throw new Error(`${item.title} موجودی کافی ندارد.`);
      }

      const colorStock = normalizeColorStock(product.colorStock);
      if (Object.keys(colorStock).length > 0 && !item.selectedColor) {
        throw new Error(`برای ${item.title} یک رنگ انتخاب کنید.`);
      }
      if (Object.keys(colorStock).length > 0) {
        const selectedColors = readColorSelection(item.selectedColor, item.quantity);
        const selectedTotal = colorSelectionTotal(selectedColors);
        if (selectedTotal !== item.quantity) {
          throw new Error(`تعداد رنگ‌های انتخاب‌شده برای ${item.title} با تعداد سبد خرید هماهنگ نیست.`);
        }
        for (const [color, count] of Object.entries(selectedColors)) {
          if ((colorStock[color] ?? 0) < count) {
            throw new Error(`${item.title} با رنگ ${color} موجودی کافی ندارد.`);
          }
          colorStock[color] -= count;
        }
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
    return apiServerError(error instanceof Error ? error.message : "خطای سرور رخ داد.");
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
