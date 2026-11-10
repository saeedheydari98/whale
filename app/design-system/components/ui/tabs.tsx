"use client";

import { type ReactNode } from "react";
import { cx } from "../../variants/shared.variant";
import { type SelectionLevel } from "../../variants/selection.variant";
import { CustomSelectionButton, CustomSelectionGroup } from "./selection";

export type CustomTabItem<TValue extends string = string> = {
  id: TValue;
  label: string;
  icon?: ReactNode;
  badge?: number;
  disabled?: boolean;
};

type CustomTabsProps<TValue extends string = string> = {
  items: readonly CustomTabItem<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
  variant?: SelectionLevel;
  ariaLabel?: string;
  disabled?: boolean;
};

export function CustomTabs<TValue extends string = string>({
  items,
  value,
  onChange,
  className = "",
  variant = "primary",
  ariaLabel,
  disabled = false,
}: CustomTabsProps<TValue>) {
  return (
    <CustomSelectionGroup
      aria-label={ariaLabel}
      variant={variant}
      className={className}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button[aria-pressed]:not(:disabled)"));
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0 || buttons.length === 0) return;
        event.preventDefault();
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        const step = (event.key === "ArrowRight") !== rtl ? 1 : -1;
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
        buttons[next].focus();
        buttons[next].click();
      }}
    >
      {items.map((item) => {
        const active = value === item.id;

        return (
          <CustomSelectionButton
            key={item.id}
            selected={active}
            variant={variant}
            disabled={disabled || item.disabled}
            aria-label={item.badge && item.badge > 0 ? `${item.label}، ${item.badge} مورد جدید` : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.icon ? <span className="text-base" aria-hidden="true">{item.icon}</span> : null}
            <span>{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className={cx(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                active ? "bg-primary-contrast text-primary" : "bg-primary text-primary-contrast"
              )} aria-hidden="true">
                {item.badge}
              </span>
            ) : null}
          </CustomSelectionButton>
        );
      })}
    </CustomSelectionGroup>
  );
}
