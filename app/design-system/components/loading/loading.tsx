"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { GiSpermWhale } from "react-icons/gi";
import { cx, radiusVariants, sizeVariants } from "../../variants/shared.variant";

export type LoadingVariant =
  | "spinner"
  | "ring"
  | "dots"
  | "pulse"
  | "bars"
  | "page"
  | "fullscreen"
  | "skeleton"
  | "skeleton-block"
  | "skeleton-card"
  | "skeleton-item"
  | "skeleton-structure";

export type LoadingStructure = {
  /** Item count from page structure, not a pixel size. */
  count?: number;
};

type LoadingSize = keyof typeof sizeVariants;

interface LoadingProps {
  loading?: LoadingVariant;
  size?: LoadingSize;
  className?: string;
  children?: React.ReactNode;
  /** Data loading. Structure loading is separate (`isStructureLoading`). */
  isLoading?: boolean;
  /** True while the lightweight page structure has not arrived yet. */
  isStructureLoading?: boolean;
  /** Called once when this block first enters the viewport. */
  onVisible?: () => void;
}

type SkeletonStructureRect = {
  depth: number;
  height: number;
  key: string;
  kind: "container" | "element";
  radius: string;
  width: number;
  x: number;
  y: number;
};

type LazyViewportProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  rootMargin?: string;
};

type DynamicLoadingCollectionProps<T> = {
  items: readonly T[];
  isLoading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSkeleton: (index: number) => React.ReactNode;
  getKey?: (item: T, index: number) => React.Key;
  className?: string;
  containerRef?: React.Ref<HTMLDivElement>;
  containerProps?: Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">;
  totalCount?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onCapacityChange?: (capacity: number) => void;
  lazy?: boolean;
  structure?: LoadingStructure;
};

const ROUTE_LOADING_START_EVENT = "app:route-loading-start";
const VIEWPORT_ROOT_MARGIN = "0px";
const structureHoldListeners = new Set<() => void>();
let structureHoldCount = 0;

function notifyStructureHolds() {
  structureHoldListeners.forEach((listener) => listener());
}

export function startRouteLoading() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ROUTE_LOADING_START_EVENT));
}

export function endRouteLoading() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("app:route-loading-end"));
}

/** Keep the whale loader visible until the page structure is ready. */
export function useStructureRouteLoading(isStructureLoading: boolean) {
  React.useLayoutEffect(() => {
    if (!isStructureLoading) return;
    structureHoldCount += 1;
    notifyStructureHolds();
    return () => {
      structureHoldCount = Math.max(0, structureHoldCount - 1);
      notifyStructureHolds();
    };
  }, [isStructureLoading]);
}

export function RouteLoadingController() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [loading, setLoading] = React.useState(true);
  const [holds, setHolds] = React.useState(structureHoldCount);

  React.useEffect(() => {
    let completionFrame = 0;
    let paintFrame = 0;
    completionFrame = window.requestAnimationFrame(() => {
      paintFrame = window.requestAnimationFrame(() => setLoading(false));
    });
    return () => {
      window.cancelAnimationFrame(completionFrame);
      window.cancelAnimationFrame(paintFrame);
    };
  }, [routeKey]);

  React.useLayoutEffect(() => {
    const sync = () => setHolds(structureHoldCount);
    structureHoldListeners.add(sync);
    sync();
    return () => {
      structureHoldListeners.delete(sync);
    };
  }, []);

  React.useEffect(() => {
    const begin = () => setLoading(true);
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      begin();
    };
    const finish = () => {
      if (structureHoldCount > 0) return;
      setLoading(false);
    };

    window.addEventListener(ROUTE_LOADING_START_EVENT, begin);
    window.addEventListener("app:route-loading-end", finish);
    window.addEventListener("popstate", begin);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener(ROUTE_LOADING_START_EVENT, begin);
      window.removeEventListener("app:route-loading-end", finish);
      window.removeEventListener("popstate", begin);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return loading || holds > 0 ? <Loading loading="fullscreen" /> : null;
}

function numericStyleValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scrollRoot() {
  const node = document.querySelector("[data-app-scroll-container]");
  return node instanceof Element ? node : null;
}

