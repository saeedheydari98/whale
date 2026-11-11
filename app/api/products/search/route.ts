import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { productSearchSchema } from "@/lib/api/schemas";
import { validationError } from "@/lib/api/validation";
import { searchProducts } from "@/lib/api/catalog-service";
import { pageMetadata } from "@/lib/api/admin-list-pages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = productSearchSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  try {
    if (parsed.data.offset !== undefined) {
      url.searchParams.set("page", String(Math.floor(parsed.data.offset / (parsed.data.limit ?? 20)) + 1));
    }
    const products = await searchProducts(url.searchParams);
    return apiOk({ products, items: products.items, ...pageMetadata(products.total, parsed.data.offset ?? (products.page - 1) * products.limit, products.items.length) });
  } catch (error) {
    console.error("Product search error:", error);
    return apiServerError();
  }
}
