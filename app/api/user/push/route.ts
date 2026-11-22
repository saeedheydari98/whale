import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rate-limit";
import { apiOk, apiFail, apiServerError } from "@/lib/api/response";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { pageSchema, ruleSchema, actionSchema, readSchema, subscriptionSchema } from "@/lib/notification-schemas";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { pushConfiguration } from "@/lib/env";
async function guard(r: Request) { if (r.method !== "GET" && r.headers.get("origin") && r.headers.get("origin") !== new URL(r.url).origin) return { ok: false as const, response: apiFail("Invalid request origin.", 403) }; const limited = rateLimit(r); return limited ? { ok: false as const, response: limited } : requireUser(r); }

export async function GET(request: Request) {
 const auth = await guard(request); if (!auth.ok) return auth.response;
 try {
 const config = pushConfiguration();
 const endpoint = new URL(request.url).searchParams.get("endpoint");
 return apiOk({ publicKey: config.publicKey ?? null, configured: Boolean(config.publicKey && config.privateKey && config.subject), enabled: endpoint ? Boolean(await prisma.pushSubscription.findFirst({ where: { endpoint, userId: auth.user.id } })) : false });
 } catch { return apiServerError("دریافت تنظیمات اعلان انجام نشد."); }
}
export async function POST(request: Request) {
 const auth = await guard(request); if (!auth.ok) return auth.response;
 const parsed = await parseJsonBody(request, subscriptionSchema); if (!parsed.ok) return parsed.response;
 if (!pushConfiguration().privateKey) return apiFail("پوش هنوز پیکربندی نشده است.", 503);
 try {
 const { endpoint, keys } = parsed.data;
 await prisma.$transaction(async tx => {
 await tx.pushSubscription.deleteMany({ where: { endpoint, userId: { not: auth.user.id } } });
 await tx.pushSubscription.upsert({ where: { endpoint }, create: { endpoint, userId: auth.user.id, ...keys }, update: keys });
 });
 return apiOk({});
 } catch { return apiServerError("فعال‌سازی اعلان انجام نشد."); }
}
export async function DELETE(request: Request) {
 const auth = await guard(request); if (!auth.ok) return auth.response;
 const parsed = await parseJsonBody(request, z.object({ endpoint: z.string().max(2048) })); if (!parsed.ok) return parsed.response;
 try { await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: auth.user.id } }); return apiOk({}); }
 catch { return apiServerError("غیرفعال‌سازی اعلان انجام نشد."); }
}

