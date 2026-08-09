import { useEffect, useState, useRef } from "react";

const APP_SCROLL_CONTAINER_SELECTOR = "[data-app-scroll-container]";

export const useScrollHeaderHide = (threshold = 80) => {
  const [hide, setHide] = useState(false);
  const lastScrollY = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(APP_SCROLL_CONTAINER_SELECTOR);
    const readScrollY = () => scrollContainer?.scrollTop ?? window.scrollY;
    const handleScroll = () => {
      if (rafId.current) return;
      
      rafId.current = requestAnimationFrame(() => {
        const currentScrollY = readScrollY();
        
        if (currentScrollY <= 0) {
          setHide(false);
        } 
        else if (currentScrollY > threshold && currentScrollY > lastScrollY.current) {
          setHide(true);
        } 
        else if (currentScrollY < lastScrollY.current) {
          setHide(false);
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
