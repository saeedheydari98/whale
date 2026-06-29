"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CategoryOption from "./design-system/components/ui/category-option";
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
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full  flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 border-b border-primary-border pb-5">
          <div className="text-3xl font-bold">دسته‌بندی‌ها</div>
          <span className="text-sm text-secondary-text">یک دسته‌بندی را انتخاب کنید تا محصولات همان گروه را ببینید.</span>
        </div>

        {loading ? (
          <div className="text-sm text-secondary-text">در حال بارگذاری دسته‌بندی‌ها...</div>
        ) : null}

        {!loading && categories.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
            در حال حاضر دسته‌بندی فعالی وجود ندارد.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-4">
          {categories.map((category) => {
            const slug = slugifyCatalogValue(category.slug || category.title || category.id);
            return (
              <CategoryOption
                key={category.id}
                label={category.title}
                imageUrl={category.imageUrl}
                size="lg"
                onClick={() => router.push(`/products/category/${slug || category.id}`)}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
