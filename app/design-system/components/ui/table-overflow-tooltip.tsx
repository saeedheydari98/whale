"use client";

import { useEffect, useState } from "react";

type TooltipState = {
  text: string;
  left: number;
  top: number;
};

function getOverflowTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const table = target.closest<HTMLElement>("[data-app-table], table");
  if (!table) return null;

  const truncatedText = target.closest<HTMLElement>(
    "[data-app-table] .truncate, table .truncate"
  );
  if (truncatedText && truncatedText.scrollWidth > truncatedText.clientWidth) return truncatedText;

  let cell = target.closest<HTMLElement>("[data-table-cell], td, th");
  if (!cell) {
    const row = target.closest<HTMLElement>("[data-app-table-row]");
    cell = row ? target as HTMLElement : null;
    while (cell?.parentElement && cell.parentElement !== row) {
      cell = cell.parentElement;
    }
    if (cell?.parentElement !== row) cell = null;
  }
  if (!cell) return null;

  return cell.scrollWidth > cell.clientWidth ? cell : null;
}

function createTooltipState(target: HTMLElement): TooltipState | null {
  const text = target.innerText.trim();
  if (!text) return null;

  const bounds = target.getBoundingClientRect();
  const maxLeft = Math.max(8, window.innerWidth - 360);
  const left = Math.max(8, Math.min(bounds.left, maxLeft));
  const top = Math.min(bounds.bottom + 8, Math.max(8, window.innerHeight - 72));

  return { text, left, top };
}

export function TableOverflowTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    let activeTarget: HTMLElement | null = null;

    const hide = () => {
      activeTarget = null;
      setTooltip(null);
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = getOverflowTarget(event.target);
      if (!target) {
        hide();
        return;
      }

      activeTarget = target;
      setTooltip(createTooltipState(target));
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!activeTarget || !(event.target instanceof Node) || !activeTarget.contains(event.target)) return;
      if (event.relatedTarget instanceof Node && activeTarget.contains(event.relatedTarget)) return;
      hide();
    };

    const handleClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select")) return;
      const target = getOverflowTarget(event.target);
      if (!target) {
        hide();
        return;
      }

      if (activeTarget === target) {
        hide();
        return;
      }

      activeTarget = target;
      setTooltip(createTooltipState(target));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };

    window.addEventListener("pointerover", handlePointerOver);
    window.addEventListener("pointerout", handlePointerOut);
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);

    return () => {
      window.removeEventListener("pointerover", handlePointerOver);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  if (!tooltip) return null;

  return (
    <div
      role="tooltip"
      className="table-overflow-tooltip"
      style={{ left: tooltip.left, top: tooltip.top }}
      aria-live="polite"
    >
      {tooltip.text}
    </div>
  );
}
