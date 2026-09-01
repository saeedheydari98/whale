"use client";

import { type ReactNode } from "react";
import { cx, glassSurfaceClasses } from "../../variants/shared.variant";

export type CustomTabItem<TValue extends string = string> = {
  id: TValue;
  label: string;
  icon?: ReactNode;
  badge?: number;
};

type CustomTabsProps<TValue extends string = string> = {
  items: Array<CustomTabItem<TValue>>;
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
};

export function CustomTabs<TValue extends string = string>({
  items,
  value,
  onChange,
  className = "",
}: CustomTabsProps<TValue>) {
  return (
    <div className={cx("flex w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-primary-soft p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", glassSurfaceClasses, className)}>
      {items.map((item) => {
        const active = value === item.id;

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            className={cx(
              "flex h-11 shrink-0 basis-28 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition hover:brightness-105 md:basis-auto",
              active
                ? "bg-primary text-primary-contrast shadow-sm"
                : "bg-primary-card text-primary-text hover:bg-primary-bg hover:text-primary"
            )}
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
          </button>
        );
      })}
    </div>
  );
}
