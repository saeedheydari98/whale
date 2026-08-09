"use client";

import { useId, useState, type ReactNode } from "react";
import { IoAlertCircleOutline, IoCheckmarkCircleOutline, IoChevronDown, IoInformationCircleOutline } from "react-icons/io5";
import { glassSurfaceClasses } from "../../variants/shared.variant";

export type CustomAccordionStatus = "neutral" | "complete" | "incomplete" | "optional";

type CustomAccordionProps = {
  title: string;
  children: ReactNode;
  status?: CustomAccordionStatus;
  leading?: ReactNode;
  meta?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  invalid?: boolean;
  showStatusLabel?: boolean;
  className?: string;
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

function statusLabel(status: CustomAccordionStatus, invalid: boolean) {
  if (invalid) return "نیازمند تکمیل";
  if (status === "complete") return "تکمیل";
  if (status === "incomplete") return "ناقص";
  if (status === "optional") return "اختیاری";
  return "";
}

function statusIcon(status: CustomAccordionStatus, invalid: boolean) {
  if (invalid || status === "incomplete") return <IoAlertCircleOutline aria-hidden="true" />;
  if (status === "complete") return <IoCheckmarkCircleOutline aria-hidden="true" />;
  if (status === "optional") return <IoInformationCircleOutline aria-hidden="true" />;
  return null;
}

function statusClasses() {
  return "bg-primary-card text-primary-text";
}

function shellClasses() {
  return "bg-primary-soft";
}

function statusBadgeClasses(status: CustomAccordionStatus, invalid: boolean) {
  if (invalid || status === "incomplete") return "bg-danger-bg text-danger-text";
  if (status === "complete") return "bg-success-bg text-success-text";
  if (status === "optional") return "bg-primary-bg text-secondary-text";
  return "bg-primary-bg text-primary-text";
}

function statusIconClasses(status: CustomAccordionStatus, invalid: boolean) {
  if (invalid || status === "incomplete") return "text-danger-text";
  if (status === "complete") return "text-success-text";
  if (status === "optional") return "text-secondary-text";
  return "text-primary-text";
}

export function CustomAccordion({
  title,
  children,
  status = "neutral",
  leading,
  meta,
  defaultOpen,
  open,
  invalid = false,
  showStatusLabel = true,
  className = "",
  contentClassName = "",
  onOpenChange,
}: CustomAccordionProps) {
  const contentId = useId();
  const [localOpen, setLocalOpen] = useState(defaultOpen ?? status !== "complete");
  const resolvedOpen = open ?? localOpen;
  const label = statusLabel(status, invalid);
  const icon = statusIcon(status, invalid);
  const statusTone = statusBadgeClasses(status, invalid);
  const iconTone = statusIconClasses(status, invalid);

  const toggleOpen = () => {
    const nextOpen = !resolvedOpen;
    if (open === undefined) setLocalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <div className={`flex flex-col gap-2 rounded-xl p-2 ${glassSurfaceClasses} ${shellClasses()} ${className}`}>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={resolvedOpen}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start transition hover:brightness-95 ${glassSurfaceClasses} ${statusClasses()}`}
        onClick={toggleOpen}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
          {icon ? <span className={`text-base ${iconTone}`}>{icon}</span> : null}
          <span className="truncate text-sm font-bold">{title}</span>
          {meta ? <span className="hidden truncate text-[11px] font-semibold opacity-75 sm:inline">{meta}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {showStatusLabel && label ? (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone}`}>{label}</span>
          ) : null}
          <IoChevronDown className={`text-lg transition ${resolvedOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {resolvedOpen ? (
        <div id={contentId} className={`flex flex-col gap-2 ${contentClassName}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
