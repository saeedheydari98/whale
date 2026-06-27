import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/api/auth";
import { getOrCreateActiveCart } from "@/lib/api/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeColorStock(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, Number(val) || 0]));
}

function readPriceNumber(value?: string | null) {
  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

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

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const cart = await getOrCreateActiveCart(auth.user.id);
    if (cart.items.length === 0) return apiFail("cart is empty", 400);
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
      if (!product || product.stockQuantity < item.quantity) throw new Error("product is out of stock");

      const colorStock = normalizeColorStock(product.colorStock);
      if (item.selectedColor) {
        if ((colorStock[item.selectedColor] ?? 0) < item.quantity) throw new Error("selected color is out of stock");
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
      const order = await tx.order.create({
        data: {
          userId: auth.user.id,
          profileId: cart.profileId,
          status: "paid",
          total: "0",
        },
      });

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

      for (const update of productUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: {
            stockQuantity: update.stockQuantity,
            salesCount: { increment: update.quantity },
            colorStock: Object.keys(update.colorStock).length ? update.colorStock : Prisma.JsonNull,
          },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { total: String(total) } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { status: "checked_out" } });
    }, {
      timeout: 15_000,
    });

    return apiOk({ checkedOut: true });
  } catch (error) {
    console.error("Checkout error:", error);
    return apiServerError(error instanceof Error ? error.message : "server error");
  }
}
