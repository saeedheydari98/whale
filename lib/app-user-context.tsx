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
import { CART_UPDATED_EVENT } from "@/lib/cart-client";
import {
  APP_USER_UPDATED_EVENT,
  fetchAppUser,
  readCachedAppUser,
  syncCachedCartCount,
  type AppUserData,
} from "@/lib/app-user-client";
import Loading from "@/app/design-system/components/loading/loading";

type AppUserContextValue = {
  data: AppUserData | null;
  loading: boolean;
  refresh: (options?: { force?: boolean }) => Promise<AppUserData>;
};

const AppUserContext = createContext<AppUserContextValue | null>(null);

export function AppUserProvider({ children }: { children: ReactNode }) {
  const [initialData] = useState(() => readCachedAppUser({ allowStale: true }));
  const [data, setData] = useState<AppUserData | null>(initialData);
  const [loading, setLoading] = useState(() => !initialData);
  const [bootstrapping, setBootstrapping] = useState(() => !initialData);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    setLoading(true);
    const next = await fetchAppUser(options);
    setData(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedAppUser({ allowStale: true });
    if (cached) {
      setData(cached);
      setLoading(false);
      setBootstrapping(false);
    }

    void fetchAppUser({ force: true })
      .then((next) => {
        if (cancelled) return;
        setData(next);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setBootstrapping(false);
      });

    const syncCached = () => {
      const cached = readCachedAppUser({ allowStale: true });
      if (cached) {
        setData(cached);
        setLoading(false);
        setBootstrapping(false);
      }
    };
    const syncCartCount = () => {
      const next = syncCachedCartCount();
      setData(next);
      setLoading(false);
      setBootstrapping(false);
    };

    window.addEventListener(APP_USER_UPDATED_EVENT, syncCached);
    window.addEventListener("storage", syncCached);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);

    return () => {
      cancelled = true;
      window.removeEventListener(APP_USER_UPDATED_EVENT, syncCached);
      window.removeEventListener("storage", syncCached);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
    };
  }, []);

  const value = useMemo(() => ({ data, loading, refresh }), [data, loading, refresh]);

  return (
    <AppUserContext.Provider value={value}>
      {bootstrapping ? <Loading loading="fullscreen" /> : children}
    </AppUserContext.Provider>
  );
}

export function useAppUser() {
  const context = useContext(AppUserContext);
  if (!context) {
    throw new Error("useAppUser must be used within AppUserProvider");
  }
  return context;
}
