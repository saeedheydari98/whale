"use client";

import { type ReactNode } from "react";
import { IoFileTrayOutline } from "react-icons/io5";
import { glassSurfaceClasses } from "../../variants/shared.variant";

type EmptyStateTone = "neutral" | "info" | "warning";
type EmptyStateSize = "sm" | "md";

type CustomEmptyStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: EmptyStateTone;
  size?: EmptyStateSize;
  className?: string;
};

const toneClasses: Record<EmptyStateTone, string> = {
  neutral: "border-primary-border bg-primary-card text-primary-text",
  info: "border-info-border bg-info-bg text-info-text",
  warning: "border-warning-border bg-warning-bg text-warning-text",
};

const sizeClasses: Record<EmptyStateSize, string> = {
  sm: "gap-1.5 rounded-md p-3",
  md: "gap-2 rounded-lg p-4",
};

export function CustomEmptyState({
  title = "اطلاعاتی برای نمایش وجود ندارد.",
  description,
  action,
  icon,
  tone = "neutral",
  size = "md",
  className = "",
}: CustomEmptyStateProps) {
  return (
    <div className={`flex flex-col border text-sm ${glassSurfaceClasses} ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current bg-primary-card text-base" aria-hidden="true">
          {icon ?? <IoFileTrayOutline />}
        </span>
        <span className="font-bold">{title}</span>
      </div>
      {description ? <span className="text-xs font-semibold opacity-80">{description}</span> : null}
      {action ? <div className="flex flex-wrap gap-2 pt-1">{action}</div> : null}
    </div>
  );
}
