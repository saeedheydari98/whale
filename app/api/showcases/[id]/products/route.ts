import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { searchProducts } from "@/lib/api/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const products = await searchProducts(url.searchParams, { showcaseId: id });
    return apiOk({ products });
  } catch (error) {
    console.error("Showcase products error:", error);
    return apiServerError();
  }
}
