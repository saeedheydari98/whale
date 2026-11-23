import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { apiOk, apiServerError } from "@/lib/api/response";
import { validationError } from "@/lib/api/validation";
import { endpointSchema } from "@/lib/notification-schemas";

export const dynamic = "force-dynamic";
const schema = z.object({ endpoint: endpointSchema, cursor: z.string().min(1).max(100).optional() });

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return validationError(parsed.error);
  try {
    const { endpoint, cursor } = parsed.data;
    const subscription = await prisma.pushSubscription.findFirst({ where: { endpoint, userId: auth.user.id }, select: { id: true } });
    if (!subscription) return apiOk({ enabled: false, items: [], cursor: null });
    // This is a bounded delivery feed, not the inbox's paginated UI collection.
    const items = await prisma.pushDelivery.findMany({
      where: { subscriptionId: subscription.id, notification: { userId: auth.user.id, createdAt: { gte: new Date(Date.now() - 86400000) } } },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ notification: { createdAt: "asc" } }, { id: "asc" }], take: 20,
      select: { id: true, notification: { select: { id: true, title: true, body: true, url: true } } },
    });
    return apiOk({ enabled: true, items: items.map(item => item.notification), cursor: items.at(-1)?.id ?? cursor ?? null });
  } catch { return apiServerError("دریافت اعلان مرورگر انجام نشد."); }
}