function isInViewport(rect: DOMRect) {
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

const LAST_LAYER_SELECTOR = "button, a, input, textarea, select, img, h1, h2, h3, h4, h5, h6, [role='button'], [data-loading-leaf]";

function isLastLayerElement(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  if (tag === "span" || tag === "svg" || tag === "label" || tag === "legend" || tag === "fieldset") return false;
  if (element.matches(LAST_LAYER_SELECTOR)) return true;
  if (element.querySelector(":scope > input, :scope > textarea, :scope > select")) return true;
  const kids = Array.from(element.children);
  if (kids.length === 0) return Boolean(element.textContent?.trim());
  return kids.every((kid) => kid instanceof HTMLElement && (kid.tagName === "SPAN" || kid.tagName === "SVG"))
    && Boolean(element.textContent?.trim());
}

function hasVisualHolderSurface(element: HTMLElement) {
  const style = getComputedStyle(element);
  const background = style.backgroundColor;
  const transparent = !background || background === "transparent" || background === "rgba(0, 0, 0, 0)";
  const borderWidth = numericStyleValue(style.borderTopWidth)
    + numericStyleValue(style.borderRightWidth)
    + numericStyleValue(style.borderBottomWidth)
    + numericStyleValue(style.borderLeftWidth);
  return !transparent || borderWidth > 0;
}

function observeUntilVisible(node: Element, onVisible: () => void, rootMargin = VIEWPORT_ROOT_MARGIN) {
  if (!("IntersectionObserver" in window)) {
    const timer = globalThis.setTimeout(onVisible, 0);
    return () => globalThis.clearTimeout(timer);
  }

  if (isInViewport(node.getBoundingClientRect())) {
    onVisible();
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      onVisible();
      observer.disconnect();
    },
    { root: scrollRoot(), rootMargin, threshold: 0.01 }
  );
  observer.observe(node);
  return () => observer.disconnect();
}

function collectionItemShellClass(className?: string) {
  const classes = className ?? "";
  if (/\bflex-col\b/.test(classes)) return "w-full min-w-0 shrink-0";
  return "self-start w-max max-w-full shrink-0";
}

function collectionProbeInnerClass(className?: string) {
  return /\bflex-col\b/.test(className ?? "") ? "invisible w-full" : "invisible w-max";
}

function collectionItemElement(probe: HTMLElement) {
  const sourced = probe.querySelector<HTMLElement>("[data-loading-source='true']");
  const card = sourced?.firstElementChild ?? probe.firstElementChild ?? probe;
  return card instanceof HTMLElement ? card : probe;
}

function collectionAxis(container: HTMLElement) {
  const style = window.getComputedStyle(container);
  const nowrapRow = style.flexWrap === "nowrap" && style.flexDirection.startsWith("row");
  const column = style.flexDirection.startsWith("column") && style.flexWrap !== "wrap";
  return {
    columnGap: numericStyleValue(style.columnGap || style.gap),
    rowGap: numericStyleValue(style.rowGap || style.gap),
    nowrapRow,
    column,
    wrap: style.flexWrap === "wrap" || style.flexWrap === "wrap-reverse",
    rtl: style.direction === "rtl",
  };
}

function usedItemSize(item: HTMLElement, container: HTMLElement, wrap: boolean) {
  const style = getComputedStyle(item);
  const maxWidth = numericStyleValue(style.maxWidth);
  const minWidth = numericStyleValue(style.minWidth);
  const containerWidth = container.getBoundingClientRect().width;
  const rect = item.getBoundingClientRect();
  const stretched = containerWidth > 0 && rect.width >= containerWidth - 1;
  let width = Math.max(rect.width, item.offsetWidth, item.scrollWidth);

  if (maxWidth > 0) {
    const layoutWidth = Math.min(maxWidth, containerWidth || maxWidth);
    width = wrap || stretched || width <= 0
      ? layoutWidth
      : Math.min(Math.max(width, minWidth), layoutWidth);
  } else if (containerWidth > 0 && (stretched || width > containerWidth)) {
    width = containerWidth;
  }

  return {
    width,
    height: Math.max(rect.height, item.offsetHeight),
  };
}

function fitAlong(available: number, size: number, gap: number) {
  if (size <= 0 || available <= 0) return 0;
  let count = Math.floor((available + gap) / (size + gap));
  while (count > 0 && count * size + Math.max(0, count - 1) * gap > available + 0.5) {
    count -= 1;
  }
  return count;
}

function viewportBottom() {
  const root = scrollRoot();
  if (!root) return window.innerHeight;
  return Math.min(window.innerHeight, root.getBoundingClientRect().bottom);
}

function laidOutCollectionItems(container: HTMLElement) {
  return Array.from(container.children).filter((child): child is HTMLElement => (
    child instanceof HTMLElement && child.getAttribute("data-loading-probe") !== "true"
  ));
}

