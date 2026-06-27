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
  const url = new URL(request.url);
  const nationalId = String(url.searchParams.get("nationalId") ?? "").trim();

  try {
    const profile = nationalId
      ? await prisma.customerProfile.findUnique({ where: { nationalId } })
      : null;
    if (!authUser && !profile) return apiOk({ orders: [] });

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          ...(authUser ? [{ userId: authUser.id }] : []),
          ...(profile ? [{ profileId: profile.id }] : []),
        ],
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
