import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getCategoryProducts } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const data = await getCategoryProducts(id, url.searchParams);
    return apiOk(data);
  } catch (error) {
    console.error("Category products GET error:", error);
    return apiServerError();
  }
}

