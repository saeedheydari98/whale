import { after } from "next/server";
import { dispatchNotifications } from "@/lib/notifications/dispatch.mjs";
export const maxDuration = 300;
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { apiOk, apiFail, apiServerError } from "@/lib/api/response";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { pageSchema, ruleSchema, actionSchema, readSchema, subscriptionSchema } from "@/lib/notification-schemas";
export const dynamic = "force-dynamic";
import { runNotificationRule } from "@/lib/api/notification-service";
async function guard(r: Request) { if (r.method !== "GET" && r.headers.get("origin") && r.headers.get("origin") !== new URL(r.url).origin) return { ok: false as const, response: apiFail("Invalid request origin.", 403) }; const limited = rateLimit(r); return limited ? { ok: false as const, response: limited } : requireAdmin(r); }

export async function GET(request: Request) {
 const auth = await guard(request); if (!auth.ok) return auth.response;
 try {
 const params = new URL(request.url).searchParams, total = await prisma.notificationRule.count();
 if (params.has("structure")) return apiOk({ structure: { count: total } });
 const parsed = pageSchema.safeParse(Object.fromEntries(params)); if (!parsed.success) return validationError(parsed.error);
 const { limit, offset } = parsed.data;
 const items = await prisma.notificationRule.findMany({ take: limit, skip: offset, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { _count: { select: { notifications: true } } } });
 return apiOk({ items, total, nextOffset: offset + items.length < total ? offset + items.length : null });
 } catch { return apiServerError("دریافت قوانین اعلان انجام نشد."); }
}
export async function POST(request: Request) {
 const auth = await guard(request); if (!auth.ok) return auth.response;
 const parsed = await parseJsonBody(request, ruleSchema); if (!parsed.ok) return parsed.response;
 try { return apiOk({ rule: await prisma.notificationRule.create({ data: parsed.data }) }); }
 catch { return apiServerError("ثبت قانون اعلان انجام نشد."); }
}
export async function PATCH(request: Request) {
 const auth = await guard(request); if (!auth.ok) return auth.response;
 const parsed = await parseJsonBody(request, actionSchema); if (!parsed.ok) return parsed.response;
 try {
 const { id, action, active } = parsed.data;
 if (action === "run") { const result = await runNotificationRule(id); after(async () => { try { await dispatchNotifications(prisma, 40000); } catch { console.error("Notification dispatch failed; retained for retry."); } }); return apiOk(result); }
 return apiOk({ rule: await prisma.notificationRule.update({ where: { id }, data: { active: active ?? false } }) });
 } catch { return apiServerError("اجرای قانون اعلان انجام نشد."); }
}

