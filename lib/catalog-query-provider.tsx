"use client";

import { useCallback, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useCatalogSync } from "@/lib/catalog-sync-client";
import { invalidateFetchCache } from "@/lib/fetch-json";
import { PRODUCTS_CATALOG_UPDATED_EVENT } from "@/lib/products-client";

function CatalogSyncBridge() {
  const queryClient = useQueryClient();
  const invalidateCatalog = useCallback(() => {
    invalidateFetchCache();
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    window.dispatchEvent(new Event(PRODUCTS_CATALOG_UPDATED_EVENT));
  }, [queryClient]);

  useCatalogSync(invalidateCatalog);

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
