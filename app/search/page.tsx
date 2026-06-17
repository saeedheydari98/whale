"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CustomButton } from "@/app/design-system/components/ui/button";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams?.get("q") || "").trim();
  const router = useRouter();
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!q) {
      setResults(null);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&all=1`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "Search request failed");
        }
        if (!cancelled) setResults(Array.isArray(data?.data?.products) ? data.data.products : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [q]);

  return (
    <main className="min-h-screen bg-bg-base text-primary-text">
      <section className="mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold">Search results for "{q}"</div>
        </div>

        {loading && <div className="text-sm text-secondary-text">Searching…</div>}

        {!loading && results && results.length === 0 && (
          <div className="text-sm text-secondary-text">No results found.</div>
        )}

        {!loading && results && results.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((product) => (
              <div key={product.id} className="rounded-md border border-primary-border p-3 bg-primary-card">
                <div className="flex gap-3">
                  <div className="w-24 h-24 overflow-hidden rounded bg-primary-media">
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" /> : <div className="p-2 text-sm">No image</div>}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="text-sm font-bold">{product.title}</div>
                    <div className="text-primary text-sm font-bold">{product.price}$</div>
                    <div className="text-xs text-secondary-text line-clamp-2">{product.description}</div>
                    <div className="mt-2">
                      <CustomButton size="sm" variant="primary" onClick={() => (window.location.href = `/products/${product.id}`)}>View</CustomButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
