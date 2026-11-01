import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runDiscountRules } from "@/lib/api/discount-service";
import { EMAIL_PATTERN, PERSIAN_NAME_PATTERN, PHONE_PATTERN } from "@/lib/validation-patterns";
import {
  CheckoutError,
  applyProductStockUpdates,
  buildProductStockUpdates,
  calculateOrderTotals,
  claimDiscountCode,
  createOrderWithItems,
  createWalletTransactions,
  creditCashback,
  debitWallet,
  normalizeDiscountCode,
  type OrderLineInput,
} from "@/lib/api/order-core";

export type InPersonCustomerInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
};

export type InPersonOrderRequest = {
  /** Optional registered customer. When omitted the order is recorded as a walk-in sale. */
  customerUserId?: number | null;
  /** Creates the customer account while the order is placed. */
  newCustomer?: InPersonCustomerInput | null;
  lines: OrderLineInput[];
  discountCode?: string;
  /** Use the wallet balance of the selected customer towards the payment. */
  useWallet?: boolean;
};

export type InPersonOrderQuote = {
  subtotal: number;
  discountAmount: number;
  walletAmount: number;
  shippingAmount: number;
  total: number;
  cashbackEarned: number;
  cashbackPercent: number;
  walletBalance: number;
  discountCode: string | null;
  discountType: "percentage" | "free_shipping" | null;
  discountPercent: number | null;
};

type InPersonPlan = {
  customerId: number | null;
  profileId: string | null;
  /** Set when the order also created the customer account. */
  createdCustomerId: number | null;
  discount: { id: string; userId: number; code: string; type: string; percent: number | null } | null;
  lines: OrderLineInput[];
  productUpdates: Awaited<ReturnType<typeof buildProductStockUpdates>>["updates"];
  subtotal: number;
  quote: InPersonOrderQuote;
};

/** Validates the data of a customer that is registered on the spot. */
function validateNewCustomer(input: InPersonCustomerInput) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const address = input.address.trim();

  if (!PERSIAN_NAME_PATTERN.test(firstName) || !PERSIAN_NAME_PATTERN.test(lastName)) {
    throw new CheckoutError("نام و نام خانوادگی باید حروف فارسی باشند.", 400);
  }
  if (!PHONE_PATTERN.test(phone)) {
    throw new CheckoutError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.", 400);
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new CheckoutError("ایمیل معتبر وارد کنید.", 400);
  }
  if (address.length < 5) {
    throw new CheckoutError("نشانی باید حداقل ۵ کاراکتر باشد.", 400);
  }
}

/** Creates the customer account and profile for a walk-in purchase. */
async function createWalkInCustomer(
  db: typeof prisma | Prisma.TransactionClient,
  input: InPersonCustomerInput
) {
  validateNewCustomer(input);

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const address = input.address.trim();

  const existingUser = await db.user.findFirst({
    where: { OR: [{ username: phone }, { email }] },
    select: { id: true },
  });
  if (existingUser) {
    throw new CheckoutError("این شماره موبایل یا ایمیل قبلاً ثبت شده است.", 409);
  }

  const user = await db.user.create({
    data: { username: phone, email, role: "user" },
    select: { id: true },
  });

  const profile = await db.customerProfile.create({
    data: { userId: user.id, firstName, lastName, phone, email, address },
    select: { id: true },
  });

  return { userId: user.id, profileId: profile.id };
}

