import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EMAIL_PATTERN, PERSIAN_NAME_PATTERN, PHONE_PATTERN } from "@/lib/validation-patterns";
import { runDiscountRules } from "@/lib/api/discount-service";
import {
  CheckoutError,
  SHIPPING_METHODS,
  applyProductStockUpdates,
  buildProductStockUpdates,
  calculateOrderTotals,
  claimDiscountCode,
  createOrderWithItems,
  createWalletTransactions,
  creditCashback,
  debitWallet,
  normalizeDiscountCode,
  normalizeShippingMethod,
  type OrderLineInput,
  type OrderType,
  type ShippingMethod,
} from "@/lib/api/order-core";

export { CheckoutError, SHIPPING_METHODS, normalizeShippingMethod };
export type { OrderType, ShippingMethod };

type CheckoutDatabase = typeof prisma | Prisma.TransactionClient;
type CheckoutCart = Prisma.CartGetPayload<{ include: { items: true } }>;

type CheckoutRequest = {
  userId: number;
  shippingMethod: ShippingMethod;
  discountCode?: string;
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

async function buildCheckoutPlan(db: CheckoutDatabase, input: CheckoutRequest) {
  const code = normalizeDiscountCode(input.discountCode);
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

  const lines: OrderLineInput[] = cart.items.map((item: CheckoutCart["items"][number]) => ({
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
  }));

  const { subtotal, updates: productUpdates } = await buildProductStockUpdates(db, lines);

  const discountType = discount?.type === "free_shipping" ? "free_shipping" : discount ? "percentage" : null;
  if (discountType === "free_shipping" && input.shippingMethod !== "post") {
    throw new CheckoutError("کد ارسال رایگان فقط برای روش ارسال با پست قابل استفاده است.", 400);
  }
  const discountPercent = discountType === "percentage" ? Math.min(100, Math.max(1, discount?.percent ?? 0)) : null;
  const cashbackPercent = Math.min(100, Math.max(0, settings.cashbackPercent));
  const totals = calculateOrderTotals({
    subtotal,
    discountType,
    discountPercent,
    shippingMethod: input.shippingMethod,
    walletBalance: user.walletBalance,
    cashbackPercent,
    postalShippingFee: settings.postalShippingFee,
  });

  return {
    cart,
    discount,
    lines,
    productUpdates,
    quote: {
      subtotal,
      discountAmount: totals.discountAmount,
      walletAmount: totals.walletAmount,
      shippingAmount: totals.shippingAmount,
      total: totals.total,
      cashbackEarned: totals.cashbackEarned,
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
    const { cart, discount, lines, productUpdates, quote } = plan;

    if (discount) await claimDiscountCode(tx, discount, input.userId);

    await debitWallet(tx, input.userId, quote.walletAmount);
    await applyProductStockUpdates(tx, productUpdates);

    const order = await createOrderWithItems(tx, {
      userId: input.userId,
      profileId: cart.profileId,
      orderType: "online",
      shippingMethod: quote.shippingMethod,
      discountCode: quote.discountCode,
      subtotal: quote.subtotal,
      totals: {
        discountAmount: quote.discountAmount,
        shippingAmount: quote.shippingAmount,
        walletAmount: quote.walletAmount,
        total: quote.total,
        cashbackEarned: quote.cashbackEarned,
      },
      lines,
    });

    await createWalletTransactions(tx, [
      ...(quote.walletAmount > 0 ? [{ userId: input.userId, orderId: order.id, amount: -quote.walletAmount, type: "purchase" }] : []),
      ...(quote.cashbackEarned > 0 ? [{ userId: input.userId, orderId: order.id, amount: quote.cashbackEarned, type: "cashback" }] : []),
    ]);
    await creditCashback(tx, input.userId, quote.cashbackEarned);

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({
      where: { id: cart.id },
      data: { status: `checked_out:${order.id}` },
    });

    return { orderId: order.id, quote };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });
  await runDiscountRules({ userIds: [input.userId] }).catch((error) => {
    console.error("Checkout discount rule evaluation error:", error);
  });
  return result;
}
