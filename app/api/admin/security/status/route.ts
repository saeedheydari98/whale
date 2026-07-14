import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    return apiOk({ security: { hasCode: false, isPanelLocked: false } });
  } catch (error) {
    console.error("Admin security status error:", error);
    return apiServerError();
  }
}
