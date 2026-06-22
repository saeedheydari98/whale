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

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const cart = await getOrCreateActiveCart(auth.user.id);
    if (cart.items.length === 0) return apiFail("cart is empty", 400);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let total = 0;
      const order = await tx.order.create({
        data: {
          userId: auth.user.id,
          profileId: cart.profileId,
          status: "paid",
          total: "0",
        },
      });

      for (const item of cart.items) {
        total += readPriceNumber(item.discountPrice || item.price) * item.quantity;
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
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockQuantity < item.quantity) throw new Error("product is out of stock");
        const colorStock = normalizeColorStock(product.colorStock);
        if (item.selectedColor) {
          if ((colorStock[item.selectedColor] ?? 0) < item.quantity) throw new Error("selected color is out of stock");
          colorStock[item.selectedColor] -= item.quantity;
        }
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: product.stockQuantity - item.quantity,
            salesCount: { increment: item.quantity },
            colorStock: Object.keys(colorStock).length ? colorStock : Prisma.JsonNull,
          },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { total: String(total) } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { status: "checked_out" } });
    });

    return apiOk({ checkedOut: true });
  } catch (error) {
    console.error("Checkout error:", error);
    return apiServerError(error instanceof Error ? error.message : "server error");
  }
}
