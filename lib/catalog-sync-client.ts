"use client";

import { useEffect } from "react";

type CatalogSyncPayload = {
  type?: string;
  version?: number;
};

export function useCatalogSync(onInvalidate: (payload: CatalogSyncPayload) => void) {
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_CATALOG_WS_URL;

    if (wsUrl) {
      const socket = new WebSocket(wsUrl);
      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as CatalogSyncPayload;
          if (payload.type === "catalog.invalidate") onInvalidate(payload);
        } catch {
          onInvalidate({ type: "catalog.invalidate" });
        }
      });

      return () => socket.close();
    }

    const events = new EventSource("/api/catalog/sync");
    const handleCatalogEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(String(event.data)) as CatalogSyncPayload;
        if (payload.type === "catalog.invalidate") onInvalidate(payload);
      } catch {
        onInvalidate({ type: "catalog.invalidate" });
      }
    };

    events.addEventListener("catalog", handleCatalogEvent);
    return () => events.close();
  }, [onInvalidate]);
}

