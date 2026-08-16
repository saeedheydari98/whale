"use client";

import { ThemeProvider } from "@/app/design-system/theme/provider";
import {
  APP_THEME_UPDATED_EVENT,
  fallbackAppTheme,
  fetchAppTheme,
  readCachedAppTheme,
  type AppThemeData,
} from "@/lib/app-theme-client";
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

const AppThemeReadyContext = createContext(false);

function hasSameTheme(first: AppThemeData, second: AppThemeData) {
  return first.primary === second.primary && first.style === second.style;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [adminTheme, setAdminTheme] = useState<AppThemeData>(() => fallbackAppTheme);
  const [themeReady, setThemeReady] = useState(false);

  useLayoutEffect(() => {
    let cancelled = false;

    const applyTheme = (next: AppThemeData) => {
      if (cancelled) return;
      setAdminTheme((current) => (hasSameTheme(current, next) ? current : next));
    };

    const cached = readCachedAppTheme({ allowStale: true });
    const fresh = readCachedAppTheme();
    if (cached) applyTheme(cached);

    const revealTheme = () => {
      if (cancelled) return;
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        document.documentElement.setAttribute("data-theme-ready", "true");
        setThemeReady(true);
      });
    };

    if (fresh) {
      revealTheme();
    } else {
      void fetchAppTheme({ force: true, timeoutMs: 0 })
        .then((next) => applyTheme(next))
        .finally(revealTheme);
    }

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
    <AppThemeReadyContext.Provider value={themeReady}>
      <ThemeProvider initialAdminTheme={adminTheme}>
        {children}
      </ThemeProvider>
    </AppThemeReadyContext.Provider>
  );
}

export function useAppThemeReady() {
  return useContext(AppThemeReadyContext);
}
