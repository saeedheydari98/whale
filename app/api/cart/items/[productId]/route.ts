import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/api/validation";
import { quantitySchema } from "@/lib/api/schemas";
import { getOrCreateActiveCart, cartItemDto } from "@/lib/api/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ productId: string }> };

async function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return { ok: false as const, response: limited };
  return requireUser(request);
}

export async function PUT(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonBody(request, quantitySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { productId } = await context.params;
    const cart = await getOrCreateActiveCart(auth.user.id);
    const item = await prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId: Number(productId) } },
      data: { quantity: parsed.data.quantity },
    });
    return apiOk({ item: cartItemDto(item) });
  } catch (error: any) {
    if (error?.code === "P2025") return apiFail("not found", 404);
    console.error("Cart item PUT error:", error);
    return apiServerError();
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;

  try {
    const { productId } = await context.params;
    const cart = await getOrCreateActiveCart(auth.user.id);
    await prisma.cartItem.delete({ where: { cartId_productId: { cartId: cart.id, productId: Number(productId) } } });
    return apiOk({ deleted: true });
  } catch (error: any) {
    if (error?.code === "P2025") return apiFail("not found", 404);
    console.error("Cart item DELETE error:", error);
    return apiServerError();
  }
}
