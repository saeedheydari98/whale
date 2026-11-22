"use client";

import { headerNavigationClasses, headerNavigationIconClasses, isNavigationActive } from "@/app/design-system/variants/navigation.variant";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { cx } from "../../variants/shared.variant";

type HeaderNavLinkProps = {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function HeaderNavLink({ href, children, icon, className, onClick }: HeaderNavLinkProps) {
  const pathname = usePathname();
  const active = isNavigationActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(headerNavigationClasses(active), className)}
    >
      {icon ? <span aria-hidden="true" className={headerNavigationIconClasses(active)}>{icon}</span> : null}
      <span className="max-w-full truncate leading-4">{children}</span>
    </Link>
  );
}

export default HeaderNavLink;
