import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireAdmin } from "@/lib/api/auth";
import { productSchema } from "@/lib/api/schemas";
import { normalizeProductData, normalizeProductPatchData } from "@/lib/api/catalog-service";
import { validationError } from "@/lib/api/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const product = await prisma.product.findFirst({
      where: { id: Number(id), active: true },
    });
    return product ? apiOk({ product }) : apiFail("not found", 404);
  } catch (error) {
    console.error("Product GET error:", error);
    return apiServerError();
  }
}

async function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return { ok: false as const, response: limited };
  return requireAdmin(request);
}

async function updateProduct(request: Request, context: Context, partial: boolean) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = (partial ? productSchema.partial() : productSchema).safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: partial ? normalizeProductPatchData(parsed.data) : normalizeProductData(parsed.data),
    });

    return apiOk({ product });
  } catch (error: any) {
    if (error?.code === "P2025") return apiFail("not found", 404);
    console.error("Product update error:", error);
    return apiServerError();
  }
}

export async function PUT(request: Request, context: Context) {
  return updateProduct(request, context, false);
}

export async function PATCH(request: Request, context: Context) {
  return updateProduct(request, context, true);
}

export async function DELETE(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    await prisma.product.delete({ where: { id: Number(id) } });
    return apiOk({ deleted: true });
  } catch (error: any) {
    if (error?.code === "P2025") return apiFail("not found", 404);
    console.error("Product DELETE error:", error);
    return apiServerError();
  }
}
