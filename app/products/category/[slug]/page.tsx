"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FiExternalLink } from "react-icons/fi";
import { IoBagAddOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import { normalizeColorStock, slugifyCatalogValue, sortProductsBy, type ProductRecord } from "@/lib/products-client";
import { addProductToCart } from "@/lib/cart-client";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import ProductRatingSummary from "@/app/design-system/components/ui/product-rating-summary";

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
  { value: "bestseller", label: "پرفروش‌ترین" },
  { value: "mostDiscounted", label: "بیشترین تخفیف" },
];

export default function CategoryProductsPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const { products, categories, loading } = useProductsCatalog();
  const [sort, setSort] = useState("newest");
  const [cartMessage, setCartMessage] = useState("");

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

  const addToCart = async (product: ProductRecord) => {
    if (Number(product.stockQuantity ?? 0) <= 0) {
      setCartMessage(`${product.title} ناموجود است.`);
      window.setTimeout(() => setCartMessage(""), 1800);
      return;
    }
    const colorStock = normalizeColorStock(product.colorStock);
    const selectedColor = Object.entries(colorStock).find(([, count]) => count > 0)?.[0] ?? "";
    await addProductToCart(product, 1, selectedColor);
    setCartMessage(`${product.title} به سبد خرید اضافه شد.`);
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  return (
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-5 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-border pb-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold">{category?.title || "محصولات دسته‌بندی"}</div>
            <span className="text-xs font-semibold text-secondary-text">{categoryProducts.length} محصول</span>
          </div>
          <CustomSelect value={sort} aria-label="مرتب‌سازی محصولات" onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CustomSelect>
        </div>

        {loading ? <div className="text-sm text-secondary-text">در حال بارگذاری محصولات...</div> : null}

        {!loading && categoryProducts.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
            محصولی برای این دسته‌بندی پیدا نشد.
          </div>
        ) : null}

        {cartMessage ? (
          <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
            {cartMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {categoryProducts.map((product) => {
            return (
              <div key={product.id} className="flex w-full max-w-72 flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
                <div className="flex gap-3">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-primary-media">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-secondary-text">بدون تصویر</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="line-clamp-1 text-sm font-bold">{product.title}</div>
                    <span className="line-clamp-2 text-xs text-secondary-text">{product.description}</span>
                    <div className="text-sm font-bold text-primary">{product.discountPrice || product.price}</div>
                    <ProductRatingSummary
                      average={product.ratingAverage}
                      count={product.ratingCount}
                    />
                  </div>
                </div>
                <div className="flex gap-2 border-t border-primary-border pt-3">
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
                    افزودن
                  </CustomButton>
                  <ProductLink productId={product.id ?? ""} productTitle={product.slug || product.title} className="flex-1" iconAfter={<FiExternalLink />}>
                    مشاهده
                  </ProductLink>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
