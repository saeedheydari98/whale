import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { apiOk, apiFail, apiServerError } from "@/lib/api/response";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { pageSchema, ruleSchema, actionSchema, readSchema, subscriptionSchema } from "@/lib/notification-schemas";
export const dynamic = "force-dynamic";
async function guard(r: Request) { if (r.method !== "GET" && r.headers.get("origin") && r.headers.get("origin") !== new URL(r.url).origin) return { ok: false as const, response: apiFail("Invalid request origin.", 403) }; const limited = rateLimit(r); return limited ? { ok: false as const, response: limited } : requireUser(r); }

export async function GET(request: Request) {
 const auth = await guard(request); if (!auth.ok) return auth.response;
 try {
 const where = { userId: auth.user.id }, params = new URL(request.url).searchParams;
 const [total, unread] = await Promise.all([prisma.notification.count({ where }), prisma.notification.count({ where: { ...where, readAt: null } })]);
 if (params.has("structure")) return apiOk({ structure: { count: total }, unread });
 const parsed = pageSchema.safeParse(Object.fromEntries(params)); if (!parsed.success) return validationError(parsed.error);
 const { limit, offset } = parsed.data;
 const items = await prisma.notification.findMany({ where, take: limit, skip: offset, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
 return apiOk({ items, total, unread, nextOffset: offset + items.length < total ? offset + items.length : null });
 } catch { return apiServerError("دریافت اعلان‌ها انجام نشد."); }
}
export async function PATCH(request: Request) {
 const auth = await guard(request); if (!auth.ok) return auth.response;
 const parsed = await parseJsonBody(request, readSchema); if (!parsed.ok) return parsed.response;
 try { await prisma.notification.updateMany({ where: { userId: auth.user.id, readAt: null, ...(parsed.data.id ? { id: parsed.data.id } : {}) }, data: { readAt: new Date() } }); return apiOk({}); }
 catch { return apiServerError("ثبت خواندن اعلان انجام نشد."); }
}

