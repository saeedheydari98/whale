import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") ?? 8)));

  try {
    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: { id: true, title: true, imageUrl: true, price: true },
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return apiOk({ suggestions: products });
  } catch (error) {
    console.error("Product suggestions error:", error);
    return apiServerError();
  }
}
