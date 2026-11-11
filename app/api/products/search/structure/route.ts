import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { productSearchSchema } from "@/lib/api/schemas";
import { validationError } from "@/lib/api/validation";
import { countSearchProducts } from "@/lib/api/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const parsed = productSearchSchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return validationError(parsed.error);
  try { return apiOk({ structure: { count: await countSearchProducts(params) } }); }
  catch (error) { console.error("Search structure error:", error); return apiServerError("دریافت ساختار جست‌وجو انجام نشد."); }
}
