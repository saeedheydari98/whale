import { useEffect, useState, useRef } from "react";

const APP_SCROLL_CONTAINER_SELECTOR = "[data-app-scroll-container]";
const HEADER_TRANSITION_SETTLE_MS = 350;
const SCROLL_DELTA_TOLERANCE = 1;

export const useScrollHeaderHide = (threshold = 80) => {
  const [hide, setHide] = useState(false);
  const hideRef = useRef(false);
  const lastScrollY = useRef(0);
  const ignoreDirectionUntil = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(APP_SCROLL_CONTAINER_SELECTOR);
    const readScrollY = () => scrollContainer?.scrollTop ?? window.scrollY;
    const updateVisibility = (nextHide: boolean) => {
      if (hideRef.current === nextHide) return;

      hideRef.current = nextHide;
      ignoreDirectionUntil.current = performance.now() + HEADER_TRANSITION_SETTLE_MS;
      setHide(nextHide);
    };
    const handleScroll = () => {
      if (rafId.current !== undefined) return;
      
      rafId.current = requestAnimationFrame(() => {
        const currentScrollY = readScrollY();
        const scrollDelta = currentScrollY - lastScrollY.current;

        if (currentScrollY <= 0) {
          updateVisibility(false);
        } else if (performance.now() >= ignoreDirectionUntil.current) {
          if (currentScrollY > threshold && scrollDelta > SCROLL_DELTA_TOLERANCE) {
            updateVisibility(true);
          } else if (scrollDelta < -SCROLL_DELTA_TOLERANCE) {
            updateVisibility(false);
          }
        }
        
        lastScrollY.current = currentScrollY;
        rafId.current = undefined;
      });
    };

    lastScrollY.current = readScrollY();
    scrollContainer?.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      scrollContainer?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [threshold]);

  return hide;
};
