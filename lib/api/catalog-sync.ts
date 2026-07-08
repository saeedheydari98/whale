type CatalogSyncEvent = {
  type: "catalog.invalidate";
  version: number;
  reason?: string;
  at: string;
};

type CatalogSyncListener = (event: CatalogSyncEvent) => void;

type CatalogSyncState = {
  version: number;
  listeners: Set<CatalogSyncListener>;
};

const globalForCatalogSync = globalThis as typeof globalThis & {
  __catalogSyncState?: CatalogSyncState;
};

function getCatalogSyncState() {
  if (!globalForCatalogSync.__catalogSyncState) {
    globalForCatalogSync.__catalogSyncState = {
      version: 0,
      listeners: new Set(),
    };
  }

  return globalForCatalogSync.__catalogSyncState;
}

export function getCatalogSyncVersion() {
  return getCatalogSyncState().version;
}

export function publishCatalogSyncEvent(reason?: string) {
  const state = getCatalogSyncState();
  state.version += 1;

  const event: CatalogSyncEvent = {
    type: "catalog.invalidate",
    version: state.version,
    reason,
    at: new Date().toISOString(),
  };

  for (const listener of state.listeners) {
    listener(event);
  }

  return event;
}

export function subscribeCatalogSync(listener: CatalogSyncListener) {
  const state = getCatalogSyncState();
  state.listeners.add(listener);

  return () => {
    state.listeners.delete(listener);
  };
}

