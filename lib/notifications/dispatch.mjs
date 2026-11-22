import * as webpush from 'web-push';
export async function dispatchNotifications(prisma, budgetMs = 40000) {
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) throw new Error('Missing VAPID configuration');
webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);
const deadline=Date.now()+budgetMs;
let processed=0;
do {
 const jobs = await prisma.$queryRaw`
 UPDATE "PushDelivery" SET status = 'processing', "leaseUntil" = NOW() + INTERVAL '2 minutes', attempts = attempts + 1
 WHERE id IN (SELECT id FROM "PushDelivery"
 WHERE (status = 'pending' AND "nextAttemptAt" <= NOW()) OR (status = 'processing' AND "leaseUntil" < NOW())
 ORDER BY "nextAttemptAt" LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`;
 for (const claimed of jobs) {
 const job = await prisma.pushDelivery.findUnique({ where: { id: claimed.id }, include: { notification: true, subscription: true } });
 if (!job) continue;
 try {
 const s = job.subscription, n = job.notification;
 if (s.userId !== n.userId) throw Object.assign(new Error("Owner mismatch"), { statusCode: 410 });
 await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
 JSON.stringify({ id: n.id, title: n.title, body: n.body, url: n.url }), { TTL: 86400, timeout: 10000 });
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
