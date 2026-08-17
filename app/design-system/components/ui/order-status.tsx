import { IoCheckmarkCircle, IoEllipseOutline } from "react-icons/io5";
import {
  normalizeOrderStatus,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  orderStatusIndex,
  type OrderStatusEventRecord,
} from "@/lib/order-status";

type OrderStatusTagProps = {
  status?: string | null;
};

type OrderStatusTimelineProps = OrderStatusTagProps & {
  history?: OrderStatusEventRecord[] | null;
  createdAt?: string | null;
};

function formatStatusDate(value?: string | null) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
}

export function OrderStatusTag({ status }: OrderStatusTagProps) {
  const normalizedStatus = normalizeOrderStatus(status);
  const className = normalizedStatus === "delivered"
    ? "border-success-border bg-success-bg text-success-text"
    : normalizedStatus === "shipped"
      ? "border-primary-border bg-primary-soft text-primary"
      : "border-warning-border bg-warning-bg text-warning-text";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      <span>{ORDER_STATUS_LABELS[normalizedStatus]}</span>
    </span>
  );
}

export function OrderStatusTimeline({ status, history, createdAt }: OrderStatusTimelineProps) {
  const currentIndex = orderStatusIndex(status);
  const datesByStatus = new Map<string, string>();
  for (const event of history ?? []) {
    const normalizedStatus = normalizeOrderStatus(event.status);
    if (!datesByStatus.has(normalizedStatus)) datesByStatus.set(normalizedStatus, event.createdAt);
  }
  if (!datesByStatus.has("pending_approval") && createdAt) {
    datesByStatus.set("pending_approval", createdAt);
  }

  return (
    <div className="flex flex-col gap-0" aria-label="مسیر وضعیت سفارش">
      {ORDER_STATUSES.map((itemStatus, index) => {
        const complete = index <= currentIndex;
        const eventDate = datesByStatus.get(itemStatus);
        return (
          <div key={itemStatus} className="flex gap-3">
            <div className="flex w-6 shrink-0 flex-col items-center gap-1">
              <span className={complete ? "text-xl text-primary" : "text-xl text-secondary-text"}>
                {complete ? <IoCheckmarkCircle aria-hidden="true" /> : <IoEllipseOutline aria-hidden="true" />}
              </span>
              {index < ORDER_STATUSES.length - 1 ? (
                <span className={`h-8 border-r-2 ${index < currentIndex ? "border-primary" : "border-primary-border"}`} aria-hidden="true" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
              <span className={complete ? "text-sm font-bold text-primary-text" : "text-sm font-semibold text-secondary-text"}>
                {ORDER_STATUS_LABELS[itemStatus]}
              </span>
              <span className="text-xs text-secondary-text">
                {eventDate ? formatStatusDate(eventDate) : "هنوز ثبت نشده"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
