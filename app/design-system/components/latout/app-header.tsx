"use client";

import Link from "next/link";
import Toggle from "../shared/toggle";
import { useTheme } from "../../theme/provider";
import { useScrollHeaderHide } from "@/hooks/useScrollHeaderHide";

const navItems = [
  { href: "/", label: "home", tone: "bg-ui-info text-white" },
  { href: "/date.converter", label: "date converter", tone: "bg-ui-warning text-white" },
  { href: "/panel/admin", label: "admin panel", tone: "bg-ui-primary text-black" },
  { href: "/panel/user", label: "user panel", tone: "bg-ui-secondary text-white" },
];

export function AppHeader() {
  const { mode, setMode } = useTheme();
  const hideHeader = useScrollHeaderHide(10);
  
  return (
    <header 
      className={`
        sticky top-0 z-30 border-b border-ui-primary/20 
        bg-bg-base/90 backdrop-blur flex justify-center items-center 
        w-full h-20 transition-transform duration-300
        ${hideHeader ? '-translate-y-full' : 'translate-y-0'}
      `}
    >
      <Toggle
        checked={mode === "dark"}
        onChange={(isDark: boolean) => setMode(isDark ? "dark" : "light")}
      />
      <nav className="flex justify-center items-center w-full max-w-5xl flex-wrap gap-3 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${item.tone}`}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
        <a
          className="rounded-md bg-ui-info px-4 py-2 text-sm font-semibold text-white"
          href="http://localhost:6006"
          target="_blank"
          rel="noreferrer"
        >
          storybook
        </a>
      </nav>
    </header>
  );
}