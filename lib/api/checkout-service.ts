import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { colorSelectionTotal, readCartItemColorSelection } from "@/lib/cart-color-selection";
import { normalizeColorStock } from "@/lib/color-counts";
import { readFormattedPriceNumber, toLatinDigits } from "@/lib/price-format";
import { EMAIL_PATTERN, PERSIAN_NAME_PATTERN, PHONE_PATTERN } from "@/lib/validation-patterns";
import { runDiscountRules } from "@/lib/api/discount-service";

export const SHIPPING_METHODS = ["pickup", "post"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

type CheckoutDatabase = typeof prisma | Prisma.TransactionClient;
type CheckoutCart = Prisma.CartGetPayload<{ include: { items: true } }>;
type CheckoutProduct = Prisma.ProductGetPayload<Record<string, never>>;

type CheckoutRequest = {
  userId: number;
  shippingMethod: ShippingMethod;
  discountCode?: string;
};

type ProductUpdate = {
  productId: number;
  quantity: number;
  stockQuantity: number;
  colorStock: Record<string, number>;
};

export type CheckoutQuote = {
  subtotal: number;
  discountAmount: number;
  walletAmount: number;
  shippingAmount: number;
  total: number;
  cashbackEarned: number;
  cashbackPercent: number;
  walletBalance: number;
  shippingMethod: ShippingMethod;
  discountCode: string | null;
  discountType: "percentage" | "free_shipping" | null;
  discountPercent: number | null;
};

export class CheckoutError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function normalizeCode(value: unknown) {
  return toLatinDigits(String(value ?? ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function normalizeShippingMethod(value: unknown): ShippingMethod {
  return value === "post" ? "post" : "pickup";
}

async function buildCheckoutPlan(db: CheckoutDatabase, input: CheckoutRequest) {
  const code = normalizeCode(input.discountCode);
  const [user, settings, profile, discount] = await Promise.all([
    db.user.findUnique({ where: { id: input.userId }, select: { walletBalance: true } }),
    db.commerceSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, cashbackPercent: 0, postalShippingFee: 30000 },
    }),
    db.customerProfile.findFirst({
      where: { userId: input.userId },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, address: true },
    }),
    code
      ? db.discountCode.findUnique({ where: { code } })
      : Promise.resolve(null),
  ]);

  if (
    !user
    || !profile
    || !PERSIAN_NAME_PATTERN.test(profile.firstName)
    || !PERSIAN_NAME_PATTERN.test(profile.lastName)
    || !PHONE_PATTERN.test(profile.phone)
    || !EMAIL_PATTERN.test(profile.email ?? "")
    || profile.address.trim().length < 5
  ) throw new CheckoutError("اطلاعات حساب کاربری کامل نیست.", 400);
  if (code && (!discount || discount.userId !== input.userId)) {
    throw new CheckoutError("کد تخفیف برای این حساب معتبر نیست.", 404);
  }
  if (discount?.usedAt) throw new CheckoutError("این کد تخفیف قبلاً استفاده شده است.", 409);
  if (discount && discount.expiresAt.getTime() <= Date.now()) {
    throw new CheckoutError("مهلت استفاده از کد تخفیف تمام شده است.", 410);
  }

  const cart = await db.cart.findFirst({
    where: { profileId: profile.id, status: "active" },
    include: { items: { orderBy: { createdAt: "asc" } } },
  }) as CheckoutCart | null;
  if (!cart || cart.items.length === 0) throw new CheckoutError("سبد خرید خالی است.", 400);

  const productIds = cart.items
    .map((item: CheckoutCart["items"][number]) => item.productId)
    .filter((id: number | null): id is number => typeof id === "number");
  const products = productIds.length
    ? await db.product.findMany({ where: { id: { in: Array.from(new Set(productIds)) } } }) as CheckoutProduct[]
    : [] as CheckoutProduct[];
  const productsById = new Map(products.map((product: CheckoutProduct) => [product.id, product]));
  const productUpdates: ProductUpdate[] = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = item.productId ? productsById.get(item.productId) : null;
    if (item.productId && (!product || !product.active || !product.isActive || !product.isAvailable)) {
      throw new CheckoutError(`${item.title} در حال حاضر قابل خرید نیست.`, 409);
    }

    const unitPrice = product
      ? readFormattedPriceNumber(product.discountPrice || product.price)
      : readFormattedPriceNumber(item.discountPrice || item.price);
    subtotal += unitPrice * item.quantity;
    if (!product) continue;
    if (product.stockQuantity < item.quantity) {
      throw new CheckoutError(`موجودی ${item.title} کافی نیست.`, 409);
    }

    const colorStock = normalizeColorStock(product.colorStock);
    if (Object.keys(colorStock).length > 0) {
      const selectedColors = readCartItemColorSelection(item.selectedColor, item.quantity);
      if (colorSelectionTotal(selectedColors) !== item.quantity) {
        throw new CheckoutError(`رنگ ${item.title} را کامل انتخاب کنید.`, 409);
      }
      for (const [color, count] of Object.entries(selectedColors)) {
        if ((colorStock[color] ?? 0) < count) {
          throw new CheckoutError(`موجودی رنگ ${color} برای ${item.title} کافی نیست.`, 409);
        }
        colorStock[color] -= count;
      }
    }

    productUpdates.push({
      productId: product.id,
      quantity: item.quantity,
      stockQuantity: product.stockQuantity - item.quantity,
      colorStock,
    });
  }

  const discountType = discount?.type === "free_shipping" ? "free_shipping" : discount ? "percentage" : null;
  if (discountType === "free_shipping" && input.shippingMethod !== "post") {
    throw new CheckoutError("کد ارسال رایگان فقط برای روش ارسال با پست قابل استفاده است.", 400);
  }
  const discountPercent = discountType === "percentage" ? Math.min(100, Math.max(1, discount?.percent ?? 0)) : null;
  const discountAmount = discountPercent ? Math.floor(subtotal * discountPercent / 100) : 0;
  const shippingAmount = input.shippingMethod === "post" && discountType !== "free_shipping"
    ? Math.max(0, settings.postalShippingFee)
    : 0;
  const beforeWallet = Math.max(0, subtotal - discountAmount + shippingAmount);
  const walletAmount = Math.min(user.walletBalance, beforeWallet);
  const total = beforeWallet - walletAmount;
  const paidProductAmount = Math.max(0, subtotal - discountAmount - walletAmount);
  const cashbackPercent = Math.min(100, Math.max(0, settings.cashbackPercent));
  const cashbackEarned = Math.floor(paidProductAmount * cashbackPercent / 100);

  return {
    cart,
    discount,
    productUpdates,
    quote: {
      subtotal,
      discountAmount,
      walletAmount,
      shippingAmount,
      total,
      cashbackEarned,
      cashbackPercent,
      walletBalance: user.walletBalance,
      shippingMethod: input.shippingMethod,
      discountCode: discount?.code ?? null,
      discountType,
      discountPercent,
    } satisfies CheckoutQuote,
  };
}

