import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const orders = await prisma.order.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { createdAt: "desc" } } },
    });
    return apiOk({ orders });
  } catch (error) {
    console.error("User orders GET error:", error);
    return apiServerError();
  }
}
