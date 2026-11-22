import { prisma } from "@/lib/prisma";
export async function runNotificationRule(id: string) {
 const rule = await prisma.notificationRule.findUniqueOrThrow({ where: { id } });
 if (!rule.active) return { created: 0 };
 const since = new Date(Date.now() - rule.lookbackDays * 86400000);
 let cursor = 0, created = 0;
 while (true) {
 const users = await prisma.user.findMany({
 where: { id: { gt: cursor, ...(rule.audienceType === "selected" ? { in: rule.userIds } : {}) } },
 orderBy: { id: "asc" }, take: 100,
 select: { id: true, createdAt: true, orders: { where: { createdAt: { gte: since }, status: "paid" }, select: { total: true, subtotal: true, discountAmount: true } } },
 });
 if (!users.length) break;
 for (const user of users) {
 const amount = user.orders.reduce((sum,o) => sum + Math.max(0, Number(o.subtotal) > 0 ? Number(o.subtotal) - Number(o.discountAmount) : Number(o.total) || 0), 0);
 const eligible = ["all", "selected"].includes(rule.audienceType)
 || (rule.audienceType === "new_users" && user.createdAt >= since)
 || (rule.audienceType === "purchase_count" && user.orders.length >= rule.minimumValue)
 || (rule.audienceType === "purchase_amount" && amount >= rule.minimumValue)
 || (rule.audienceType === "no_purchase" && user.orders.length === 0);
 if (!eligible) continue;
 created += await prisma.$transaction(async tx => {
 const inserted = await tx.notification.createMany({ data: [{ userId: user.id, ruleId: rule.id, title: rule.title, body: rule.body, url: rule.url }], skipDuplicates: true });
 if (!inserted.count) return 0;
 const notification = await tx.notification.findUniqueOrThrow({ where: { ruleId_userId: { ruleId: rule.id, userId: user.id } } });
 const subscriptions = await tx.pushSubscription.findMany({ where: { userId: user.id }, select: { id: true } });
 if (subscriptions.length) await tx.pushDelivery.createMany({ data: subscriptions.map(s => ({ notificationId: notification.id, subscriptionId: s.id })) });
 return 1;
 });
 }
 cursor = users[users.length - 1].id;
 }
 return { created };
}

