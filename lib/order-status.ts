export const ORDER_STATUSES = [
  "pending_approval",
  "processing",
  "shipped",
  "delivered",
] as const;

export type OrderFulfillmentStatus = (typeof ORDER_STATUSES)[number];

export type OrderStatusEventRecord = {
  id?: string;
  status: string;
  createdAt: string;
};

export const ORDER_STATUS_LABELS: Record<OrderFulfillmentStatus, string> = {
  pending_approval: "در انتظار تأیید",
  processing: "در حال جمع‌آوری یا بسته‌بندی",
  shipped: "ارسال شده",
  delivered: "تحویل داده شده",
};

export function normalizeOrderStatus(value?: string | null): OrderFulfillmentStatus {
  if (value === "posted") return "shipped";
  if (value === "pending") return "pending_approval";
  if (value === "in_transit") return "processing";
  return ORDER_STATUSES.includes(value as OrderFulfillmentStatus)
    ? value as OrderFulfillmentStatus
    : "pending_approval";
}

export function orderStatusIndex(value?: string | null) {
  return ORDER_STATUSES.indexOf(normalizeOrderStatus(value));
}

export function nextOrderStatus(value?: string | null): OrderFulfillmentStatus | null {
  const nextIndex = orderStatusIndex(value) + 1;
  return ORDER_STATUSES[nextIndex] ?? null;
}
