"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppUser } from "@/lib/app-user-context";

type StructureSource = { totalCount: number | undefined; structureEndpoint?: string } | { structureEndpoint: string; totalCount?: number };

export function useStructurePagedCollection<T>({ endpoint, params = "", itemKey, totalCount, structureEndpoint, enabled = true }: {
  endpoint: string; params?: string; itemKey: string; enabled?: boolean;
} & StructureSource) {
  const queryClient = useQueryClient();
  const { data: appUser } = useAppUser();
  const accountId = appUser?.user?.id ?? "guest";
  const [capacity, setCapacity] = useState(0);
  const [debouncedParams, setDebouncedParams] = useState(params);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedParams(params), 300);
    return () => window.clearTimeout(timer);
  }, [params]);
  const pending = params !== debouncedParams;
  const structure = useQuery<{ count: number }>({
    queryKey: ["collection-structure", structureEndpoint, debouncedParams, accountId],
    enabled: enabled && !pending && totalCount === undefined && Boolean(structureEndpoint),
    queryFn: async ({ signal }) => {
      const response = await fetch(`${structureEndpoint}${structureEndpoint?.includes("?") ? "&" : "?"}${debouncedParams}`, { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) throw new Error(payload?.showMessage || "دریافت ساختار اطلاعات انجام نشد.");
      const count = payload?.data?.structure?.count;
      if (!Number.isInteger(count) || count < 0) throw new Error("ساختار اطلاعات معتبر نیست.");
      return { count };
    },
    staleTime: 30_000, refetchOnWindowFocus: false, retry: false,
  });
  const initialCount = totalCount ?? structure.data?.count;
  const structureReady = initialCount !== undefined && !pending;
  const knownEmpty = structureReady && initialCount === 0;
  const result = useInfiniteQuery<{ items: T[]; total: number; nextOffset: number | null }>({
    queryKey: ["admin-list", endpoint, debouncedParams, capacity, accountId],
    enabled: enabled && structureReady && !knownEmpty && capacity > 0 && !pending,
    initialPageParam: 0,
    // Keep the matching total while measurement changes the page capacity.
    // Falling back to the unfiltered structure count can oscillate on small results.
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === endpoint && previousQuery.queryKey[2] === debouncedParams && previousQuery.queryKey[4] === accountId ? previous : undefined,
    queryFn: async ({ pageParam, signal }) => {
      const query = new URLSearchParams(debouncedParams);
      query.set("limit", String(capacity));
      query.set("offset", String(pageParam));
      const response = await fetch(`${endpoint}?${query}`, { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) throw new Error(payload?.showMessage || "دریافت اطلاعات انجام نشد.");
      const data = payload.data;
      if (!data || !Array.isArray(data[itemKey]) || !Number.isInteger(data.total) || data.total < 0
        || (data.nextOffset !== null && (!Number.isInteger(data.nextOffset) || data.nextOffset <= Number(pageParam)))) {
        throw new Error("پاسخ فهرست اطلاعات معتبر نیست.");
      }
      return { items: data[itemKey] as T[], total: data.total as number, nextOffset: data.nextOffset as number | null };
    },
    getNextPageParam: (page) => page.nextOffset,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const items = useMemo(() => knownEmpty || pending ? [] : result.data?.pages.flatMap((page) => page.items) ?? [], [knownEmpty, pending, result.data]);
  return {
    items,
    total: knownEmpty ? 0 : pending ? undefined : result.data?.pages[0]?.total ?? initialCount,
    loading: enabled && !knownEmpty && !structure.isError && (!structureReady || result.isPending || result.isPlaceholderData || result.isRefetching),
    error: structure.error?.message ?? result.error?.message ?? "",
    structureReady,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ["collection-structure"] });
      if (structureReady && !knownEmpty && capacity > 0) return result.refetch();
    },
    collectionProps: {
      totalCount: knownEmpty ? 0 : pending ? undefined : result.data?.pages[0]?.total ?? initialCount,
      onCapacityChange: enabled && structureReady && !knownEmpty ? setCapacity : undefined,
      hasMore: enabled && structureReady && !knownEmpty && !pending && Boolean(result.hasNextPage),
      isLoadingMore: result.isFetchingNextPage,
      onLoadMore: enabled && structureReady && !knownEmpty ? () => { if (!pending && result.hasNextPage && !result.isFetching) void result.fetchNextPage(); } : undefined,
    },
  };
}

export const useAdminPagedCollection = useStructurePagedCollection;
