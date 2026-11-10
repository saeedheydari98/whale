"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipState = { target: HTMLElement; text: string; bounds: DOMRect };
const excluded = "input, textarea, select, pre, code, [data-loading-probe], [aria-hidden=true], [inert], .sr-only, [data-overflow-tooltip=off]";

function isClippedText(element: HTMLElement) {
  if (element.closest(excluded)) return false;
  const style = getComputedStyle(element);
  const clamped = Number(style.webkitLineClamp) > 0;
  const ellipsis = style.textOverflow === "ellipsis";
  if ((!clamped && !ellipsis) || style.visibility !== "visible" || element.clientWidth === 0 || !element.textContent?.trim()) return false;
  return (clamped && element.scrollHeight > element.clientHeight)
    || (ellipsis && (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight));
}

function getOverflowTarget(target: EventTarget | null, includeChildren = false) {
  if (!(target instanceof HTMLElement) || target.closest(excluded)) return null;
  for (let node: HTMLElement | null = target; node && node !== document.body; node = node.parentElement) {
    if (isClippedText(node)) return node;
  }
  if (includeChildren) {
    return Array.from(target.querySelectorAll<HTMLElement>("span, div, [class*=line-clamp], .truncate"))
      .find(isClippedText) ?? null;
  }
  return null;
}

export function AppOverflowTooltip() {
  const id = useId();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const bounds = tooltipRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(tooltip.bounds.left, window.innerWidth - bounds.width - 8));
    const below = tooltip.bounds.bottom + 8;
    const top = below + bounds.height <= window.innerHeight - 8
      ? below : Math.max(8, tooltip.bounds.top - bounds.height - 8);
    setPosition({ left, top });
  }, [tooltip]);

  useEffect(() => {
    let active: HTMLElement | null = null;
    let originalDescription: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancelHide = () => { clearTimeout(timer); };
    const hide = () => {
      cancelHide();
      if (active) {
        if (originalDescription === null) active.removeAttribute("aria-describedby");
        else active.setAttribute("aria-describedby", originalDescription);
      }
      active = null;
      setTooltip(null);
    };
    const scheduleHide = () => { cancelHide(); timer = setTimeout(hide, 160); };
    const show = (target: HTMLElement | null) => {
      cancelHide();
      if (target === active) return;
      hide();
      if (!target) return;
      active = target;
      originalDescription = target.getAttribute("aria-describedby");
      target.setAttribute("aria-describedby", [originalDescription, id].filter(Boolean).join(" "));
      setTooltip({ target, text: target.innerText.trim(), bounds: target.getBoundingClientRect() });
    };
    const inTooltip = (target: EventTarget | null) => target instanceof Node && tooltipRef.current?.contains(target);
    const pointerOver = (event: PointerEvent) => {
      if (inTooltip(event.target)) { cancelHide(); return; }
      if (event.pointerType === "mouse") {
        const target = getOverflowTarget(event.target);
        if (target) show(target);
        else if (active) scheduleHide();
      }
    };
    const pointerOut = (event: PointerEvent) => {
      if (inTooltip(event.relatedTarget) || (event.relatedTarget instanceof Node && active?.contains(event.relatedTarget))) return;
      if (inTooltip(event.target) || (event.target instanceof Node && active?.contains(event.target))) scheduleHide();
    };
    const click = (event: MouseEvent) => {
      if (inTooltip(event.target)) return;
      // Touch users can reveal clipped static text without stealing control actions.
      if (event.target instanceof Element && event.target.closest("button,a,input,textarea,select")) return;
      const target = getOverflowTarget(event.target);
      if (target && target !== active) show(target);
      else hide();
    };
    const focus = (event: FocusEvent) => show(getOverflowTarget(event.target, true));
    const keyDown = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    const scroll = (event: Event) => { if (!inTooltip(event.target)) hide(); };
    window.addEventListener("pointerover", pointerOver);
    window.addEventListener("pointerout", pointerOut);
    window.addEventListener("click", click);
    window.addEventListener("focusin", focus);
    window.addEventListener("focusout", hide);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("blur", hide);
    return () => {
      hide();
      window.removeEventListener("pointerover", pointerOver);
      window.removeEventListener("pointerout", pointerOut);
      window.removeEventListener("click", click);
      window.removeEventListener("focusin", focus);
      window.removeEventListener("focusout", hide);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("blur", hide);
    };
  }, [id]);

  if (!tooltip) return null;
  return createPortal(<div id={id} ref={tooltipRef} role="tooltip" className="app-overflow-tooltip" style={position}>
    {tooltip.text}
  </div>, document.body);
}
