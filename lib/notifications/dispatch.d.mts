import type { PrismaClient } from "@prisma/client";
export function dispatchNotifications(prisma: PrismaClient, budgetMs?: number, options?: {
 ruleId?: string;
 config?: { publicKey?: string; privateKey?: string; subject?: string };
}): Promise<{ processed: number }>;
