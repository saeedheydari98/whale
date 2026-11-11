import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { userWalletQuerySchema } from "@/lib/api/schemas";
import { validationError } from "@/lib/api/validation";
import { pageMetadata } from "@/lib/api/admin-list-pages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const params = new URL(request.url).searchParams;
    if (params.has("scope")) {
      const parsed = userWalletQuerySchema.safeParse({ limit: 1, ...Object.fromEntries(params) });
      if (!parsed.success) return validationError(parsed.error);
      const { scope, limit, offset } = parsed.data;
      if (scope === "summary") {
        const user = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { walletBalance: true } });
        return apiOk({ wallet: { balance: user?.walletBalance ?? 0 } });
      }
      if (scope === "transactions") {
        const where = { userId: auth.user.id };
        const [transactions, total] = await Promise.all([
          prisma.walletTransaction.findMany({ where, take: limit, skip: offset, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
          prisma.walletTransaction.count({ where }),
        ]);
        return apiOk({ transactions, ...pageMetadata(total, offset, transactions.length) });
      }
      const where = { userId: auth.user.id, usedAt: null, expiresAt: { gt: new Date() } };
      const [codes, total] = await Promise.all([
        prisma.discountCode.findMany({ where, take: limit, skip: offset, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, name: true, code: true, type: true, percent: true, expiresAt: true, usedAt: true, rule: { select: { name: true } } } }),
        prisma.discountCode.count({ where }),
      ]);
      return apiOk({ codes: codes.map(({ rule, ...code }) => ({ ...code, name: rule?.name.trim() || code.name.trim() })), ...pageMetadata(total, offset, codes.length) });
    }
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
