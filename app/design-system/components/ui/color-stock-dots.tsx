"use client";

import { cx } from "../../variants/shared.variant";

const COLOR_MAP: Record<string, string> = {
  black: "#111827",
  white: "#ffffff",
  gray: "#6b7280",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#f97316",
  purple: "#a855f7",
  pink: "#ec4899",
};

export function getStockColorValue(color: string) {
  return COLOR_MAP[color.toLowerCase()] ?? color;
}

export function normalizeStockEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>)
    .map(([color, count]) => ({
      color: color.trim(),
      count: Math.max(0, Math.round(Number(count))),
    }))
    .filter((item) => item.color && Number.isFinite(item.count));
}

type ColorStockDotsProps = {
  value: unknown;
  selectedColor?: string;
  onSelect?: (color: string) => void;
  disabledUnavailable?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function ColorStockDots({
  value,
  selectedColor,
  onSelect,
  disabledUnavailable = false,
  size = "sm",
  className,
}: ColorStockDotsProps) {
  const entries = normalizeStockEntries(value);
  if (entries.length === 0) return null;

  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)}>
      {entries.map(({ color, count }) => {
        const selected = selectedColor === color;
        const disabled = disabledUnavailable && count <= 0;
        const label = count > 10 ? "+10" : String(count);
        const dotSize = size === "md" ? "h-9 w-9" : "h-7 w-7";
        const labelSize = size === "md" ? "min-w-6 text-[13px] leading-5" : "min-w-5 text-[11px] leading-4";

        return (
          <button
            key={color}
            type="button"
            disabled={!onSelect || disabled}
            aria-label={`${color} stock ${count}`}
            title={`${color}: ${count}`}
            onClick={() => onSelect?.(color)}
            className={cx(
              "inline-flex shrink-0 items-center justify-center rounded-full border font-black tabular-nums shadow-sm transition",
              dotSize,
              selected ? "border-primary text-primary-text ring-2 ring-primary-border" : "border-primary-border text-primary-text",
              disabled ? "opacity-40" : onSelect ? "hover:scale-105" : "cursor-default"
            )}
            style={{ backgroundColor: getStockColorValue(color) }}
          >
            <span className={cx(
              "inline-flex items-center justify-center rounded-full border border-primary-border bg-bg-base/90 px-1 text-center shadow-sm backdrop-blur-sm",
              labelSize
            )}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ColorStockDots;
