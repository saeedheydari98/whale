"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomButton } from "./design-system/components/ui/button";
import { getProducts, slugifyCatalogValue, type CategoryRecord } from "@/lib/products-client";

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const catalog = await getProducts();
      if (cancelled) return;
      setCategories(catalog.categories.filter((category) => category.active !== false));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-bg-base text-primary-text">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 border-b border-primary-border pb-5">
          <div className="text-3xl font-bold">Categories</div>
          <span className="text-sm text-secondary-text">Choose a category to see all products in that group.</span>
        </div>

        {loading ? (
          <div className="text-sm text-secondary-text">Loading categories...</div>
        ) : null}

        {!loading && categories.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
            No active categories are available.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {categories.map((category) => {
            const slug = slugifyCatalogValue(category.slug || category.title || category.id);
            return (
              <CustomButton
                key={category.id}
                variant="primary"
                border="base"
                rounded="full"
                onClick={() => router.push(`/products/category/${slug || category.id}`)}
              >
                {category.title}
              </CustomButton>
            );
          })}
        </div>
      </div>
    </main>
  );
}
