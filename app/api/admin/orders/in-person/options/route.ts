import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { apiOk, apiServerError } from "@/lib/api/response";
import { inPersonOrderOptionsSchema } from "@/lib/api/schemas";
import { validationError } from "@/lib/api/validation";
import { readWithRetry } from "@/lib/api/read-retry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = inPersonOrderOptionsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return validationError(parsed.error);
  const { kind, limit, offset, q } = parsed.data;
  const numericId = /^\d+$/.test(q) && Number(q) > 0 && Number(q) <= 2_147_483_647 ? Number(q) : null;

  try {
    if (kind === "products") {
      const where: Prisma.ProductWhereInput = q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          ...(numericId === null ? [] : [{ id: numericId }]),
        ],
      } : {};
      const [items, total] = await Promise.all([
        readWithRetry(() => prisma.product.findMany({
          where, take: limit, skip: offset,
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true, title: true, description: true, price: true,
            originalPrice: true, discountPrice: true, discountPercent: true,
            imageUrl: true, stockQuantity: true, colorStock: true,
            active: true, isActive: true, isAvailable: true,
          },
        })),
        readWithRetry(() => prisma.product.count({ where })),
      ]);
      return apiOk({ items, total, nextOffset: offset + items.length < total ? offset + items.length : null });
    }

    const contains = { contains: q, mode: "insensitive" as const };
    const nameParts = q.split(/\s+/);
    const where: Prisma.UserWhereInput = q ? {
      OR: [
        { name: contains }, { username: contains }, { email: contains },
        ...(numericId === null ? [] : [{ id: numericId }]),
        { profiles: { some: { OR: [
          { firstName: contains }, { lastName: contains }, { phone: contains }, { email: contains },
          // Match full names as well as individual profile fields.
          ...nameParts.slice(0, -1).map((_, index) => ({
            firstName: { contains: nameParts.slice(0, index + 1).join(" "), mode: "insensitive" as const },
            lastName: { contains: nameParts.slice(index + 1).join(" "), mode: "insensitive" as const },
          })),
        ] } } },
      ],
    } : {};
    const [items, total] = await Promise.all([
      readWithRetry(() => prisma.user.findMany({
        where, take: limit, skip: offset,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true, name: true, username: true, email: true, role: true, walletBalance: true,
          profiles: { take: 1, select: { firstName: true, lastName: true, phone: true, email: true } },
        },
      })),
      readWithRetry(() => prisma.user.count({ where })),
    ]);
    return apiOk({ items, total, nextOffset: offset + items.length < total ? offset + items.length : null });
  } catch (error) {
    console.error("In-person order options error:", error);
    return apiServerError("دریافت اطلاعات سفارش حضوری انجام نشد.");
  }
}
