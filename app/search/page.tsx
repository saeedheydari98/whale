"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IoBagAddOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { fetchJsonDeduped } from "@/lib/fetch-json";
import { addProductToCart } from "@/lib/cart-client";
import { normalizeColorStock, type ProductRecord } from "@/lib/products-client";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import ProductRatingSummary from "@/app/design-system/components/ui/product-rating-summary";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams?.get("q") || "").trim();
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!q) {
      setResults(null);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const data = await fetchJsonDeduped<any>(`/api/products/search?q=${encodeURIComponent(q)}&limit=24`);
        if (data?.ok === false) throw new Error(data?.error || "Search request failed");
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
    if (Number(product.stockQuantity ?? 0) <= 0) {
      setCartMessage(`${product.title} is out of stock.`);
      window.setTimeout(() => setCartMessage(""), 1800);
      return;
    }
    const colorStock = normalizeColorStock(product.colorStock);
    const selectedColor = Object.entries(colorStock).find(([, count]) => count > 0)?.[0] ?? "";
    await addProductToCart(product, 1, selectedColor);
    setCartMessage(`${product.title} added to cart.`);
    window.setTimeout(() => setCartMessage(""), 1800);
  };

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

        {cartMessage ? (
          <div className="mb-4 rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
            {cartMessage}
          </div>
        ) : null}

        {!loading && results && results.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((product) => (
              <div key={product.id} className="rounded-md border border-primary-border p-3 bg-primary-card">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <div className="w-24 h-24 shrink-0 overflow-hidden rounded bg-primary-media">
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" /> : <div className="p-2 text-sm">No image</div>}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="text-sm font-bold">{product.title}</div>
                      <div className="text-primary text-sm font-bold">{product.price}$</div>
                      <div className="text-xs text-secondary-text line-clamp-2">{product.description}</div>
                      <ProductRatingSummary
                        average={product.ratingAverage}
                        count={product.ratingCount}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-primary-border pt-2">
                    <CustomButton
                      type="button"
                      variant="success"
                      border="base"
                      size="sm"
                      fullWidth
                      className="flex-1"
                      icon={<IoBagAddOutline />}
                      onClick={() => void addToCart(product)}
                    >
                      Add
                    </CustomButton>
                    <ProductLink productId={product.id} productTitle={product.title} className="flex-1">View</ProductLink>
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
