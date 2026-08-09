"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchJsonDeduped } from "@/lib/fetch-json";
import { addProductToCart } from "@/lib/cart-client";
import { isProductAvailable, normalizeColorStock, type ProductRecord } from "@/lib/products-client";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { resolveLoadingItemCount, useLoadingViewportCount } from "@/app/design-system/components/loading/loading-count";
import { ProductListGrid } from "@/app/products/product-list-grid";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams?.get("q") || "").trim();
  const [results, setResults] = useState<ProductRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const viewportProductCount = useLoadingViewportCount("product-grid");
  const resolvedResults = Array.isArray(results) ? results : [];
  const loadingCount = loading ? resolveLoadingItemCount(resolvedResults.length || undefined, viewportProductCount) : 0;

  useEffect(() => {
    let cancelled = false;
    if (!q) {
      setResults(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const data = await fetchJsonDeduped<any>(`/api/products/search?q=${encodeURIComponent(q)}&limit=24`);
        if (data?.ok === false) throw new Error(data?.error || "جست‌وجو ناموفق بود");
        const items = data?.data?.products?.items;
        if (!cancelled) setResults(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [q]);

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

        {cartMessage ? (
          <div className="mb-4 rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
            {cartMessage}
          </div>
        ) : null}

        {q ? (
          <ProductListGrid
            products={resolvedResults}
            loading={loading}
            loadingCount={loadingCount}
            onAddToCart={(product) => void addToCart(product)}
          />
        ) : null}

        {!loading && results && results.length === 0 ? (
          <CustomEmptyState description="نتیجه‌ای با این جست‌وجو پیدا نشد." />
        ) : null}
      </section>
    </main>
  );
}
