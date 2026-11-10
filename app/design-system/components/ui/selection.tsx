"use client";

import { CustomActionButton } from "@/app/design-system/components/ui/action";

import { type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { IoCheckmarkSharp } from "react-icons/io5";
import { cx } from "../../variants/shared.variant";
import { selectionGroupClasses, selectionItemClasses, type SelectionLevel, type SelectionVariant } from "../../variants/selection.variant";
import { AppImage } from "./app-image";

type CustomSelectionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  variant?: SelectionVariant;
};

export function CustomSelectionGroup({ variant = "tertiary", className, ...props }: HTMLAttributes<HTMLDivElement> & { variant?: SelectionLevel | "filter" }) {
  return <div role="group" {...props} data-selection-level={variant} className={cx(selectionGroupClasses[variant], className)} />;
}

export function CustomSelectionButton({ selected, variant = "tertiary", role, className, ...props }: CustomSelectionButtonProps) {
  const checkable = role === "radio" || role === "checkbox";
  return (
    <CustomActionButton
      {...props}
      type="button"
      role={role}
      aria-pressed={checkable ? undefined : selected}
      aria-checked={checkable ? selected : undefined}
      className={cx(selectionItemClasses(variant, selected), className)}
    />
  );
}

export function CustomSelectionOption({ label, imageUrl, selected, role, onClick }: {
  label: string;
  imageUrl?: string;
  selected: boolean;
  role: "checkbox" | "radio";
  onClick: () => void;
}) {
  return (
    <CustomSelectionButton selected={selected} variant="option" role={role} onClick={onClick}>
      <span aria-hidden="true" className={cx("flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs", selected ? "border-primary-contrast bg-primary-contrast text-primary" : "border-primary-border bg-primary-card")}>
        {selected ? <IoCheckmarkSharp /> : null}
      </span>
      {imageUrl ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary-border bg-primary-media">
          <AppImage src={imageUrl} alt={label} width={80} height={80} className="h-full w-full object-cover" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </CustomSelectionButton>
  );
}

export function CustomSelectionSummary({ labels, emptyLabel }: { labels: string[]; emptyLabel: string }) {
  const visibleLabels = labels.filter(Boolean).slice(0, 3);
  const hiddenCount = Math.max(0, labels.filter(Boolean).length - visibleLabels.length);

  return (
    <div className="flex min-h-7 flex-wrap items-center gap-1.5">
      {visibleLabels.length > 0 ? (
        visibleLabels.map((label) => (
          <span key={label} className="max-w-36 truncate rounded-full bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary-text">
            {label}
          </span>
        ))
      ) : (
        <span className="rounded-full border border-dashed border-primary-border px-2 py-1 text-[11px] font-semibold text-secondary-text">
          {emptyLabel}
        </span>
      )}
      {hiddenCount > 0 ? (
        <span className="rounded-full bg-primary text-[11px] font-bold text-primary-contrast px-2 py-1">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}
