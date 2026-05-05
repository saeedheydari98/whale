"use client";

import React from "react";

const navItems = [
  { href: "/", label: "home", tone: "bg-ui-primary text-white" },
  { href: "/date.converter", label: "date converter", tone: "bg-ui-primary text-white" },
  { href: "/panel/admin", label: "admin panel", tone: "bg-ui-warning text-black" },
  { href: "/panel/user", label: "user panel", tone: "bg-ui-success text-white" },
  { href: "/test", label: "theme test", tone: "bg-ui-secondary text-black" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-ui-primary/20 bg-bg-base/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-3 p-4">
        {navItems.map((item) => (
          <a
            key={item.href}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${item.tone}`}
            href={item.href}
          >
            {item.label}
          </a>
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
