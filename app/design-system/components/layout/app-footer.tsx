"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BiCategoryAlt } from "react-icons/bi";
import { GiSpermWhale } from "react-icons/gi";
import { IoHomeOutline, IoPersonCircleOutline, IoStorefrontOutline } from "react-icons/io5";
import { useIsMobile } from "@/hooks/useIsMobile";

const mobileNavItems = [
  { href: "/", label: "خانه", icon: <IoHomeOutline /> },
  { href: "/categories", label: "دسته بندی", icon: <BiCategoryAlt /> },
  { href: "/products", label: "ویترین", icon: <IoStorefrontOutline /> },
  { href: "/panel/user", label: "حساب کاربری", icon: <IoPersonCircleOutline /> },
];

export function AppFooter() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const visibleNavItems = mobileNavItems;
  const isActiveLink = (href: string) => href === "/"
    ? pathname === "/" || pathname.startsWith("/brand/")
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <footer className="flex h-11 w-full items-center justify-center border-t border-primary-border bg-primary-panel p-2 font-bold text-primary-text md:h-12">
      {isMobile ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 border-t border-primary-border bg-primary-panel/95 px-2 py-1.5 shadow-lg backdrop-blur">
          {visibleNavItems.map((item) => {
            const active = isActiveLink(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  active ? "text-primary" : "text-secondary-text hover:text-primary"
                }`}
              >
                <span className={`flex h-6 min-w-8 items-center justify-center rounded-full text-base transition ${
                  active ? "bg-primary text-primary-contrast shadow-sm ring-1 ring-primary-border" : "text-secondary-text"
                }`}>
                  {item.icon}
                </span>
                <span className="max-w-full truncate leading-none">{item.label}</span>
                <span className={`h-0.5 rounded-full transition-all ${active ? "w-4 bg-primary" : "w-1 bg-transparent"}`} aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
      ) : (
        <div className="flex items-center justify-center gap-2 text-xl font-bold">
          <GiSpermWhale aria-hidden="true" />
          <span>وال</span>
        </div>
      )}
    </footer>
  );
}