function countItemsFittingLayout(
  container: HTMLElement,
  items: HTMLElement[],
  fillViewport: boolean,
  nowrapRow: boolean,
) {
  if (items.length === 0) return 0;
  const containerRect = container.getBoundingClientRect();
  const bottomLimit = viewportBottom();

  if (nowrapRow) {
    let count = 0;
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const visible = rect.right > containerRect.left + 0.5 && rect.left < containerRect.right - 0.5;
      if (!visible) return count === 0 ? 1 : count;
      count += 1;
    }
    return count;
  }

  if (!fillViewport) {
    const firstTop = items[0].getBoundingClientRect().top;
    let count = 0;
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (rect.top > firstTop + 1) break;
      if (count > 0 && rect.bottom > bottomLimit + 0.5) break;
      count += 1;
    }
    return Math.max(1, count);
  }

  let count = 0;
  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (rect.bottom > bottomLimit + 0.5) return count === 0 ? 1 : count;
    count += 1;
  }
  return count;
}

function extraItemsFromUnusedSpace(
  container: HTMLElement,
  items: HTMLElement[],
  itemWidth: number,
  itemHeight: number,
  columnGap: number,
  rowGap: number,
  columns: number,
  nowrapRow: boolean,
  rtl: boolean,
) {
  if (items.length === 0) return 0;
  const last = items[items.length - 1];
  const lastRect = last.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (nowrapRow) {
    const remaining = rtl
      ? lastRect.left - containerRect.left - columnGap
      : containerRect.right - lastRect.right - columnGap;
    return fitAlong(remaining, itemWidth, columnGap);
  }

  const remaining = viewportBottom() - lastRect.bottom - rowGap;
  return fitAlong(remaining, itemHeight, rowGap) * Math.max(1, columns);
}

function measuredCollectionCapacity(
  container: HTMLElement,
  probe: HTMLElement,
  fillViewport: boolean,
  knownTotal: number | undefined,
) {
  const item = collectionItemElement(probe);
  const axis = collectionAxis(container);
  const { width: itemWidth, height: itemHeight } = usedItemSize(item, container, axis.wrap);
  if (itemWidth <= 0 || itemHeight <= 0) return 0;
  if (knownTotal !== undefined && !fillViewport) return knownTotal;

  const containerRect = container.getBoundingClientRect();
  const availableWidth = Math.max(0, containerRect.width);
  const availableHeight = Math.max(0, viewportBottom() - containerRect.top);
  const columns = axis.column ? 1 : Math.max(1, fitAlong(availableWidth, itemWidth, axis.columnGap));
  const rows = axis.nowrapRow || !fillViewport
    ? 1
    : Math.max(1, fitAlong(availableHeight, itemHeight, axis.rowGap));
  let next = Math.max(0, columns * rows);

  const items = laidOutCollectionItems(container);
  if (items.length > 0) {
    const fitted = countItemsFittingLayout(container, items, fillViewport, axis.nowrapRow);
    if (fitted > 0) {
      if (fitted < items.length) {
        next = fitted;
      } else if (fillViewport) {
        next = fitted + extraItemsFromUnusedSpace(
          container,
          items,
          itemWidth,
          itemHeight,
          axis.columnGap,
          axis.rowGap,
          columns,
          axis.nowrapRow,
          axis.rtl,
        );
      } else {
        next = fitted;
      }
    }
  }

  if (knownTotal !== undefined) next = Math.min(next, knownTotal);
  return Math.max(0, next);
}

