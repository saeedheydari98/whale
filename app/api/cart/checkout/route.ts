import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { CheckoutError, completeCheckout, normalizeShippingMethod } from "@/lib/api/checkout-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await completeCheckout({
      userId: auth.user.id,
      shippingMethod: normalizeShippingMethod(body.shippingMethod),
      discountCode: body.discountCode,
    });
    return apiOk({ checkout: result }, {
      message: "ORDER_CREATED",
      showMessage: "سفارش با موفقیت ثبت شد.",
    });
  } catch (error) {
    if (error instanceof CheckoutError) return apiFail(error.message, error.status);
    console.error("Checkout error:", error);
    return apiServerError("ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید.");
  }
}
