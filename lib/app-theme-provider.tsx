"use client";

import Loading from "@/app/design-system/components/loading/loading";
import { ThemeProvider } from "@/app/design-system/theme/provider";
import {
  APP_THEME_UPDATED_EVENT,
  fetchAppTheme,
  readCachedAppTheme,
  type AppThemeData,
} from "@/lib/app-theme-client";
import { useEffect, useState, type ReactNode } from "react";

function hasSameTheme(first: AppThemeData, second: AppThemeData) {
  return first.primary === second.primary && first.style === second.style;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    adminTheme: AppThemeData | null;
    ready: boolean;
  }>({
    adminTheme: null,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;

    const applyTheme = (next: AppThemeData, ready = true) => {
      if (cancelled) return;
      setState((current) => (
        current.ready === ready && current.adminTheme && hasSameTheme(current.adminTheme, next)
          ? current
          : { adminTheme: next, ready }
      ));
    };

    const cached = readCachedAppTheme({ allowStale: true });
    if (cached) applyTheme(cached);

    void fetchAppTheme({ force: true }).then((next) => applyTheme(next));

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
    <ThemeProvider initialAdminTheme={state.adminTheme ?? undefined}>
      {state.ready ? children : <Loading loading="fullscreen" />}
    </ThemeProvider>
  );
}
