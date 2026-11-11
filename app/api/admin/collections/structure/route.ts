import { requireAdmin } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { apiOk, apiServerError } from "@/lib/api/response";
import { validationError } from "@/lib/api/validation";
import { adminCollectionStructureSchema } from "@/lib/api/schemas";
import { countAdminOrders, countAdminUsers } from "@/lib/api/admin-list-pages";
import { readWithRetry } from "@/lib/api/read-retry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const parsed = adminCollectionStructureSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return validationError(parsed.error);
  try {
    const count = await readWithRetry(() => parsed.data.collection === "users" ? countAdminUsers(parsed.data) : countAdminOrders(parsed.data));
    return apiOk({ structure: { count } });
  } catch (error) {
    console.error("Admin collection structure error:", error);
    return apiServerError("دریافت ساختار اطلاعات انجام نشد.");
  }
}
