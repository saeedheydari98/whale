"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Visual buffers reuse existing DOM; they never mount another data consumer. */
export function useHorizontalRail(ref: RefObject<HTMLDivElement | null>, enabled = true) {
  useLayoutEffect(() => {
    const rail = ref.current;
    if (!rail || !enabled) return;
    let frame = 0;
    let cycle = 0;
    let looping = false;
    let rebuilding = false;
    let suppressClick = false;
    let pointer: { id: number; startX: number; lastX: number; y: number; dragging: boolean } | null = null;
    const rtl = getComputedStyle(rail).direction === "rtl";
    const sign = rtl ? -1 : 1;
    const position = () => rail.scrollLeft * sign;
    const copies = () => Array.from(rail.querySelectorAll<HTMLElement>(":scope > [data-rail-copy]"));
    const originals = () => Array.from(rail.children).filter((node): node is HTMLElement => node instanceof HTMLElement && !node.hasAttribute("data-rail-copy") && !node.hasAttribute("data-loading-probe") && !node.hasAttribute("data-loading-sentinel"));
    const sources = new WeakMap<Element, HTMLElement>();
    const observed = new Set<HTMLElement>();
    const normalize = () => {
      if (!looping || rebuilding || cycle <= 0) return;
      const current = position();
      const start = cycle - rail.clientWidth / 2;
      if (current < start || current >= start + cycle) {
        rail.scrollLeft = (start + ((current - start) % cycle + cycle) % cycle) * sign;
      }
    };
    const clone = (source: HTMLElement) => {
      const copy = source.cloneNode(true) as HTMLElement;
      copy.setAttribute("data-rail-copy", "true");
      copy.setAttribute("aria-hidden", "true");
      const sourceNodes = [source, ...source.querySelectorAll<HTMLElement>("*")];
      const copyNodes = [copy, ...copy.querySelectorAll<HTMLElement>("*")];
      copyNodes.forEach((node, index) => {
        sources.set(node, sourceNodes[index]);
        node.removeAttribute("id");
        node.removeAttribute("name");
        if (node.matches("a, button, input, select, textarea, [tabindex]")) node.tabIndex = -1;
      });
      return copy;
    };
    const rebuild = () => {
      frame = 0;
      rebuilding = true;
      const oldOffset = looping ? position() - cycle : position();
      copies().forEach(node => node.remove());
      const items = originals();
      observed.forEach(item => { if (!items.includes(item)) { resize.unobserve(item); observed.delete(item); } });
      items.forEach(item => { if (!observed.has(item)) { resize.observe(item); observed.add(item); } });
      const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
      cycle = items.reduce((sum, item) => sum + item.getBoundingClientRect().width + gap, 0);
      // Editable/reorderable rows cannot be represented by presentation copies.
      looping = items.length > 1 && cycle - gap > rail.clientWidth + 1 && !rail.querySelector("[draggable='true'], input, select, textarea");
      if (looping) {
        const before = document.createDocumentFragment();
        const after = document.createDocumentFragment();
        items.forEach(item => { before.append(clone(item)); after.append(clone(item)); });
        rail.prepend(before);
        rail.append(after);
      }
      rail.dataset.railLoop = String(looping);
      rail.style.cursor = cycle - gap > rail.clientWidth + 1 ? "grab" : "";
      rail.scrollLeft = (looping ? cycle + oldOffset : Math.max(0, oldOffset)) * sign;
      rebuilding = false;
      normalize();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(rebuild); };
    const mutations = new MutationObserver(records => {
      if (records.some(record => {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        if (target?.closest("[data-rail-copy]")) return false;
        if (record.type === "attributes" && target === rail) return false;
        return record.type !== "childList" || [...record.addedNodes, ...record.removedNodes].some(node => !(node instanceof Element && node.hasAttribute("data-rail-copy")));
      })) schedule();
    });
    const resize = new ResizeObserver(schedule);
    resize.observe(rail);
    const down = (event: PointerEvent) => {
      if ((event.target as Element).closest("[data-rail-loop]") !== rail) return;
      suppressClick = false;
      if (event.pointerType !== "mouse" || event.button !== 0 || rail.scrollWidth <= rail.clientWidth + 1) return;
      if ((event.target as Element).closest("input, select, textarea, [draggable='true'], [data-drag-ignore='true']")) return;
      pointer = { id: event.pointerId, startX: event.clientX, lastX: event.clientX, y: event.clientY, dragging: false };
    };
    const move = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (!event.buttons) { up(); return; }
      const dx = event.clientX - pointer.lastX;
      if (!pointer.dragging && Math.abs(event.clientX - pointer.startX) > 6 && Math.abs(event.clientX - pointer.startX) > Math.abs(event.clientY - pointer.y)) {
        pointer.dragging = true;
        rail.setPointerCapture(event.pointerId);
        rail.style.cursor = "grabbing";
      }
      if (pointer.dragging) {
        event.preventDefault();
        rail.scrollLeft -= dx;
        normalize();
      }
      pointer.lastX = event.clientX;
    };
    const up = () => {
      if (!pointer) return;
      suppressClick = pointer.dragging;
      const id = pointer.id;
      pointer = null;
      if (rail.hasPointerCapture(id)) rail.releasePointerCapture(id);
      rail.style.cursor = rail.scrollWidth > rail.clientWidth + 1 ? "grab" : "";
    };
    const click = (event: MouseEvent) => {
      if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); return; }
      const target = event.target as Element;
      if (target.closest("[data-rail-copy]")?.parentElement !== rail) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      sources.get(target)?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey, altKey: event.altKey }));
    };
    const drag = (event: DragEvent) => { if (!(event.target as Element).closest("[draggable='true']")) event.preventDefault(); };
    rebuild();
    mutations.observe(rail, { childList: true, subtree: true, attributes: true, characterData: true });
    rail.addEventListener("scroll", normalize, { passive: true });
    rail.addEventListener("pointerdown", down);
    rail.addEventListener("pointermove", move);
    rail.addEventListener("pointerup", up);
    rail.addEventListener("pointercancel", up);
    rail.addEventListener("lostpointercapture", up);
    rail.addEventListener("click", click, true);
    rail.addEventListener("dragstart", drag);
    return () => {
      mutations.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
      rail.removeEventListener("scroll", normalize);
      rail.removeEventListener("pointerdown", down); rail.removeEventListener("pointermove", move);
      rail.removeEventListener("pointerup", up); rail.removeEventListener("pointercancel", up); rail.removeEventListener("lostpointercapture", up);
      rail.removeEventListener("click", click, true); rail.removeEventListener("dragstart", drag);
      copies().forEach(node => node.remove());
      rail.scrollLeft = Math.max(0, position() - (looping ? cycle : 0)) * sign;
      delete rail.dataset.railLoop; rail.style.cursor = "";
    };
  }, [enabled, ref]);
}
