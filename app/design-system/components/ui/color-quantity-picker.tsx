"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CustomActionButton } from "./action";
import { CustomSelectionButton } from "./selection";
import { colorLabel, getStockColorValue, normalizeStockEntries } from "./color-stock-dots";
import { colorSelectionTotal, type CartColorSelection } from "@/lib/cart-color-selection";

export function ColorQuantityPicker({ colorStock, selection, stockQuantity, disabled = false, onChange }: {
  colorStock: unknown; selection: CartColorSelection; stockQuantity: number; disabled?: boolean;
  onChange: (color: string, count: number) => void;
}) {
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const activeGroup = useRef<HTMLDivElement>(null);
  const total = colorSelectionTotal(selection);
  useLayoutEffect(() => {
    activeGroup.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeColor]);

  return <div role="group" aria-label="رنگ و تعداد" data-color-quantity-picker className="flex h-8 w-full shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {normalizeStockEntries(colorStock).map(({ color, count }) => {
      const selected = selection[color] ?? 0;
      const maximum = Math.max(0, Math.min(count, stockQuantity - total + selected));
      const active = activeColor === color;
      const label = colorLabel(color);
      return <div key={color} ref={active ? activeGroup : undefined} className="flex shrink-0 items-center gap-1">
        <CustomSelectionButton variant="swatch" selected={selected > 0}
          disabled={disabled || (maximum <= 0 && selected <= 0)}
          aria-label={`انتخاب رنگ ${label}`} aria-expanded={active}
          title={`${label} · موجودی: ${count} · انتخاب‌شده: ${selected}`}
          className="h-7 w-7 text-[10px] focus-visible:ring-offset-0"
          style={{ backgroundColor: getStockColorValue(color) }}
          onClick={() => {
            setActiveColor(active ? null : color);
            if (!active && selected === 0 && maximum > 0) onChange(color, 1);
          }}>
          {selected > 0 ? <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-base px-0.5 text-[10px] font-bold text-primary-text">{selected}</span> : null}
        </CustomSelectionButton>
        {active ? <div className="flex h-7 items-center gap-1 rounded-md border border-primary-border bg-primary-bg" data-color-counter={color}>
          <CustomActionButton className="flex h-6 w-6 items-center justify-center rounded text-sm font-bold text-primary-text" disabled={disabled || selected <= 0}
            aria-label={`کاهش تعداد رنگ ${label}`} onClick={() => onChange(color, selected - 1)}>−</CustomActionButton>
          <span aria-live="polite" aria-label={`تعداد رنگ ${label}`} className="min-w-4 text-center text-xs font-bold tabular-nums text-primary-text">{selected}</span>
          <CustomActionButton className="flex h-6 w-6 items-center justify-center rounded text-sm font-bold text-primary-text" disabled={disabled || selected >= maximum}
            aria-label={`افزایش تعداد رنگ ${label}`} onClick={() => onChange(color, selected + 1)}>+</CustomActionButton>
        </div> : null}
      </div>;
    })}
  </div>;
}
