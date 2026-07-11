import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getCategoriesPageStructure } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    return apiOk(await getCategoriesPageStructure(url.searchParams));
  } catch (error) {
    console.error("Categories structure GET error:", error);
    return apiServerError();
  }
}
