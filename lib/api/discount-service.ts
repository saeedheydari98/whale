import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DISCOUNT_AUDIENCES = ["new_users", "purchase_count", "purchase_amount"] as const;
export const DISCOUNT_TYPES = ["percentage", "free_shipping"] as const;
export type DiscountAudience = (typeof DISCOUNT_AUDIENCES)[number];
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

type IssueDiscountInput = {
  userId: number;
  name: string;
  type: DiscountType;
  percent?: number | null;
  validDays: number;
  ruleId?: string | null;
};

function randomDiscountCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const alphabet = `${letters}${digits}`;
  const characters = [
    letters[randomInt(letters.length)],
    digits[randomInt(digits.length)],
    ...Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]),
  ];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const targetIndex = randomInt(index + 1);
    [characters[index], characters[targetIndex]] = [characters[targetIndex], characters[index]];
  }
  return characters.join("");
}

export async function issueDiscountCode(input: IssueDiscountInput) {
  if (input.ruleId) {
    const existing = await prisma.discountCode.findUnique({
      where: { ruleId_userId: { ruleId: input.ruleId, userId: input.userId } },
    });
    if (existing) {
      const discountCode = existing.name === input.name
        ? existing
        : await prisma.discountCode.update({ where: { id: existing.id }, data: { name: input.name } });
      return { discountCode, created: false };
    }
  }

  const expiresAt = new Date(Date.now() + input.validDays * 24 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const discountCode = await prisma.discountCode.create({
        data: {
          name: input.name,
          code: randomDiscountCode(),
          userId: input.userId,
          ruleId: input.ruleId ?? null,
          type: input.type,
          percent: input.type === "percentage" ? input.percent : null,
          expiresAt,
        },
      });
      return { discountCode, created: true };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      if (input.ruleId) {
        const existing = await prisma.discountCode.findUnique({
          where: { ruleId_userId: { ruleId: input.ruleId, userId: input.userId } },
        });
        if (existing) {
          const discountCode = existing.name === input.name
            ? existing
            : await prisma.discountCode.update({ where: { id: existing.id }, data: { name: input.name } });
          return { discountCode, created: false };
        }
      }
    }
  }
  throw new Error("Unable to allocate a unique discount code");
}

function isEligible(
  rule: { audienceType: string; minimumValue: number; lookbackDays: number },
  user: { createdAt: Date; orders: Array<{ total: string; subtotal: string; discountAmount: string; createdAt: Date }> },
  now: Date
) {
  const since = new Date(now.getTime() - rule.lookbackDays * 24 * 60 * 60 * 1000);
  if (rule.audienceType === "new_users") return user.createdAt >= since;
  const recentOrders = user.orders.filter((order) => order.createdAt >= since);
  if (rule.audienceType === "purchase_count") return recentOrders.length >= rule.minimumValue;
  if (rule.audienceType === "purchase_amount") {
    return recentOrders.reduce((sum, order) => {
      const subtotal = Math.max(0, Number(order.subtotal) || 0);
      const productAmount = subtotal > 0
        ? Math.max(0, subtotal - (Number(order.discountAmount) || 0))
        : Math.max(0, Number(order.total) || 0);
      return sum + productAmount;
    }, 0) >= rule.minimumValue;
  }
  return false;
}

export async function runDiscountRules(options?: { userIds?: number[] }) {
  const rules = await prisma.discountRule.findMany({ where: { active: true } });
  if (rules.length === 0) return { issuedCount: 0, evaluatedUsers: 0 };

  const userIds = options?.userIds?.filter((id) => Number.isInteger(id) && id > 0);
  const oldestOrderDate = new Date(Date.now() - Math.max(...rules.map((rule) => rule.lookbackDays)) * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: userIds?.length ? { id: { in: Array.from(new Set(userIds)) } } : undefined,
    select: {
      id: true,
      createdAt: true,
      orders: {
        where: { createdAt: { gte: oldestOrderDate } },
        select: { total: true, subtotal: true, discountAmount: true, createdAt: true },
      },
      discountCodes: { where: { ruleId: { not: null } }, select: { ruleId: true } },
    },
  });
  const now = new Date();
  let issuedCount = 0;

  for (const rule of rules) {
    for (const user of users) {
      if (user.discountCodes.some((code) => code.ruleId === rule.id)) continue;
      if (!isEligible(rule, user, now)) continue;
      const issued = await issueDiscountCode({
        userId: user.id,
        name: rule.name,
        ruleId: rule.id,
        type: rule.discountType === "free_shipping" ? "free_shipping" : "percentage",
        percent: rule.percent,
        validDays: rule.validDays,
      });
      if (issued.created) issuedCount += 1;
    }
  }

  await prisma.discountRule.updateMany({
    where: { id: { in: rules.map((rule) => rule.id) } },
    data: { lastRunAt: now },
  });
  return { issuedCount, evaluatedUsers: users.length };
}
