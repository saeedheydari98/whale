import { cx } from "./shared.variant";

export function isNavigationActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/brand/") : pathname === href || pathname.startsWith(`${href}/`);
}

export function headerNavigationClasses(active: boolean) {
  return cx("flex h-20 items-center justify-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-border", active ? "text-primary-text" : "border-transparent text-primary-text hover:text-primary");
}

export function headerNavigationStyle(active: boolean) {
  return active ? { borderBottomColor: "color-mix(in srgb, var(--primary-border) 58%, var(--primary-text))" } : undefined;
}

export function footerNavigationClasses(active: boolean) {
  return cx("flex h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-border", active ? "text-primary" : "text-secondary-text hover:text-primary");
}

export function footerNavigationIconClasses(active: boolean) {
  return cx("flex h-6 min-w-8 items-center justify-center rounded-full text-base transition-colors", active ? "bg-primary text-primary-contrast shadow-sm ring-1 ring-primary-border" : "text-secondary-text");
}

export function footerNavigationIndicatorClasses(active: boolean) {
  return cx("h-0.5 rounded-full transition-[width,background-color]", active ? "w-4 bg-primary" : "w-1 bg-transparent");
}