function Shimmer({ color, duration }: { color: string; duration: number }) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{ backgroundImage: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)` }}
      animate={{ x: ["-100%", "100%"] }}
      transition={{ repeat: Infinity, duration, ease: "linear" }}
    />
  );
}

export function LazyViewport({
  children,
  fallback,
  className,
  rootMargin = VIEWPORT_ROOT_MARGIN,
}: LazyViewportProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    return observeUntilVisible(node, () => setVisible(true), rootMargin);
  }, [rootMargin, visible]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : <div className="invisible" inert>{fallback ?? children}</div>}
    </div>
  );
}

export function DynamicLoadingCollection<T>({
  items,
  isLoading,
  renderItem,
  renderSkeleton,
  getKey,
  className,
  containerRef: externalContainerRef,
  containerProps,
  totalCount,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onCapacityChange,
  lazy = false,
  structure,
}: DynamicLoadingCollectionProps<T>) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const probeRef = React.useRef<HTMLDivElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [capacity, setCapacity] = React.useState(0);
  const [measured, setMeasured] = React.useState(false);
  const knownTotal = Number.isFinite(Number(totalCount ?? structure?.count))
    ? Math.max(0, Math.round(Number(totalCount ?? structure?.count)))
    : undefined;
  const fillViewport = Boolean(onCapacityChange || hasMore || onLoadMore);
  const itemShellClass = collectionItemShellClass(className);
  const probeInnerClass = collectionProbeInnerClass(className);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const probe = probeRef.current;
    if (!container || !probe) return;

    const update = () => {
      const next = measuredCollectionCapacity(container, probe, fillViewport, knownTotal);
      if (next <= 0) return;
      setCapacity((current) => current === next ? current : next);
      setMeasured(true);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(collectionItemElement(probe));
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [capacity, fillViewport, isLoading, isLoadingMore, knownTotal, renderSkeleton]);

  React.useImperativeHandle(externalContainerRef, () => containerRef.current as HTMLDivElement);

  React.useEffect(() => {
    if (measured && capacity > 0) onCapacityChange?.(capacity);
  }, [capacity, measured, onCapacityChange]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !onLoadMore || !hasMore || isLoading || isLoadingMore) return;
    return observeUntilVisible(sentinel, () => onLoadMore(), VIEWPORT_ROOT_MARGIN);
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  const remaining = knownTotal === undefined ? capacity : Math.max(0, knownTotal - items.length);
  const skeletonCount = isLoading
    ? (knownTotal === 0 ? 0 : Math.min(capacity, knownTotal ?? capacity))
    : isLoadingMore ? Math.min(capacity, remaining) : 0;

  return (
    <>
      <div
        {...containerProps}
        ref={containerRef}
        className={cx("relative", className)}
      >
        <div data-loading-probe="true" className="pointer-events-none absolute inset-s-0 top-0 -z-10 h-0 w-full overflow-hidden" aria-hidden="true">
          <div ref={probeRef} className={probeInnerClass} inert>
            {renderSkeleton(0)}
          </div>
        </div>
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <div key={`loading-${index}`} className={itemShellClass}>{renderSkeleton(index)}</div>
            ))
          : items.map((item, index) => lazy ? (
              <LazyViewport
                key={getKey?.(item, index) ?? index}
                className={itemShellClass}
                fallback={<div className="invisible" inert>{renderSkeleton(index)}</div>}
              >
                {renderItem(item, index)}
              </LazyViewport>
            ) : (
              <div key={getKey?.(item, index) ?? index} className={itemShellClass}>{renderItem(item, index)}</div>
            ))}
        {!isLoading && isLoadingMore
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <div key={`loading-more-${index}`} className={itemShellClass}>{renderSkeleton(items.length + index)}</div>
            ))
          : null}
      </div>
      {onLoadMore ? <div ref={sentinelRef} className="h-0 w-full overflow-hidden" aria-hidden="true" /> : null}
    </>
  );
}

function SkeletonStructure({
  children,
  className,
  isLoading,
  isStructureLoading,
  onVisible,
}: Pick<LoadingProps, "children" | "className" | "isLoading" | "isStructureLoading" | "onVisible">) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [rects, setRects] = React.useState<SkeletonStructureRect[]>([]);
  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const [visible, setVisible] = React.useState(false);
  const [revealed, setRevealed] = React.useState(!isLoading);
  const showSkeleton = Boolean(isLoading) && visible && !isStructureLoading;
  const showPlaceholder = !visible && !isStructureLoading;

  React.useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node || visible) return;
    return observeUntilVisible(node, () => {
      setVisible(true);
      onVisible?.();
    });
  }, [onVisible, visible]);

  React.useLayoutEffect(() => {
    if (isLoading) setRevealed(false);
  }, [isLoading]);

  React.useLayoutEffect(() => {
    if (isStructureLoading) return;
    if (!isLoading && revealed) return;
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    let revealFrame = 0;

    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rootRect = root.getBoundingClientRect();
        const source = root.querySelector<HTMLElement>("[data-loading-source='true']") ?? root;
        setBox((current) => {
          const width = rootRect.width;
          const height = rootRect.height;
          return current.width === width && current.height === height ? current : { width, height };
        });
        if (!source) return;

        const sourceStyle = window.getComputedStyle(source);
        const sourceFontSize = numericStyleValue(sourceStyle.fontSize);
        const elements = Array.from(source.querySelectorAll<HTMLElement>(
          "main, section, article, form, ul, ol, li, div, a, button, img, input, textarea, select, h1, h2, h3, h4, h5, h6, [role='button'], [data-loading-leaf]"
        ));
        const accepted = new Map<HTMLElement, SkeletonStructureRect>();
        const lastLayers = new Set<HTMLElement>();

        const next = elements.flatMap<SkeletonStructureRect>((element, index) => {
          if (element.closest("[data-loading-overlay='true']") || element.classList.contains("sr-only")) return [];
          if (element.matches("label, legend, fieldset, span, svg")) return [];
          if (lastLayers.size > 0 && Array.from(lastLayers).some((layer) => layer.contains(element))) return [];
          if (
            !element.matches(LAST_LAYER_SELECTOR)
            && element.closest("button, a, label, [role='button'], [data-loading-leaf]")
          ) return [];

          const rect = element.getBoundingClientRect();
          const width = rect.width;
          const height = rect.height;
          if (width <= 0 || height <= 0) return [];
          if (!isInViewport(rect) && element !== source) return [];

          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.display === "contents") return [];
          if (style.position === "absolute" || style.position === "fixed") return [];

          const fontSize = numericStyleValue(style.fontSize) || sourceFontSize;
          const lineHeight = numericStyleValue(style.lineHeight) || fontSize;
          if (width < lineHeight || height < fontSize) return [];

          const lastLayer = isLastLayerElement(element);
          const visualHolder = !lastLayer && hasVisualHolderSurface(element);
          if (!lastLayer && !visualHolder) return [];

          let ancestor = element.parentElement;
          let parentRect: SkeletonStructureRect | undefined;
          while (ancestor && ancestor !== source) {
            parentRect = accepted.get(ancestor);
            if (parentRect) break;
            ancestor = ancestor.parentElement;
          }

          if (
            parentRect
            && !lastLayer
            && rect.left === rootRect.left + parentRect.x
            && rect.top === rootRect.top + parentRect.y
            && width === parentRect.width
            && height === parentRect.height
          ) return [];

          const depth = (parentRect?.depth ?? 0) + 1;
          if (depth > (lastLayer ? 3 : 2)) return [];

          const measuredRect: SkeletonStructureRect = {
            depth,
            height,
            key: `${element.tagName.toLowerCase()}-${index}`,
            kind: lastLayer ? "element" : "container",
            radius: style.borderRadius,
            width,
            x: rect.left - rootRect.left,
            y: rect.top - rootRect.top,
          };
          accepted.set(element, measuredRect);
          if (lastLayer) lastLayers.add(element);
          return [measuredRect];
        });
        setRects((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
        if (!isLoading) {
          revealFrame = window.requestAnimationFrame(() => setRevealed(true));
        }
      });
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(revealFrame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [children, isLoading, isStructureLoading, revealed]);

  const containerColors = [
    "color-mix(in srgb, var(--primary-soft) 58%, var(--bg-surface))",
    "color-mix(in srgb, var(--primary-card) 68%, var(--bg-surface))",
    "color-mix(in srgb, var(--primary-media) 42%, var(--bg-surface))",
    "color-mix(in srgb, var(--primary-media) 55%, var(--bg-surface))",
  ];
  const blockColor = "color-mix(in srgb, var(--primary-media) 68%, var(--bg-surface))";
  const shimmerColor = "color-mix(in srgb, var(--primary-card) 72%, var(--bg-base))";
  const overlayRects = rects.length > 0
    ? rects
    : box.width > 0 && box.height > 0
      ? [{
          depth: 1,
          height: box.height,
          key: "root",
          kind: "container" as const,
          radius: "0.75rem",
          width: box.width,
          x: 0,
          y: 0,
        }]
      : [];

  if (isStructureLoading) return <>{children}</>;
  if (!showSkeleton && visible && revealed) return <>{children}</>;

  return (
    <div
      ref={rootRef}
      aria-busy={showSkeleton || showPlaceholder}
      aria-live="polite"
      inert={showSkeleton || showPlaceholder}
      className={cx("relative w-full max-w-full", className)}
    >
      <div className={showSkeleton || showPlaceholder ? "invisible" : undefined} aria-hidden={showSkeleton || showPlaceholder} data-loading-source="true">
        {children}
      </div>
      {showSkeleton ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-loading-overlay="true">
          {overlayRects.map((rect) => (
            <div
              key={rect.key}
              data-loading-depth={rect.depth}
              data-loading-kind={rect.kind}
              className="absolute overflow-hidden"
              style={{
                backgroundColor: rect.kind === "element" ? blockColor : containerColors[Math.min(rect.depth - 1, containerColors.length - 1)],
                borderRadius: rect.radius,
                height: rect.height,
                left: rect.x,
                top: rect.y,
                width: rect.width,
              }}
            >
              <Shimmer color={shimmerColor} duration={2.6} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Loading({
  loading,
  size = "md",
  className,
  children,
  isLoading = true,
  isStructureLoading = false,
  onVisible,
}: LoadingProps) {
  const resolvedLoading = loading ?? (children != null ? "skeleton-structure" : "spinner");
  const resolvedSize =
    size === "xs"
      ? 12
      : size === "sm"
        ? 14
        : size === "md"
          ? 18
          : size === "lg"
            ? 22
            : size === "xl"
              ? 26
              : size === "xxl"
                ? 30
                : size === "xxxl"
                  ? 34
                  : 18;

  if (resolvedLoading === "skeleton-structure") {
    return (
      <SkeletonStructure
        className={className}
        isLoading={isLoading}
        isStructureLoading={isStructureLoading}
        onVisible={onVisible}
      >
        {children}
      </SkeletonStructure>
    );
  }

  if (
    resolvedLoading === "skeleton" ||
    resolvedLoading === "skeleton-block" ||
    resolvedLoading === "skeleton-card" ||
    resolvedLoading === "skeleton-item"
  ) {
    if (isStructureLoading || !isLoading) return <>{children}</>;
    const childClassName = React.isValidElement(children)
      && typeof (children.props as { className?: unknown }).className === "string"
      ? (children.props as { className: string }).className
      : undefined;
    const tone = resolvedLoading === "skeleton-item" ? "item" : "card";
    const backgroundColor = tone === "card"
      ? "color-mix(in srgb, var(--primary-card) 70%, var(--bg-surface))"
      : "color-mix(in srgb, var(--primary-media) 52%, var(--bg-surface))";
    const shimmerColor = tone === "card"
      ? "color-mix(in srgb, var(--primary-soft) 70%, var(--bg-base))"
      : "color-mix(in srgb, var(--primary-card) 72%, var(--bg-base))";
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        inert
        className={cx(
          "pointer-events-none relative overflow-hidden",
          tone === "item" ? "inline-flex min-w-0 max-w-full self-start align-middle" : "",
          tone === "card" ? "block h-full w-full shadow-sm" : "",
          radiusVariants.lg,
          childClassName,
          className
        )}
        style={{ backgroundColor }}
      >
        <Shimmer color={shimmerColor} duration={tone === "card" ? 3.2 : 2.6} />
        <div className="invisible h-full w-full min-w-0" aria-hidden="true">
          {children}
        </div>
      </div>
    );
  }

  if (resolvedLoading === "spinner") {
    return (
      <div
        className={cx(
          "animate-spin rounded-full border-2 border-current/30 border-t-current",
          className
        )}
        style={{ width: resolvedSize, height: resolvedSize }}
      />
    );
  }

  if (resolvedLoading === "ring") {
    return (
      <motion.div
        className={cx("rounded-full border-2 border-current border-t-transparent", className)}
        style={{ width: resolvedSize, height: resolvedSize }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />
    );
  }

  if (resolvedLoading === "dots") {
    return (
      <div className={cx("flex items-center gap-1", className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="rounded-full bg-current"
            style={{ width: resolvedSize / 3, height: resolvedSize / 3 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
          />
        ))}
      </div>
    );
  }

  if (resolvedLoading === "page" || resolvedLoading === "fullscreen") {
    if (!isLoading) return <>{children}</>;
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className={cx(
          "whale-loader-surface fixed inset-0 z-[9999] flex min-h-screen w-screen flex-col items-center justify-center",
          resolvedLoading === "fullscreen" ? "backdrop-blur-sm" : "",
          className
        )}
      >
        <GiSpermWhale
          aria-label="وال"
          className="whale-loader-icon mb-4 h-24 w-24"
        />
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="whale-loader-dot rounded-full"
              style={{ width: resolvedSize / 2.5, height: resolvedSize / 2.5 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (resolvedLoading === "pulse") {
    return (
      <motion.div
        className={cx("rounded-full bg-current", className)}
        style={{ width: resolvedSize, height: resolvedSize }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
    );
  }

  if (resolvedLoading === "bars") {
    return (
      <div className={cx("flex items-end gap-1", className)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full bg-current"
            style={{ height: resolvedSize }}
            animate={{ scaleY: [1, 1.8, 1] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.1 }}
          />
        ))}
      </div>
    );
  }

  return null;
}
