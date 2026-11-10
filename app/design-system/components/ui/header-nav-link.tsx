"use client";

import { headerNavigationClasses, headerNavigationStyle, isNavigationActive } from "@/app/design-system/variants/navigation.variant";

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
      style={headerNavigationStyle(active)}
    >
      {icon ? <span className="text-lg">{icon}</span> : null}
      <span>{children}</span>
    </Link>
  );
}

export default HeaderNavLink;
