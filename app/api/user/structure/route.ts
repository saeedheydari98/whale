import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

async function readUserPanelStructure(userId: number) {
  const [orders, discountStats] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.$queryRaw<Array<{ discounts: unknown; unseen: unknown }>>`
      SELECT
        COUNT(*)::int AS discounts,
        COUNT(*) FILTER (WHERE "seenAt" IS NULL)::int AS unseen
      FROM "DiscountCode"
      WHERE "userId" = ${userId}
        AND "usedAt" IS NULL
        AND "expiresAt" > NOW()
    `,
  ]);
  const stats = discountStats[0];
  return {
    orders,
    discounts: asCount(stats?.discounts),
    unseenDiscounts: asCount(stats?.unseen),
  };
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    return apiOk({ structure: await readUserPanelStructure(auth.user.id) });
  } catch (error) {
    console.error("User structure GET error:", error);
    return apiServerError("دریافت ساختار حساب ممکن نشد.");
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const seenDiscounts = Boolean(
      body && typeof body === "object" && !Array.isArray(body) && (body as { seenDiscounts?: unknown }).seenDiscounts === true
    );
    if (seenDiscounts) {
      await prisma.$executeRaw`
        UPDATE "DiscountCode"
        SET "seenAt" = NOW()
        WHERE "userId" = ${auth.user.id}
          AND "usedAt" IS NULL
          AND "seenAt" IS NULL
          AND "expiresAt" > NOW()
      `;
    }
    return apiOk({ structure: await readUserPanelStructure(auth.user.id) });
  } catch (error) {
    console.error("User structure POST error:", error);
    return apiServerError("به‌روزرسانی ساختار حساب ممکن نشد.");
  }
}
