"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useCatalogSync } from "@/lib/catalog-sync-client";
import { clearCatalogDataCache, PRODUCTS_CATALOG_UPDATED_EVENT } from "@/lib/products-client";

function CatalogSyncBridge() {
  const queryClient = useQueryClient();
  const resetCatalogClientCache = useCallback(() => {
    clearCatalogDataCache();
    void queryClient.invalidateQueries({ queryKey: ["catalog"] }, { cancelRefetch: false });
  }, [queryClient]);

  const invalidateCatalog = useCallback(() => {
    window.dispatchEvent(new Event(PRODUCTS_CATALOG_UPDATED_EVENT));
  }, []);

  useCatalogSync(invalidateCatalog);

  useEffect(() => {
    window.addEventListener(PRODUCTS_CATALOG_UPDATED_EVENT, resetCatalogClientCache);
    return () => window.removeEventListener(PRODUCTS_CATALOG_UPDATED_EVENT, resetCatalogClientCache);
  }, [resetCatalogClientCache]);

  return null;
}

export function CatalogQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            gcTime: Infinity,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CatalogSyncBridge />
      {children}
    </QueryClientProvider>
  );
}
