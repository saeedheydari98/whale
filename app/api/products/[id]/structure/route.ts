import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getProductDetailPageStructure } from "@/lib/api/catalog-layer-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const [{ id }, url] = await Promise.all([
      context.params,
      Promise.resolve(new URL(request.url)),
    ]);
    return apiOk(await getProductDetailPageStructure(id, url.searchParams));
  } catch (error) {
    console.error("Product detail structure GET error:", error);
    return apiServerError();
  }
}
