import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { adminListQuerySchema } from "@/lib/api/schemas";
import { validationError } from "@/lib/api/validation";
import { pageMetadata } from "@/lib/api/admin-list-pages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const authUser = await getAuthUser(request);

  try {
    if (!authUser) return apiOk({ orders: [], total: 0, nextOffset: null });
    const params = new URL(request.url).searchParams;
    const parsed = params.has("limit") ? adminListQuerySchema.safeParse(Object.fromEntries(params)) : null;
    if (parsed && !parsed.success) return validationError(parsed.error);
    const page = parsed?.success ? parsed.data : null;

    const orders = await prisma.order.findMany({
      where: {
        userId: authUser.id,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: page?.limit,
      skip: page?.offset,
      include: {
        items: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    const total = page ? await prisma.order.count({ where: { userId: authUser.id } }) : orders.length;
    return apiOk({ orders, ...pageMetadata(total, page?.offset ?? 0, orders.length) });
  } catch (error) {
    console.error("User orders GET error:", error);
    return apiServerError();
  }
}
