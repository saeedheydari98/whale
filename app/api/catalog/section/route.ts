import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getPageSectionData } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const type = String(url.searchParams.get("type") ?? "").trim();
    const id = String(url.searchParams.get("id") ?? "").trim();
    if (!type || !id) return apiFail("type and id are required.", 400);
    return apiOk(await getPageSectionData(url.searchParams));
  } catch (error) {
    console.error("Catalog section GET error:", error);
    return apiServerError();
  }
}
