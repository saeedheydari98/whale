"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";

type DragDirection = "previous" | "next";

type UseHorizontalDragOptions = {
  disabled?: boolean;
  mode?: "scroll" | "swipe";
  threshold?: number;
  ignoreSelector?: string;
  onSwipe?: (direction: DragDirection) => void;
};

type DragState = {
  active: boolean;
  hasDragged: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
  lastDeltaX: number;
  scrollLeft: number;
};

const defaultIgnoreSelector = "button, a, input, textarea, select, option, [data-drag-ignore='true']";

export function useHorizontalDrag<T extends HTMLElement = HTMLElement>({
  disabled = false,
  mode = "scroll",
  threshold = 8,
  ignoreSelector = defaultIgnoreSelector,
  onSwipe,
}: UseHorizontalDragOptions = {}) {
  const ref = useRef<T | null>(null);
  const stateRef = useRef<DragState>({
    active: false,
    hasDragged: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastDeltaX: 0,
    scrollLeft: 0,
  });
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);

  const stopDrag = useCallback((event?: PointerEvent<T>) => {
    const state = stateRef.current;
    if (!state.active) return;

    const deltaX = event ? event.clientX - state.startX : state.lastDeltaX;
    if (event && state.pointerId !== null && event.currentTarget.hasPointerCapture(state.pointerId)) {
      event.currentTarget.releasePointerCapture(state.pointerId);
    }

    if (mode === "swipe" && state.hasDragged && Math.abs(deltaX) >= threshold) {
      onSwipe?.(deltaX < 0 ? "next" : "previous");
    }

    suppressClickRef.current = state.hasDragged;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    stateRef.current = {
      active: false,
      hasDragged: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      lastDeltaX: 0,
      scrollLeft: 0,
    };
    setIsDragging(false);
    setDragDelta(0);
  }, [mode, onSwipe, threshold]);

  const onPointerDown = useCallback((event: PointerEvent<T>) => {
    if (disabled || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(ignoreSelector)) return;

    stateRef.current = {
      active: true,
      hasDragged: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastDeltaX: 0,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [disabled, ignoreSelector]);

  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    const state = stateRef.current;
    if (!state.active) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      stopDrag(event);
      return;
    }

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    state.lastDeltaX = deltaX;
    const passedThreshold = Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY);
    if (passedThreshold) {
      state.hasDragged = true;
      setIsDragging(true);
    }

    if (!state.hasDragged) return;

    event.preventDefault();
    if (mode === "scroll") {
      event.currentTarget.scrollLeft = state.scrollLeft - deltaX;
    } else {
      setDragDelta(deltaX);
    }
  }, [mode, stopDrag, threshold]);

  const shouldSuppressClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    ref,
    isDragging,
    dragDelta,
    shouldSuppressClick,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stopDrag,
      onPointerCancel: stopDrag,
    },
  };
}
