import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const authUser = await getAuthUser(request);

  try {
    if (!authUser) return apiOk({ orders: [] });

    const orders = await prisma.order.findMany({
      where: {
        userId: authUser.id,
      },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { createdAt: "desc" } } },
    });
    return apiOk({ orders });
  } catch (error) {
    console.error("User orders GET error:", error);
    return apiServerError();
  }
}
