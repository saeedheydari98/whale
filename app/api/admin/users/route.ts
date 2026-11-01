import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { readWithRetry } from "@/lib/api/read-retry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OrderStat = {
  orderCount: number;
  orderTotal: number;
  lastOrderAt: string | null;
};

type AggregatedOrderStat = {
  userId: number;
  orderCount: number;
  orderTotal: number;
  lastOrderAt: Date | null;
};

function emptyOrderStat(): OrderStat {
  return { orderCount: 0, orderTotal: 0, lastOrderAt: null };
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const [users, orderStats] = await Promise.all([
      readWithRetry(() => prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          walletBalance: true,
          createdAt: true,
          profiles: {
            take: 1,
            select: { firstName: true, lastName: true, phone: true, email: true },
          },
        },
      })),
      readWithRetry(() => prisma.$queryRaw<AggregatedOrderStat[]>`
        WITH normalized_orders AS (
          SELECT
            "userId",
            "createdAt",
            regexp_replace(
              translate("total", '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'),
              '[^0-9.]',
              '',
              'g'
            ) AS normalized_total
          FROM "Order"
          WHERE "userId" IS NOT NULL
        )
        SELECT
          "userId",
          COUNT(*)::int AS "orderCount",
          COALESCE(
            SUM(
              CASE
                WHEN normalized_total ~ '^([0-9]+([.][0-9]*)?|[.][0-9]+)$'
                  THEN normalized_total::numeric
                ELSE 0
              END
            ),
            0
          )::float8 AS "orderTotal",
          MAX("createdAt") AS "lastOrderAt"
        FROM normalized_orders
        GROUP BY "userId"
      `),
    ]);

    const statsByUser = new Map<number, OrderStat>();
    for (const stats of orderStats) {
      statsByUser.set(stats.userId, {
        orderCount: stats.orderCount,
        orderTotal: stats.orderTotal,
        lastOrderAt: stats.lastOrderAt?.toISOString() ?? null,
      });
    }

    return apiOk({
      users: users.map((user) => {
        const stats = statsByUser.get(user.id) ?? emptyOrderStat();
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          walletBalance: user.walletBalance,
          createdAt: user.createdAt.toISOString(),
          profiles: user.profiles,
          orderCount: stats.orderCount,
          orderTotal: stats.orderTotal,
          lastOrderAt: stats.lastOrderAt,
        };
      }),
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return apiServerError("دریافت کاربران انجام نشد.");
  }
}
