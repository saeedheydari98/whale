"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiExternalLink } from "react-icons/fi";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import { slugifyCatalogValue, sortProductsBy } from "@/lib/products-client";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "cheapest", label: "Cheapest" },
  { value: "expensive", label: "Most expensive" },
  { value: "bestseller", label: "Bestseller" },
  { value: "mostDiscounted", label: "Most discounted" },
];

export default function CategoryProductsPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.slug ?? "";
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const { products, categories, loading } = useProductsCatalog();
  const [sort, setSort] = useState("newest");

  const category = useMemo(
    () =>
      categories.find((item) =>
        item.id === slug || slugifyCatalogValue(item.slug || item.title || item.id) === slug
      ),
    [categories, slug]
  );

  const categoryProducts = useMemo(() => {
    const categoryId = category?.id ?? slug;
    const filtered = products.filter(
      (product) =>
        product.active !== false &&
        product.isActive !== false &&
        String(product.categoryId ?? "") === String(categoryId)
    );
    return sortProductsBy(filtered, sort);
  }, [category?.id, products, slug, sort]);

  return (
    <main className="min-h-screen bg-bg-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-5 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-border pb-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold">{category?.title || "Category products"}</div>
            <span className="text-xs font-semibold text-secondary-text">{categoryProducts.length} products</span>
          </div>
          <CustomSelect value={sort} aria-label="Sort products" onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CustomSelect>
        </div>

        {loading ? <div className="text-sm text-secondary-text">Loading products...</div> : null}

        {!loading && categoryProducts.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
            No products found for this category.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {categoryProducts.map((product) => {
            const viewHref = `/products/${slugifyCatalogValue(product.slug || product.title || product.id) || product.id}`;
            return (
              <div key={product.id} className="flex w-full max-w-72 flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
                <div className="flex h-40 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm text-secondary-text">No image</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="line-clamp-1 text-sm font-bold">{product.title}</div>
                  <span className="line-clamp-2 text-xs text-secondary-text">{product.description}</span>
                  <div className="text-sm font-bold text-primary">{product.discountPrice || product.price}</div>
                </div>
                <CustomButton size="sm" variant="primary" iconAfter={<FiExternalLink />} onClick={() => router.push(viewHref)}>
                  View
                </CustomButton>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
