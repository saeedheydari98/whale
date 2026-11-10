"use client";

import { CustomActionButton } from "@/app/design-system/components/ui/action";

import { type ReactNode } from "react";

export function CustomTable({ columns = 7, children }: { columns?: 7 | 8; children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto overscroll-x-contain">
      <div data-app-table data-app-table-columns={columns} className="flex min-w-230 flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function CustomTableRow({ children }: { children: ReactNode }) {
  return <div data-app-table-row className="flex min-w-230 items-center gap-2 rounded-md border border-primary-border bg-primary-card px-2.5 py-2">{children}</div>;
}

export function CustomSortHeader({ label, active, direction, onClick }: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <CustomActionButton
      type="button"
      onClick={onClick}
      className={`flex w-full min-w-0 items-center justify-center gap-1 text-center text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-border ${active ? "text-primary" : "text-secondary-text hover:text-primary-text"}`}
    >
      <span className="truncate">{label}</span>
      <span aria-hidden="true" className="shrink-0 tabular-nums">{active ? direction === "asc" ? "↑" : "↓" : "↕"}</span>
    </CustomActionButton>
  );
}