export async function quoteCheckout(input: CheckoutRequest) {
  const plan = await buildCheckoutPlan(prisma, input);
  return plan.quote;
}

export async function completeCheckout(input: CheckoutRequest) {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const plan = await buildCheckoutPlan(tx, input);
    const { cart, discount, productUpdates, quote } = plan;

    if (discount) {
      const claimed = await tx.discountCode.updateMany({
        where: { id: discount.id, userId: input.userId, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new CheckoutError("کد تخفیف دیگر قابل استفاده نیست.", 409);
    }

    if (quote.walletAmount > 0) {
      const debited = await tx.user.updateMany({
        where: { id: input.userId, walletBalance: { gte: quote.walletAmount } },
        data: { walletBalance: { decrement: quote.walletAmount } },
      });
      if (debited.count !== 1) throw new CheckoutError("موجودی کیف پول تغییر کرده است؛ دوباره استعلام بگیرید.", 409);
    }

    for (const update of productUpdates) {
      const saved = await tx.product.updateMany({
        where: { id: update.productId, stockQuantity: { gte: update.quantity } },
        data: {
          stockQuantity: { decrement: update.quantity },
          salesCount: { increment: update.quantity },
          colorStock: Object.keys(update.colorStock).length > 0 ? update.colorStock : Prisma.JsonNull,
        },
      });
      if (saved.count !== 1) throw new CheckoutError("موجودی یکی از محصولات تغییر کرده است.", 409);
    }

    const order = await tx.order.create({
      data: {
        userId: input.userId,
        profileId: cart.profileId,
        status: "paid",
        fulfillmentStatus: "pending_approval",
        total: String(quote.total),
        subtotal: String(quote.subtotal),
        discountAmount: String(quote.discountAmount),
        walletAmount: String(quote.walletAmount),
        shippingAmount: String(quote.shippingAmount),
        shippingMethod: quote.shippingMethod,
        discountCode: quote.discountCode,
        cashbackEarned: String(quote.cashbackEarned),
        statusHistory: { create: { status: "pending_approval" } },
      },
    });

    await tx.orderItem.createMany({
      data: cart.items.map((item: CheckoutCart["items"][number]) => ({
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

    const walletTransactions = [
      ...(quote.walletAmount > 0 ? [{ userId: input.userId, orderId: order.id, amount: -quote.walletAmount, type: "purchase" }] : []),
      ...(quote.cashbackEarned > 0 ? [{ userId: input.userId, orderId: order.id, amount: quote.cashbackEarned, type: "cashback" }] : []),
    ];
    if (walletTransactions.length > 0) await tx.walletTransaction.createMany({ data: walletTransactions });
    if (quote.cashbackEarned > 0) {
      await tx.user.update({ where: { id: input.userId }, data: { walletBalance: { increment: quote.cashbackEarned } } });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { status: "checked_out" } });

    return { orderId: order.id, quote };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });
  await runDiscountRules({ userIds: [input.userId] }).catch((error) => {
    console.error("Checkout discount rule evaluation error:", error);
  });
  return result;
}
