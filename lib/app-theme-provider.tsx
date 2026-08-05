"use client";

import { ThemeProvider } from "@/app/design-system/theme/provider";
import {
  APP_THEME_UPDATED_EVENT,
  fallbackAppTheme,
  fetchAppTheme,
  readCachedAppTheme,
  type AppThemeData,
} from "@/lib/app-theme-client";
import { useLayoutEffect, useState, type ReactNode } from "react";

function hasSameTheme(first: AppThemeData, second: AppThemeData) {
  return first.primary === second.primary && first.style === second.style;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [adminTheme, setAdminTheme] = useState<AppThemeData>(() => fallbackAppTheme);

  useLayoutEffect(() => {
    let cancelled = false;

    const applyTheme = (next: AppThemeData) => {
      if (cancelled) return;
      setAdminTheme((current) => (hasSameTheme(current, next) ? current : next));
    };

    const cached = readCachedAppTheme({ allowStale: true });
    if (cached) applyTheme(cached);

    void fetchAppTheme({ force: !cached }).then((next) => applyTheme(next));

    const syncCachedTheme = () => {
      const next = readCachedAppTheme({ allowStale: true });
      if (next) applyTheme(next);
    };

    window.addEventListener(APP_THEME_UPDATED_EVENT, syncCachedTheme);
    window.addEventListener("storage", syncCachedTheme);

    return () => {
      cancelled = true;
      window.removeEventListener(APP_THEME_UPDATED_EVENT, syncCachedTheme);
      window.removeEventListener("storage", syncCachedTheme);
    };
  }, []);

  return (
    <ThemeProvider initialAdminTheme={adminTheme}>
      {children}
    </ThemeProvider>
  );
}
