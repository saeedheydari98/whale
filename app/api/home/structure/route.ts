import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getHomePageStructure } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    return apiOk(await getHomePageStructure(url.searchParams));
  } catch (error) {
    console.error("Home structure GET error:", error);
    return apiServerError();
  }
}
