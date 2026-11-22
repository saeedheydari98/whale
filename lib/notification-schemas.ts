import { z } from "zod";
export const ruleSchema = z.object({
 name: z.string().trim().min(1).max(100), title: z.string().trim().min(1).max(100), body: z.string().trim().min(1).max(1000),
 url: z.string().max(500).refine(v => v.startsWith("/") && !v.startsWith("//") && !/[\\\r\n]/.test(v)).default("/panel/user"),
 audienceType: z.enum(["all", "selected", "new_users", "purchase_count", "purchase_amount", "no_purchase"]),
 minimumValue: z.number().int().min(1).max(2000000000).default(1), lookbackDays: z.number().int().min(1).max(3650).default(30),
 userIds: z.array(z.number().int().positive()).max(1000).default([]),
}).refine(v => v.audienceType !== "selected" || v.userIds.length > 0)
  .refine(v => new TextEncoder().encode(JSON.stringify({ title: v.title, body: v.body, url: v.url })).length <= 3500, { message: "حجم متن و آدرس اعلان بیش از حد مجاز پوش است." });
export const actionSchema = z.object({ id: z.string().min(1), action: z.enum(["run", "toggle"]), active: z.boolean().optional() });
export const pageSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().min(0).default(0) });
export const readSchema = z.object({ id: z.string().min(1).optional() });
export const endpointSchema = z.string().url().max(2048).refine(value => {
 const u = new URL(value);
 return u.protocol === "https:" && !u.username && !u.password && !u.port &&
 ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].some(h => u.hostname === h || u.hostname.endsWith("." + h));
});
export const subscriptionSchema = z.object({ endpoint: endpointSchema, keys: z.object({
 p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
}) });

