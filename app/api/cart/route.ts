import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/api/validation";
import { cartSnapshotSchema } from "@/lib/api/schemas";
import { cartItemDto, getOrCreateActiveCart } from "@/lib/api/catalog-service";
import { CheckoutError, completeCheckout, normalizeShippingMethod } from "@/lib/api/checkout-service";
import {
  colorSelectionTotal,
  readCartItemColorSelection as readColorSelection,
  serializeColorSelection,
} from "@/lib/cart-color-selection";
import { normalizeColorStock } from "@/lib/color-counts";
import { EMAIL_PATTERN, PERSIAN_NAME_PATTERN, PHONE_PATTERN } from "@/lib/validation-patterns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfilePayload = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
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

type CartProductSnapshot = {
  id: number;
  stockQuantity: number;
  colorStock: Prisma.JsonValue | null;
  isAvailable: boolean;
  active: boolean;
  isActive: boolean;
};

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
    PERSIAN_NAME_PATTERN.test(profile.firstName) &&
    PERSIAN_NAME_PATTERN.test(profile.lastName) &&
    PHONE_PATTERN.test(profile.phone) &&
    EMAIL_PATTERN.test(profile.email) &&
    profile.address.length >= 5
  );
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
    selectedColor: serializeColorSelection(selectedColors) || (value.selectedColor ? String(value.selectedColor).trim() : null),
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
        selectedColor: serializeColorSelection(selectedColors) || existing.selectedColor || item.selectedColor,
        quantity: selectedTotal > 0 ? selectedTotal : existing.quantity + item.quantity,
      });
      continue;
    }
    byKey.set(key, item);
  }

  return Array.from(byKey.values());
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

async function upsertLegacyProfile(authUser: Awaited<ReturnType<typeof getAuthUser>>, profile: ReturnType<typeof normalizeProfile>) {
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
  if (existing && Object.entries(profileData).every(([key, value]) => existing[key as keyof typeof existing] === value)) {
    return existing;
  }

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

  const parsed = await parseJsonBody(request, cartSnapshotSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const profile = normalizeProfile(body.profile ?? {});
  // Merge before checking stock so duplicate product rows share the same limit.
  const items = mergeCartItems(body.items.map(normalizeCartItem));
  const hasCompleteProfile = isProfileComplete(profile);

  try {
    const requestedProductIds = items
      .map((item) => item.productId)
      .filter((id): id is number => typeof id === "number");
    const [authUser, products] = await Promise.all([
      getAuthUser(request),
      requestedProductIds.length ? prisma.product.findMany({
          where: { id: { in: Array.from(new Set(requestedProductIds)) } },
          select: { id: true, stockQuantity: true, colorStock: true, isAvailable: true, active: true, isActive: true },
        })
      : Promise.resolve<CartProductSnapshot[]>([]),
    ]);
    if (!authUser && !hasCompleteProfile) return apiFail("برای ادامه باید پروفایل را کامل کنید.", 400);
    const productsById = new Map(products.map((product) => [product.id, product]));
    let rejectedItemTitle = "";
    const safeItems = mergeCartItems(
      items
        .map((item) => {
          const product = item.productId ? productsById.get(item.productId) : null;
          if (!product) {
            if (item.productId) { rejectedItemTitle ||= item.title; return null; }
            return item;
          }

          const colorStock = normalizeColorStock(product.colorStock);
          const hasColorStock = Object.keys(colorStock).length > 0;
          const productStock = Math.max(0, Math.round(Number(product.stockQuantity) || 0));
          if (product.active === false || product.isActive === false || product.isAvailable === false || productStock <= 0) {
            rejectedItemTitle ||= item.title;
            return null;
          }

          if (!hasColorStock) {
            return {
              ...item,
              quantity: Math.max(1, Math.min(item.quantity, productStock)),
            };
          }

          // A cart may contain a draft with no color; checkout validates the final selection.
          if (colorSelectionTotal(item.selectedColors) === 0) {
            return { ...item, selectedColors: {}, selectedColor: null, quantity: Math.min(item.quantity, productStock) };
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
          if (selectedTotal <= 0 || selectedTotal > productStock) {
            rejectedItemTitle ||= item.title;
            return null;
          }

          return {
            ...item,
            selectedColors,
            selectedColor: serializeColorSelection(selectedColors),
            quantity: selectedTotal,
          };
        })
        .filter((item): item is ReturnType<typeof normalizeCartItem> => Boolean(item))
    );

    if (rejectedItemTitle) {
      return apiFail(`موجودی ${rejectedItemTitle} تغییر کرده است؛ لطفاً دوباره انتخاب کنید.`, 409);
    }

    const cart = hasCompleteProfile
      ? await upsertLegacyProfile(authUser, profile).then((savedProfile) => activeCartForProfile(savedProfile.id))
      : await getOrCreateActiveCart(authUser!.id);
    const savedItems = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (safeItems.length > 0) {
        await tx.cartItem.createMany({
          data: safeItems.map((item) => ({
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
          })),
        });
      }
      return tx.cartItem.findMany({ where: { cartId: cart.id }, orderBy: { createdAt: "asc" } });
    });

    return apiOk({
      user: { profile: cart.profile },
      cart: { items: savedItems.map(cartItemDto) },
    }, {
      message: "CART_UPDATED",
      showMessage: "سبد خرید با موفقیت به‌روز شد.",
    });
  } catch (error) {
    console.error("Cart POST error:", error);
    return apiServerError();
  }
}

export async function PATCH(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const authUser = await getAuthUser(request);
  if (!authUser) return apiFail("برای پرداخت باید وارد حساب شوید.", 401);

  const profile = await prisma.customerProfile.findFirst({ where: { userId: authUser.id } });
  if (!profile || !isProfileComplete(normalizeProfile(profile))) {
    return apiFail("برای پرداخت باید پروفایل را کامل کنید.", 400);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await completeCheckout({
      userId: authUser.id,
      shippingMethod: normalizeShippingMethod(body.shippingMethod),
      discountCode: body.discountCode,
    });
    return apiOk({ user: { profile }, cart: { items: [] }, checkout: result }, {
      message: "ORDER_CREATED",
      showMessage: "سفارش با موفقیت ثبت شد.",
    });
  } catch (error) {
    console.error("Cart checkout error:", error);
    if (error instanceof CheckoutError) return apiFail(error.message, error.status);
    return apiServerError("ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید.");
  }
}

export async function DELETE(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const profile = await findLegacyProfile(request, body.profile ?? {});
  if (!profile) return apiOk({ user: { profile: null }, cart: { items: [] } }, {
    message: "CART_CLEARED",
    showMessage: "سبد خرید خالی شد.",
  });

  try {
    const cart = await activeCartForProfile(profile.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return apiOk({ user: { profile }, cart: { items: [] } }, {
      message: "CART_CLEARED",
      showMessage: "سبد خرید خالی شد.",
    });
  } catch (error) {
    console.error("Cart DELETE error:", error);
    return apiServerError();
  }
}
