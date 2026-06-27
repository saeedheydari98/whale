"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { cx } from "../../variants/shared.variant";

type HeaderNavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function HeaderNavLink({ href, children, className, onClick }: HeaderNavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-20 items-center justify-center border-b-2 px-4 text-sm font-semibold transition-colors",
        active ? "text-primary-text" : "border-transparent text-primary-text hover:text-primary",
        className
      )}
      style={active ? { borderBottomColor: "color-mix(in srgb, var(--primary-border) 58%, var(--primary-text))" } : undefined}
    >
      <span>{children}</span>
    </Link>
  );
}

export default HeaderNavLink;
