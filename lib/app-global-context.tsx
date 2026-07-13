"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  APP_GLOBAL_UPDATED_EVENT,
  fetchAppGlobal,
  readCachedAppGlobal,
  type AppGlobalData,
} from "@/lib/app-global-client";
import { FullPageLoading } from "@/app/design-system/components/loading/full-page-loading";

type AppGlobalContextValue = {
  data: AppGlobalData | null;
  loading: boolean;
  refresh: (options?: { force?: boolean }) => Promise<AppGlobalData>;
};

const AppGlobalContext = createContext<AppGlobalContextValue | null>(null);

export function AppGlobalProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<AppGlobalData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    setLoading(true);
    const next = await fetchAppGlobal(options);
    setData(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    const cached = readCachedAppGlobal();
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    void fetchAppGlobal().then((next) => {
      if (cancelled) return;
      setData(next);
      setLoading(false);
    });

    const syncCached = () => {
      const cached = readCachedAppGlobal();
      if (cached) setData(cached);
    };
    window.addEventListener(APP_GLOBAL_UPDATED_EVENT, syncCached);
    window.addEventListener("storage", syncCached);

    return () => {
      cancelled = true;
      window.removeEventListener(APP_GLOBAL_UPDATED_EVENT, syncCached);
      window.removeEventListener("storage", syncCached);
    };
  }, []);

  const value = useMemo(() => ({ data, loading, refresh }), [data, loading, refresh]);

  return (
    <AppGlobalContext.Provider value={value}>
      {children}
      {mounted && loading && !data ? <FullPageLoading activeStep={1} title="" /> : null}
    </AppGlobalContext.Provider>
  );
}

export function useAppGlobal() {
  const context = useContext(AppGlobalContext);
  if (!context) {
    throw new Error("useAppGlobal must be used within AppGlobalProvider");
  }
  return context;
}
