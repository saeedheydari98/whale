import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        walletBalance: true,
        discountCodes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            percent: true,
            expiresAt: true,
            usedAt: true,
            createdAt: true,
            rule: { select: { name: true } },
          },
        },
        walletTransactions: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    return apiOk({
      wallet: {
        balance: user?.walletBalance ?? 0,
        discountCodes: user?.discountCodes.map(({ rule, ...code }) => ({
          ...code,
          name: rule?.name.trim() || code.name.trim(),
        })) ?? [],
        transactions: user?.walletTransactions ?? [],
      },
    });
  } catch (error) {
    console.error("Wallet GET error:", error);
    return apiServerError("دریافت اطلاعات کیف پول انجام نشد.");
  }
}
