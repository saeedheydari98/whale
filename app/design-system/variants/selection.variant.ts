import { cx, glassSurfaceClasses } from "./shared.variant";

export type SelectionLevel = "primary" | "secondary" | "tertiary";
export type SelectionVariant = SelectionLevel | "option" | "filter" | "swatch";

export const selectionGroupClasses: Record<SelectionLevel | "filter", string> = {
  primary: cx("flex w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-primary-soft p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", glassSurfaceClasses),
  secondary: "flex w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain border-b border-primary-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  tertiary: "flex flex-wrap items-center gap-2",
  filter: "flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-primary-border bg-primary-soft p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
};

const itemClasses: Record<SelectionVariant, string> = {
  primary: "flex h-11 shrink-0 basis-28 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold md:basis-auto",
  secondary: "flex min-w-max grow items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold sm:px-4 sm:text-sm",
  tertiary: cx("inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold", glassSurfaceClasses),
  option: "flex min-h-8 min-w-24 flex-[0_1_9rem] items-center gap-1.5 rounded-md border p-1.5 text-start text-xs font-semibold",
  filter: "flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold sm:text-sm",
  swatch: "inline-flex shrink-0 items-center justify-center rounded-full border font-bold tabular-nums",
};

export function selectionItemClasses(variant: SelectionVariant, selected: boolean) {
  const state = variant === "secondary"
    ? selected ? "border-primary text-primary-text" : "border-transparent text-secondary-text hover:bg-primary-soft"
    : variant === "swatch"
      ? selected ? "border-primary text-primary-text ring-2 ring-primary-border" : "border-primary-border text-primary-text"
      : selected
        ? "border-primary bg-primary text-primary-contrast shadow-sm"
        : "border-primary-border bg-primary-card text-primary-text hover:bg-primary-bg";
  return cx("cursor-pointer transition-colors hover:brightness-105", itemClasses[variant], state);
}
