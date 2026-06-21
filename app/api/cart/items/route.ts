import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/api/validation";
import { cartItemSchema } from "@/lib/api/schemas";
import { cartItemDto, getOrCreateActiveCart } from "@/lib/api/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return { ok: false as const, response: limited };
  return requireUser(request);
}

export async function GET(request: Request) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;

  try {
    const cart = await getOrCreateActiveCart(auth.user.id);
    return apiOk({ items: cart.items.map(cartItemDto) });
  } catch (error) {
    console.error("Cart items GET error:", error);
    return apiServerError();
  }
}

export async function POST(request: Request) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonBody(request, cartItemSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const [cart, product] = await Promise.all([
      getOrCreateActiveCart(auth.user.id),
      prisma.product.findUnique({ where: { id: parsed.data.productId } }),
    ]);
    if (!product) return apiServerError("product not found");

    const item = await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      update: { quantity: { increment: parsed.data.quantity ?? 1 }, selectedColor: parsed.data.selectedColor ?? null },
      create: {
        cartId: cart.id,
        productId: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        discountPrice: product.discountPrice,
        discountPercent: product.discountPercent,
        imageUrl: product.imageUrl,
        selectedColor: parsed.data.selectedColor ?? null,
        quantity: parsed.data.quantity ?? 1,
      },
    });
    return apiOk({ item: cartItemDto(item) }, { status: 201 });
  } catch (error) {
    console.error("Cart item POST error:", error);
    return apiServerError();
  }
}
