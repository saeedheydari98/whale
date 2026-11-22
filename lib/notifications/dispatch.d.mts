import type { PrismaClient } from "@prisma/client";
export function dispatchNotifications(prisma: PrismaClient, budgetMs?: number): Promise<{ processed: number }>;
