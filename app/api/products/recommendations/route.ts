import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getProductDetail, getRecommendationProducts } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const productId = String(url.searchParams.get("productId") ?? "").trim();
    const detail = productId ? await getProductDetail(productId, url.searchParams) : null;
    const data = await getRecommendationProducts(detail?.product ? detail.product as any : null, url.searchParams);
    return apiOk(data);
  } catch (error) {
    console.error("Product recommendations GET error:", error);
    return apiServerError();
  }
}

