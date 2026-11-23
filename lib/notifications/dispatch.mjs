import { sendBrowserPush } from './send-push.mjs';
export async function dispatchNotifications(prisma, budgetMs = 40000, options = {}) {
const config = options.config ?? {
 publicKey: process.env.VAPID_PUBLIC_KEY?.trim(),
 privateKey: process.env.VAPID_PRIVATE_KEY?.trim(),
 subject: process.env.VAPID_SUBJECT?.trim(),
};
if (!config.publicKey || !config.privateKey || !config.subject) throw new Error('Missing VAPID configuration');
const ruleId = options.ruleId ?? null;
const deadline=Date.now()+budgetMs;
let processed=0;
do {
 const jobs = await prisma.$queryRaw`
 UPDATE "PushDelivery" SET status = 'processing', "leaseUntil" = NOW() + INTERVAL '2 minutes', attempts = attempts + 1
 WHERE id IN (SELECT id FROM "PushDelivery"
 WHERE ((status = 'pending' AND (attempts = 0 OR "nextAttemptAt" <= NOW())) OR (status = 'processing' AND "leaseUntil" < NOW()))
 AND (${ruleId}::text IS NULL OR "notificationId" IN (SELECT id FROM "Notification" WHERE "ruleId" = ${ruleId}))
 ORDER BY "nextAttemptAt" LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`;
 for (const claimed of jobs) {
 const job = await prisma.pushDelivery.findUnique({ where: { id: claimed.id }, include: { notification: true, subscription: true } });
 if (!job) continue;
 try {
 const s = job.subscription, n = job.notification;
 if (s.userId !== n.userId) throw Object.assign(new Error("Owner mismatch"), { statusCode: 410 });
 await sendBrowserPush(s, { id: n.id, title: n.title, body: n.body, url: n.url }, config);
 await prisma.pushDelivery.updateMany({ where: { id: job.id }, data: { status: "accepted", leaseUntil: null, lastError: null } });
 } catch (error) {
 const code = Number(error.statusCode) || 0;
 if (code === 404 || code === 410) await prisma.pushSubscription.deleteMany({ where: { id: job.subscriptionId } });
 else await prisma.pushDelivery.updateMany({ where: { id: job.id }, data: {
 status: job.attempts >= 5 || (code >= 400 && code < 500 && code !== 429) ? "failed" : "pending",
 leaseUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000),
 lastError: code ? "HTTP " + code : "Network error",
 } });
 }
 }

processed+=jobs.length;
if(!jobs.length) break;
} while(Date.now()<deadline);
return {processed};
}
