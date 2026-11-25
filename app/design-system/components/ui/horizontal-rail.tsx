"use client";

import { useRef, type HTMLAttributes } from "react";
import { useHorizontalRail } from "@/hooks/use-horizontal-rail";

export function HorizontalRail(props: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useHorizontalRail(ref);
  return <div {...props} ref={ref} />;
}
