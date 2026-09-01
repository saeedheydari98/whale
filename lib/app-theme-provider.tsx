"use client";

import { ThemeProvider } from "@/app/design-system/theme/provider";
import {
  APP_THEME_UPDATED_EVENT,
  fallbackAppTheme,
  fetchAppTheme,
  readCachedAppTheme,
  type AppThemeData,
} from "@/lib/app-theme-client";
import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from "react";

const AppThemeReadyContext = createContext(false);

function hasSameTheme(first: AppThemeData, second: AppThemeData) {
  return first.primary === second.primary && first.style === second.style;
}

function revealThemedDocument() {
  document.documentElement.setAttribute("data-theme-color-ready", "true");
  document.documentElement.setAttribute("data-theme-ready", "true");
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [adminTheme, setAdminTheme] = useState<AppThemeData>(() => fallbackAppTheme);
  const [applyToDocument, setApplyToDocument] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  const applyTheme = useCallback((next: AppThemeData) => {
    setAdminTheme((current) => (hasSameTheme(current, next) ? current : next));
  }, []);

  const handleDocumentApplied = useCallback(() => {
    revealThemedDocument();
    setThemeReady(true);
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;

    const cached = readCachedAppTheme({ allowStale: true });
    const fresh = readCachedAppTheme();
    if (cached) applyTheme(cached);

    if (cached || fresh) {
      setApplyToDocument(true);
    }

    if (!fresh) {
      const loadRealTheme = () => fetchAppTheme({ force: true, timeoutMs: 0 }).then((next) => {
        if (cancelled) return;
        applyTheme(next);
        setApplyToDocument(true);
      });

      void loadRealTheme().catch(() => {
        if (cancelled) return;
        window.setTimeout(() => {
          if (cancelled) return;
          void loadRealTheme().catch(() => undefined);
        }, 300);
      });
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
  }, [applyTheme]);

  return (
    <AppThemeReadyContext.Provider value={themeReady}>
      <ThemeProvider
        initialAdminTheme={adminTheme}
        applyToDocument={applyToDocument}
        onDocumentApplied={handleDocumentApplied}
      >
        {children}
      </ThemeProvider>
    </AppThemeReadyContext.Provider>
  );
}

export function useAppThemeReady() {
  return useContext(AppThemeReadyContext);
}
