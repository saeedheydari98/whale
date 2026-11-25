import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Numbered pagination must keep its original limit after a resize or route revisit.
export function catalogPageLimit(client: QueryClient, key: QueryKey, measured: number) {
  const cached = client.getQueryData<{ pages: Array<{ pagination: { limit: number } }> }>(key);
  return Math.max(1, cached?.pages[0]?.pagination.limit ?? measured);
}
