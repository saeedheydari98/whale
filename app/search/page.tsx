"use client";

import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { fetchJsonDeduped } from "@/lib/fetch-json";
import { addProductToCart } from "@/lib/cart-client";
import { isProductAvailable, normalizeColorStock, type ProductRecord } from "@/lib/products-client";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { ProductListGrid } from "@/app/products/product-list-grid";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams?.get("q") || "").trim();
  const [pageSize, setPageSize] = useState(0);
  const [cartMessage, setCartMessage] = useState("");
  useTransientAppMessage(cartMessage);
  const resultsQuery = useInfiniteQuery({
    queryKey: ["catalog", "search", q, pageSize],
    queryFn: async ({ pageParam }) => {
      const data = await fetchJsonDeduped<any>(`/api/products/search?q=${encodeURIComponent(q)}&page=${pageParam}&limit=${Math.max(1, pageSize)}`);
      if (data?.ok === false) throw new Error(data?.error || "جست‌وجو ناموفق بود");
      return data?.data?.products;
    },
    enabled: Boolean(q) && pageSize > 0,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination;
      return pagination?.page < pagination?.totalPages ? pagination.page + 1 : undefined;
    },
  });
  const pages = resultsQuery.data?.pages ?? [];
  const resolvedResults = useMemo(
    () => pages.flatMap((page) => Array.isArray(page?.items) ? page.items as ProductRecord[] : []),
    [pages]
  );
  const totalResults = Number(pages[pages.length - 1]?.pagination?.total ?? pages[0]?.pagination?.total);
  const loading = Boolean(q) && (pageSize === 0 || resultsQuery.isLoading);
  const loadMore = useCallback(() => {
    if (resultsQuery.hasNextPage && !resultsQuery.isFetchingNextPage) void resultsQuery.fetchNextPage();
  }, [resultsQuery]);

  const addToCart = async (product: ProductRecord) => {
    if (!isProductAvailable(product)) {
      setCartMessage(`${product.title} ناموجود است.`);
      window.setTimeout(() => setCartMessage(""), 1800);
      return;
    }
    const colorStock = normalizeColorStock(product.colorStock);
    const selectedColor = Object.entries(colorStock).find(([, count]) => count > 0)?.[0] ?? "";
    try {
      await addProductToCart(product, 1, selectedColor);
      setCartMessage(`${product.title} به سبد خرید اضافه شد.`);
    } catch (error) {
      setCartMessage(error instanceof Error ? error.message : "افزودن به سبد خرید ناموفق بود.");
    }
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  return (
    <main className="min-h-full bg-primary-base text-primary-text">
      <section className="mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold">نتایج جست‌وجو برای «{q}»</div>
        </div>


        {q ? (
          <ProductListGrid
            products={resolvedResults}
            loading={loading}
            loadingMore={resultsQuery.isFetchingNextPage}
            totalProducts={Number.isFinite(totalResults) ? totalResults : undefined}
            hasMore={Boolean(resultsQuery.hasNextPage)}
            onLoadMore={loadMore}
            onCapacityChange={setPageSize}
            onAddToCart={(product) => void addToCart(product)}
          />
        ) : null}

        {!loading && resultsQuery.data && resolvedResults.length === 0 ? (
          <CustomEmptyState description="نتیجه‌ای با این جست‌وجو پیدا نشد." />
        ) : null}
      </section>
    </main>
  );
}
