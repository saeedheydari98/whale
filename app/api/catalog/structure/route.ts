import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getCatalogStructure } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const structure = await getCatalogStructure(url.searchParams);
    return apiOk(structure);
  } catch (error) {
    console.error("Catalog structure GET error:", error);
    return apiServerError();
  }
}

