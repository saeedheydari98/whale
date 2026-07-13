"use client";

import React from "react";

type LazyViewportSectionProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
  rootMargin?: string;
  minHeight?: string | number;
};

export function LazyViewportSection({
  children,
  fallback,
  className,
  rootMargin = "0px 0px 160px 0px",
  minHeight,
}: LazyViewportSectionProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { root: null, rootMargin, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={ref} className={className} style={minHeight ? { minHeight } : undefined}>
      {visible ? children : fallback}
    </div>
  );
}
