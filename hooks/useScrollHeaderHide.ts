import { useEffect, useRef } from "react";

const APP_SCROLL_CONTAINER_SELECTOR = "[data-app-scroll-container]";
const FALLBACK_HEADER_HEIGHT = 80;
const OFFSET_SETTLE_TOLERANCE = 0.1;
const HIDE_SMOOTHING = 0.3;
const SHOW_SMOOTHING = 0.18;

type ScrollHeaderHideOptions = {
  resetKey?: string;
};

export const useScrollHeaderHide = ({ resetKey }: ScrollHeaderHideOptions = {}) => {
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const targetOffset = useRef(0);
  const renderedOffset = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(APP_SCROLL_CONTAINER_SELECTOR);
    const scrollTarget: HTMLElement | Window = scrollContainer ?? window;
    const readScrollY = () => scrollContainer?.scrollTop ?? window.scrollY;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readHeaderHeight = () => headerRef.current?.offsetHeight || FALLBACK_HEADER_HEIGHT;
    const applyOffset = (offset: number) => {
      const header = headerRef.current;
      if (!header) return;

      renderedOffset.current = offset;
      header.style.transform = `translate3d(0, -${offset}px, 0)`;
      header.inert = offset >= readHeaderHeight() - OFFSET_SETTLE_TOLERANCE;
    };

    const animateOffset = () => {
      const difference = targetOffset.current - renderedOffset.current;

      if (Math.abs(difference) <= OFFSET_SETTLE_TOLERANCE) {
        applyOffset(targetOffset.current);
        rafId.current = undefined;
        return;
      }

      const smoothing = difference > 0 ? HIDE_SMOOTHING : SHOW_SMOOTHING;
      applyOffset(renderedOffset.current + difference * smoothing);
      rafId.current = requestAnimationFrame(animateOffset);
    };

    const moveToOffset = (nextOffset: number) => {
      targetOffset.current = nextOffset;

      if (prefersReducedMotion) {
        applyOffset(nextOffset);
        return;
      }

      if (rafId.current === undefined) {
        rafId.current = requestAnimationFrame(animateOffset);
      }
    };

    const handleScroll = () => {
      const currentScrollY = Math.max(0, readScrollY());
      const headerHeight = readHeaderHeight();
      const previousActiveScroll = Math.max(0, lastScrollY.current - headerHeight);
      const currentActiveScroll = Math.max(0, currentScrollY - headerHeight);
      const activeScrollDelta = currentActiveScroll - previousActiveScroll;

      lastScrollY.current = currentScrollY;

      if (currentScrollY <= headerHeight) {
        moveToOffset(0);
        return;
      }

      const nextOffset = Math.min(
        headerHeight,
        Math.max(0, targetOffset.current + activeScrollDelta),
      );
      moveToOffset(nextOffset);
    };

    targetOffset.current = 0;
    applyOffset(0);
    lastScrollY.current = Math.max(0, readScrollY());
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      if (rafId.current !== undefined) {
        cancelAnimationFrame(rafId.current);
        rafId.current = undefined;
      }
    };
  }, [resetKey]);

  return headerRef;
};
