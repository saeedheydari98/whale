import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";

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