async function buildInPersonPlan(
  db: typeof prisma | Prisma.TransactionClient,
  input: InPersonOrderRequest,
  options: { createCustomer: boolean }
): Promise<InPersonPlan> {
  const lines = input.lines.filter((line) => line.title.trim().length > 0);
  if (lines.length === 0) throw new CheckoutError("سبد خرید خالی است.", 400);

  const code = normalizeDiscountCode(input.discountCode);

  let customerId = Number.isInteger(input.customerUserId) && Number(input.customerUserId) > 0
    ? Number(input.customerUserId)
    : null;
  let profileId: string | null = null;
  let createdCustomerId: number | null = null;

  // A walk-in purchase can register the customer on the spot.
  if (input.newCustomer) {
    if (customerId) {
      throw new CheckoutError("یا مشتری موجود را انتخاب کنید یا مشخصات کاربر جدید را وارد کنید.", 400);
    }
    if (code) {
      throw new CheckoutError("کاربر جدید هنوز کد تخفیف ندارد.", 400);
    }
    if (options.createCustomer) {
      const created = await createWalkInCustomer(db, input.newCustomer);
      customerId = created.userId;
      profileId = created.profileId;
      createdCustomerId = created.userId;
    } else {
      validateNewCustomer(input.newCustomer);
    }
  }

  const [customer, settings, profile, discount] = await Promise.all([
    customerId
      ? db.user.findUnique({ where: { id: customerId }, select: { id: true, walletBalance: true } })
      : Promise.resolve(null),
    db.commerceSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, cashbackPercent: 0, postalShippingFee: 30000 },
    }),
    customerId && !profileId
      ? db.customerProfile.findFirst({ where: { userId: customerId }, select: { id: true } })
      : Promise.resolve(null),
    code
      ? db.discountCode.findUnique({ where: { code } })
      : Promise.resolve(null),
  ]);

  if (customerId && !customer) throw new CheckoutError("مشتری انتخاب‌شده معتبر نیست.", 404);
  if (code && !customerId) {
    throw new CheckoutError("برای استفاده از کد تخفیف باید مشتری را انتخاب کنید.", 400);
  }
  if (code && (!discount || discount.userId !== customerId)) {
    throw new CheckoutError("کد تخفیف برای این مشتری معتبر نیست.", 404);
  }
  if (discount?.usedAt) throw new CheckoutError("این کد تخفیف قبلاً استفاده شده است.", 409);
  if (discount && discount.expiresAt.getTime() <= Date.now()) {
    throw new CheckoutError("مهلت استفاده از کد تخفیف تمام شده است.", 410);
  }

  const { subtotal, updates, lines: resolvedLines } = await buildProductStockUpdates(db, lines);

  const discountType = discount?.type === "free_shipping" ? "free_shipping" : discount ? "percentage" : null;
  if (discountType === "free_shipping") {
    throw new CheckoutError("کد ارسال رایگان برای سفارش حضوری قابل استفاده نیست.", 400);
  }
  const discountPercent = discountType === "percentage" ? Math.min(100, Math.max(1, discount?.percent ?? 0)) : null;
  const cashbackPercent = Math.min(100, Math.max(0, settings.cashbackPercent));
  const walletBalance = customer?.walletBalance ?? 0;
  const totals = calculateOrderTotals({
    subtotal,
    discountType,
    discountPercent,
    shippingMethod: "pickup",
    walletBalance: input.useWallet ? walletBalance : 0,
    cashbackPercent,
    postalShippingFee: settings.postalShippingFee,
  });

  return {
    customerId,
    profileId: profileId ?? profile?.id ?? null,
    createdCustomerId,
    discount: discount
      ? { id: discount.id, userId: discount.userId, code: discount.code, type: discount.type, percent: discount.percent }
      : null,
    lines: resolvedLines,
    productUpdates: updates,
    subtotal,
    quote: {
      subtotal,
      discountAmount: totals.discountAmount,
      walletAmount: totals.walletAmount,
      shippingAmount: totals.shippingAmount,
      total: totals.total,
      cashbackEarned: totals.cashbackEarned,
      cashbackPercent,
      walletBalance,
      discountCode: discount?.code ?? null,
      discountType,
      discountPercent,
    },
  };
}

export async function quoteInPersonOrder(input: InPersonOrderRequest) {
  const plan = await buildInPersonPlan(prisma, input, { createCustomer: false });
  return plan.quote;
}

export async function completeInPersonOrder(input: InPersonOrderRequest) {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const plan = await buildInPersonPlan(tx, input, { createCustomer: true });
    const { customerId, profileId, discount, lines, productUpdates, quote } = plan;

    if (discount && customerId) await claimDiscountCode(tx, discount, customerId);
    if (customerId) await debitWallet(tx, customerId, quote.walletAmount);
    await applyProductStockUpdates(tx, productUpdates);

    const order = await createOrderWithItems(tx, {
      userId: customerId,
      profileId,
      orderType: "in_person",
      shippingMethod: "pickup",
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

    if (customerId) {
      await createWalletTransactions(tx, [
        ...(quote.walletAmount > 0 ? [{ userId: customerId, orderId: order.id, amount: -quote.walletAmount, type: "purchase" }] : []),
        ...(quote.cashbackEarned > 0 ? [{ userId: customerId, orderId: order.id, amount: quote.cashbackEarned, type: "cashback" }] : []),
      ]);
      await creditCashback(tx, customerId, quote.cashbackEarned);
    }

    return { orderId: order.id, quote, customerId: plan.createdCustomerId ?? customerId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });

  const discountRuleUserId = result.customerId ?? (input.customerUserId ? Number(input.customerUserId) : null);
  if (discountRuleUserId) {
    await runDiscountRules({ userIds: [discountRuleUserId] }).catch((error) => {
      console.error("In-person order discount rule evaluation error:", error);
    });
  }
  return result;
}
