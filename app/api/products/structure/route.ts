import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getProductsPageStructure } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    return apiOk(await getProductsPageStructure(url.searchParams));
  } catch (error) {
    console.error("Products page structure GET error:", error);
    return apiServerError();
  }
}
