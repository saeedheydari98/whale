import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody } from "@/lib/api/validation";
import { inPersonOrderSchema } from "@/lib/api/schemas";
import { CheckoutError } from "@/lib/api/order-core";
import { completeInPersonOrder } from "@/lib/api/in-person-order-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, inPersonOrderSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await completeInPersonOrder({
      customerUserId: parsed.data.customerUserId ?? null,
      newCustomer: parsed.data.newCustomer ?? null,
      discountCode: parsed.data.discountCode,
      useWallet: parsed.data.useWallet === true,
      lines: parsed.data.lines,
    });
    return apiOk({ order: result }, {
      status: 201,
      message: "IN_PERSON_ORDER_CREATED",
      showMessage: "سفارش حضوری با موفقیت ثبت شد.",
    });
  } catch (error) {
    if (error instanceof CheckoutError) return apiFail(error.message, error.status);
    console.error("In-person order creation error:", error);
    return apiServerError("ثبت سفارش حضوری انجام نشد. لطفاً دوباره تلاش کنید.");
  }
}
