import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getCategoryGroupProducts } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    return apiOk(await getCategoryGroupProducts(id, url.searchParams));
  } catch (error) {
    console.error("Category group products GET error:", error);
    return apiServerError();
  }
}
