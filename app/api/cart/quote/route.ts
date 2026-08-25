import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { CheckoutError, normalizeShippingMethod, quoteCheckout } from "@/lib/api/checkout-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const quote = await quoteCheckout({
      userId: auth.user.id,
      shippingMethod: normalizeShippingMethod(body.shippingMethod),
      discountCode: body.discountCode,
    });
    return apiOk({ quote });
  } catch (error) {
    if (error instanceof CheckoutError) return apiFail(error.message, error.status);
    console.error("Checkout quote error:", error);
    return apiServerError("استعلام مبلغ پرداخت انجام نشد.");
  }
}
