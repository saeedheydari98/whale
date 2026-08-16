import { useEffect, useRef, useState } from "react";

const APP_SCROLL_CONTAINER_SELECTOR = "[data-app-scroll-container]";
const SCROLL_DELTA_TOLERANCE = 0.5;
const BOTTOM_EDGE_TOLERANCE = 2;
const HIDE_TRAVEL_DISTANCE = 12;
const SHOW_TRAVEL_DISTANCE = 6;

export const useScrollHeaderHide = (threshold = 80) => {
  const [hide, setHide] = useState(false);
  const hideRef = useRef(false);
  const lastScrollY = useRef(0);
  const directionTravel = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(APP_SCROLL_CONTAINER_SELECTOR);
    const scrollTarget: HTMLElement | Window = scrollContainer ?? window;
    const readScrollY = () => scrollContainer?.scrollTop ?? window.scrollY;
    const readMaxScrollY = () => {
      if (scrollContainer) {
        return Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
      }

      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };

    const updateVisibility = (nextHide: boolean) => {
      if (hideRef.current === nextHide) return;

      hideRef.current = nextHide;
      directionTravel.current = 0;
      setHide(nextHide);
    };

    const handleScroll = () => {
      if (rafId.current !== undefined) return;

      rafId.current = requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, readScrollY());
        const scrollDelta = currentScrollY - lastScrollY.current;

        lastScrollY.current = currentScrollY;
        rafId.current = undefined;

        if (currentScrollY <= threshold) {
          directionTravel.current = 0;
          updateVisibility(false);
          return;
        }

        if (Math.abs(scrollDelta) <= SCROLL_DELTA_TOLERANCE) return;

        const distanceFromBottom = Math.max(0, readMaxScrollY() - currentScrollY);
        const layoutShiftedAtBottom =
          hideRef.current
          && scrollDelta < 0
          && distanceFromBottom <= BOTTOM_EDGE_TOLERANCE;

        if (layoutShiftedAtBottom) {
          directionTravel.current = 0;
          return;
        }

        const continuedInSameDirection =
          directionTravel.current === 0 || Math.sign(directionTravel.current) === Math.sign(scrollDelta);

        directionTravel.current = continuedInSameDirection
          ? directionTravel.current + scrollDelta
          : scrollDelta;

        if (!hideRef.current && directionTravel.current >= HIDE_TRAVEL_DISTANCE) {
          updateVisibility(true);
        } else if (hideRef.current && directionTravel.current <= -SHOW_TRAVEL_DISTANCE) {
          updateVisibility(false);
        }
      });
    };

    lastScrollY.current = Math.max(0, readScrollY());
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      if (rafId.current !== undefined) cancelAnimationFrame(rafId.current);
    };
  }, [threshold]);

  return hide;
};
