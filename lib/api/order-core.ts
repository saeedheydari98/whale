import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { colorSelectionTotal, readCartItemColorSelection } from "@/lib/cart-color-selection";
import { normalizeColorStock } from "@/lib/color-counts";
import { readFormattedPriceNumber, toLatinDigits } from "@/lib/price-format";

export const SHIPPING_METHODS = ["pickup", "post"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const ORDER_TYPES = ["online", "in_person"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  online: "سفارش آنلاین",
  in_person: "سفارش حضوری",
};

export function normalizeShippingMethod(value: unknown): ShippingMethod {
  return value === "post" ? "post" : "pickup";
}

export function normalizeOrderType(value: unknown): OrderType {
  return value === "in_person" ? "in_person" : "online";
}

export function normalizeDiscountCode(value: unknown) {
  return toLatinDigits(String(value ?? ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export class CheckoutError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export type OrderDatabase = typeof prisma | Prisma.TransactionClient;

/** A single purchase line. Mirrors the fields snapshotted on `OrderItem`. */
export type OrderLineInput = {
  productId?: number | null;
  title: string;
  description: string;
  price: string;
  originalPrice?: string | null;
  discountPrice?: string | null;
  discountPercent?: number | null;
  imageUrl?: string | null;
  /** Serialized color selection, see `lib/cart-color-selection.ts`. */
  selectedColor?: string | null;
  quantity: number;
};

export type ProductStockUpdate = {
  productId: number;
  quantity: number;
  stockQuantity: number;
  colorStock: Record<string, number>;
};

export type OrderTotalsInput = {
  subtotal: number;
  discountType: "percentage" | "free_shipping" | null;
  discountPercent: number | null;
  shippingMethod: ShippingMethod;
  walletBalance: number;
  cashbackPercent: number;
  postalShippingFee: number;
};

export type OrderTotals = {
  discountAmount: number;
  shippingAmount: number;
  walletAmount: number;
  total: number;
  cashbackEarned: number;
};

/** Single source of truth for the money math shared by online and in-person checkout. */
export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  const discountPercent = input.discountType === "percentage"
    ? Math.min(100, Math.max(1, input.discountPercent ?? 0))
    : null;
  const discountAmount = discountPercent ? Math.floor(input.subtotal * discountPercent / 100) : 0;
  const shippingAmount = input.shippingMethod === "post" && input.discountType !== "free_shipping"
    ? Math.max(0, input.postalShippingFee)
    : 0;
  const beforeWallet = Math.max(0, input.subtotal - discountAmount + shippingAmount);
  const walletAmount = Math.min(Math.max(0, input.walletBalance), beforeWallet);
  const total = beforeWallet - walletAmount;
  const paidProductAmount = Math.max(0, input.subtotal - discountAmount - walletAmount);
  const cashbackPercent = Math.min(100, Math.max(0, input.cashbackPercent));
  const cashbackEarned = Math.floor(paidProductAmount * cashbackPercent / 100);

  return { discountAmount, shippingAmount, walletAmount, total, cashbackEarned };
}

/**
 * Validates availability, stock and color selection for the given lines and
 * returns the subtotal, the resolved line snapshots and the stock updates that
 * must be applied atomically.
 */
export async function buildProductStockUpdates(db: OrderDatabase, lines: OrderLineInput[]) {
  const productIds = lines
    .map((line) => line.productId)
    .filter((id): id is number => typeof id === "number");
  const products = productIds.length
    ? await db.product.findMany({ where: { id: { in: Array.from(new Set(productIds)) } } })
    : [];
  const productsById = new Map(products.map((product) => [product.id, product]));
  const updates: ProductStockUpdate[] = [];
  const resolvedLines: OrderLineInput[] = [];
  let subtotal = 0;

  for (const line of lines) {
    const product = line.productId ? productsById.get(line.productId) : null;
    if (line.productId && (!product || !product.active || !product.isActive || !product.isAvailable)) {
      throw new CheckoutError(`${line.title} در حال حاضر قابل خرید نیست.`, 409);
    }

    const quantity = Math.max(1, Math.round(Number(line.quantity) || 1));
    const unitPrice = product
      ? readFormattedPriceNumber(product.discountPrice || product.price)
      : readFormattedPriceNumber(line.discountPrice || line.price);
    subtotal += unitPrice * quantity;
    if (!product) {
      resolvedLines.push({ ...line, quantity });
      continue;
    }
    if (product.stockQuantity < quantity) {
      throw new CheckoutError(`موجودی ${line.title} کافی نیست.`, 409);
    }

    const colorStock = normalizeColorStock(product.colorStock);
    if (Object.keys(colorStock).length > 0) {
      const selectedColors = readCartItemColorSelection(line.selectedColor, quantity);
      if (colorSelectionTotal(selectedColors) !== quantity) {
        throw new CheckoutError(`رنگ ${line.title} را کامل انتخاب کنید.`, 409);
      }
      for (const [color, count] of Object.entries(selectedColors)) {
        if ((colorStock[color] ?? 0) < count) {
          throw new CheckoutError(`موجودی رنگ ${color} برای ${line.title} کافی نیست.`, 409);
        }
        colorStock[color] -= count;
      }
    }

    updates.push({
      productId: product.id,
      quantity,
      stockQuantity: product.stockQuantity - quantity,
      colorStock,
    });

    resolvedLines.push({
      productId: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      discountPrice: product.discountPrice,
      discountPercent: product.discountPercent,
      imageUrl: product.imageUrl,
      selectedColor: line.selectedColor ?? null,
      quantity,
    });
  }

  return { subtotal, updates, lines: resolvedLines };
}

/** Atomically decrements product stock and bumps the sales counter. */
export async function applyProductStockUpdates(tx: Prisma.TransactionClient, updates: ProductStockUpdate[]) {
  for (const update of updates) {
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
}

/** Marks a discount code as used exactly once. */
export async function claimDiscountCode(
  tx: Prisma.TransactionClient,
  discount: { id: string; userId: number },
  userId: number
) {
  const claimed = await tx.discountCode.updateMany({
    where: { id: discount.id, userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) throw new CheckoutError("کد تخفیف دیگر قابل استفاده نیست.", 409);
}

/** Debits the wallet balance of the buyer. */
export async function debitWallet(tx: Prisma.TransactionClient, userId: number, amount: number) {
  if (amount <= 0) return;
  const debited = await tx.user.updateMany({
    where: { id: userId, walletBalance: { gte: amount } },
    data: { walletBalance: { decrement: amount } },
  });
  if (debited.count !== 1) throw new CheckoutError("موجودی کیف پول تغییر کرده است؛ دوباره استعلام بگیرید.", 409);
}

/** Credits the earned cashback back to the wallet of the buyer. */
export async function creditCashback(tx: Prisma.TransactionClient, userId: number, amount: number) {
  if (amount <= 0) return;
  await tx.user.update({ where: { id: userId }, data: { walletBalance: { increment: amount } } });
}

export type WalletTransactionEntry = {
  userId: number;
  orderId: string;
  amount: number;
  type: string;
};

export async function createWalletTransactions(tx: Prisma.TransactionClient, entries: WalletTransactionEntry[]) {
  if (entries.length === 0) return;
  await tx.walletTransaction.createMany({ data: entries });
}

export type CreateOrderInput = {
  userId?: number | null;
  profileId?: string | null;
  orderType: OrderType;
  shippingMethod: ShippingMethod;
  discountCode?: string | null;
  subtotal: number;
  totals: OrderTotals;
  lines: OrderLineInput[];
};

/** Creates the order row plus its item snapshots. */
export async function createOrderWithItems(tx: Prisma.TransactionClient, input: CreateOrderInput) {
  const order = await tx.order.create({
    data: {
      userId: input.userId ?? null,
      profileId: input.profileId ?? null,
      orderType: input.orderType,
      status: "paid",
      fulfillmentStatus: "pending_approval",
      total: String(input.totals.total),
      subtotal: String(input.subtotal),
      discountAmount: String(input.totals.discountAmount),
      walletAmount: String(input.totals.walletAmount),
      shippingAmount: String(input.totals.shippingAmount),
      shippingMethod: input.shippingMethod,
      discountCode: input.discountCode ?? null,
      cashbackEarned: String(input.totals.cashbackEarned),
      statusHistory: { create: { status: "pending_approval" } },
    },
  });

  await tx.orderItem.createMany({
    data: input.lines.map((line) => ({
      orderId: order.id,
      productId: line.productId ?? null,
      title: line.title,
      description: line.description,
      price: line.price,
      originalPrice: line.originalPrice ?? null,
      discountPrice: line.discountPrice ?? null,
      discountPercent: line.discountPercent ?? null,
      imageUrl: line.imageUrl ?? null,
      selectedColor: line.selectedColor ?? null,
      quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
    })),
  });

  return order;
}
