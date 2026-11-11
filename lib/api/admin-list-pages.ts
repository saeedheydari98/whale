import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminListQuerySchema } from "./schemas";

type ListQuery = z.infer<typeof adminListQuerySchema>;
const numericTotal = Prisma.sql`CASE WHEN normalized_total ~ '^([0-9]+([.][0-9]*)?|[.][0-9]+)$' THEN normalized_total::numeric ELSE 0 END`;
const normalizedOrders = Prisma.sql`SELECT o.*, regexp_replace(translate(o."total", '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'), '[^0-9.]', '', 'g') AS normalized_total FROM "Order" o`;
const pattern = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`;
const normalizeSearch = (expression: Prisma.Sql) => Prisma.sql`translate(${expression}, 'يك۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', 'یک01234567890123456789')`;
const searchPattern = (value: string) => pattern(value.replaceAll("ي", "ی").replaceAll("ك", "ک").replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))));
export const pageMetadata = (total: number, offset: number, length: number) => ({ total, nextOffset: length > 0 && offset + length < total ? offset + length : null });

function adminUserClauses(query: ListQuery) {
  const from = Prisma.sql`FROM "users" u LEFT JOIN LATERAL (SELECT p.* FROM "CustomerProfile" p WHERE p."userId" = u.id ORDER BY p."updatedAt" DESC, p.id LIMIT 1) p ON true`;
  const where = query.q ? Prisma.sql`WHERE ${normalizeSearch(Prisma.sql`concat_ws(' ', u.id, u.name, u.username, u.email, u.role, p."firstName", p."lastName", p.phone, p.email)`)} ILIKE ${searchPattern(query.q)}` : Prisma.empty;
  return { from, where };
}

export async function countAdminUsers(query: ListQuery) {
  const { from, where } = adminUserClauses(query);
  const rows = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`SELECT COUNT(*)::int AS total ${from} ${where}`);
  return rows[0].total;
}

export async function readAdminUserPage(query: ListQuery) {
  const { from, where } = adminUserClauses(query);
  const stats = Prisma.sql`WITH normalized_orders AS (${normalizedOrders}), stats AS (SELECT "userId", COUNT(*)::int AS "orderCount", SUM(${numericTotal})::float8 AS "orderTotal", MAX("createdAt") AS "lastOrderAt" FROM normalized_orders GROUP BY "userId")`;
  const sort = ({ name: `COALESCE(NULLIF(trim(concat_ws(' ', p."firstName", p."lastName")), ''), u.name, u.username, u.email)`, role: `u.role`, createdAt: `u."createdAt"`, orderCount: `COALESCE(s."orderCount",0)`, orderTotal: `COALESCE(s."orderTotal",0)`, walletBalance: `u."walletBalance"`, lastOrderAt: `s."lastOrderAt"` } as Record<string, string>)[query.sort] ?? `u."createdAt"`;
  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<Array<{ id: number; orderCount: number; orderTotal: number; lastOrderAt: Date | null }>>(Prisma.sql`${stats} SELECT u.id, COALESCE(s."orderCount",0)::int AS "orderCount", COALESCE(s."orderTotal",0)::float8 AS "orderTotal", s."lastOrderAt" ${from} LEFT JOIN stats s ON s."userId" = u.id ${where} ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(query.direction)}, u.id ${Prisma.raw(query.direction)} LIMIT ${query.limit} OFFSET ${query.offset}`),
    prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`SELECT COUNT(*)::int AS total ${from} ${where}`),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    select: { id: true, name: true, username: true, email: true, role: true, walletBalance: true, createdAt: true, profiles: { orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 1, select: { firstName: true, lastName: true, phone: true, email: true } } },
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  return { users: rows.flatMap((row) => {
    const user = byId.get(row.id);
    return user ? [{ ...user, orderCount: row.orderCount, orderTotal: row.orderTotal, lastOrderAt: row.lastOrderAt?.toISOString() ?? null }] : [];
  }), ...pageMetadata(counts[0].total, query.offset, rows.length) };
}

function adminOrderClauses(query: ListQuery) {
  const from = Prisma.sql`FROM normalized_orders o LEFT JOIN "users" u ON u.id = o."userId" LEFT JOIN "CustomerProfile" p ON p.id = o."profileId" LEFT JOIN LATERAL (SELECT SUM(i.quantity) AS quantity, string_agg(concat_ws(' ', i.id, i."productId", i.title, i."selectedColor"), ' ') AS search FROM "OrderItem" i WHERE i."orderId" = o.id) i ON true`;
  const conditions = [Prisma.sql`true`];
  if (query.view) conditions.push(Prisma.sql`o."orderType" = ${query.view}`);
  if (query.from !== undefined) conditions.push(Prisma.sql`o."createdAt" >= ${new Date(query.from)}`);
  if (query.to !== undefined) conditions.push(Prisma.sql`o."createdAt" <= ${new Date(query.to)}`);
  if (query.q) conditions.push(Prisma.sql`${normalizeSearch(Prisma.sql`concat_ws(' ', o.id, o."fulfillmentStatus", o."trackingCode", o.total, o."createdAt", CASE WHEN o."orderType" = 'in_person' THEN 'حضوری' ELSE 'آنلاین' END, u.name, u.username, u.email, p."firstName", p."lastName", p.phone, p.email, p.address, i.search)`)} ILIKE ${searchPattern(query.q)}`);
  const where = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
  return { from, where };
}

export async function countAdminOrders(query: ListQuery) {
  const { from, where } = adminOrderClauses(query);
  const rows = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`WITH normalized_orders AS (${normalizedOrders}) SELECT COUNT(*)::int AS total ${from} ${where}`);
  return rows[0].total;
}

export async function readAdminOrderPageIds(query: ListQuery) {
  const { from, where } = adminOrderClauses(query);
  const sort = ({ id: `o.id`, customer: `COALESCE(NULLIF(trim(concat_ws(' ', p."firstName", p."lastName")), ''), u.name, u.username, '')`, status: `o."fulfillmentStatus"`, createdAt: `o."createdAt"`, items: `COALESCE(i.quantity,0)`, total: `CASE WHEN o.normalized_total ~ '^([0-9]+([.][0-9]*)?|[.][0-9]+)$' THEN o.normalized_total::numeric ELSE 0 END` } as Record<string, string>)[query.sort] ?? `o."createdAt"`;
  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`WITH normalized_orders AS (${normalizedOrders}) SELECT o.id ${from} ${where} ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(query.direction)}, o.id ${Prisma.raw(query.direction)} LIMIT ${query.limit} OFFSET ${query.offset}`),
    prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`WITH normalized_orders AS (${normalizedOrders}) SELECT COUNT(*)::int AS total ${from} ${where}`),
  ]);
  return { ids: rows.map((row) => row.id), ...pageMetadata(counts[0].total, query.offset, rows.length) };
}
