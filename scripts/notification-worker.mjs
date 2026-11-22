import { PrismaClient } from "@prisma/client";
import * as webpush from "web-push";
import { setTimeout as sleep } from "node:timers/promises";
const prisma = new PrismaClient();
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) throw new Error("Configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.");
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
let stopped = false;
process.on("SIGTERM", () => { stopped = true; });
process.on("SIGINT", () => { stopped = true; });
try {
 do {
 // Claim atomically; expired leases recover after a crash.
 const jobs = await prisma.$queryRaw`
 UPDATE "PushDelivery" SET status = 'processing', "leaseUntil" = NOW() + INTERVAL '2 minutes', attempts = attempts + 1
 WHERE id IN (SELECT id FROM "PushDelivery"
 WHERE (status = 'pending' AND "nextAttemptAt" <= NOW()) OR (status = 'processing' AND "leaseUntil" < NOW())
 ORDER BY "nextAttemptAt" LIMIT 5 FOR UPDATE SKIP LOCKED) RETURNING id`;
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
 if (process.argv.includes("--once")) break;
 if (!jobs.length) await sleep(5000);
 } while (!stopped);
} finally { await prisma.$disconnect(); }

