import { cx } from "./shared.variant";

export function isNavigationActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/brand/") : pathname === href || pathname.startsWith(`${href}/`);
}

export function headerNavigationClasses(active: boolean) {
  return cx("group flex h-15 min-w-0 flex-1 flex-col items-center justify-start gap-0 border-border-default pt-2 text-xs font-semibold transition-colors duration-[480ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-default motion-reduce:transition-none", active ? "text-primary" : "text-secondary-text hover:text-primary");
}

export function headerNavigationIconClasses(active: boolean) {
  return cx("order-2 flex h-8 w-10 shrink-0 items-center justify-center rounded-full text-[22px] transition-[transform,color] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none", active ? "translate-y-5 text-primary" : "text-secondary-text group-hover:translate-y-0.5 group-hover:text-primary motion-reduce:group-hover:translate-y-0");
}

export function footerNavigationClasses(active: boolean) {
  return cx("group flex h-16 min-w-0 flex-1 flex-col items-center justify-start gap-0 rounded-2xl border-border-default text-[10px] font-semibold transition-colors duration-[480ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-default motion-reduce:transition-none md:h-12 md:text-[11px]", active ? "text-primary" : "text-secondary-text hover:text-primary");
}

export function footerNavigationIconClasses(active: boolean) {
  return cx("flex h-12 w-14 shrink-0 items-center justify-center rounded-full text-[26px] transition-[transform,color] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:h-8 md:w-10 md:text-[22px]", active ? "-translate-y-6 text-primary md:-translate-y-4" : "text-secondary-text group-hover:-translate-y-0.5 group-hover:text-primary motion-reduce:group-hover:translate-y-0");
}
