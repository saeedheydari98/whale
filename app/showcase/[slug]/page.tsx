"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FiExternalLink, FiSearch } from "react-icons/fi";
import { IoBagAddOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomSelect } from "@/app/design-system/components/ui/select";
import ProductLink from "@/app/design-system/components/ui/ProductLink";
import ProductRatingSummary from "@/app/design-system/components/ui/product-rating-summary";
import { BannerCarousel } from "@/app/products/product-showcase/banner-carousel";
import { addProductToCart } from "@/lib/cart-client";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import {
  decodeCatalogSegment,
  getShowcaseProducts,
  isProductAvailable,
  normalizeColorStock,
  sortProductsBy,
  type ProductRecord,
} from "@/lib/products-client";

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
  { value: "bestseller", label: "پرفروش‌ترین" },
  { value: "mostDiscounted", label: "بیشترین تخفیف" },
];

function searchableProductText(product: ProductRecord) {
  const typedProduct = product as ProductRecord & { type?: unknown; productType?: unknown };
  return [
    product.title,
    product.description,
    product.badge,
    product.categoryId,
    typedProduct.type,
    typedProduct.productType,
  ].join(" ").toLowerCase();
}

export default function ShowcasePage() {
  const params = useParams();
  const rawSlug = params?.slug ?? "";
  const showcaseId = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const displayShowcaseId = decodeCatalogSegment(showcaseId);
  const { showcases, banners, loading: structureLoading } = useProductsCatalog();
  const structureShowcase = useMemo(
    () => showcases.find((item) => item.id === showcaseId || item.title === displayShowcaseId),
    [displayShowcaseId, showcaseId, showcases]
  );
  const showcaseProductsQuery = useQuery({
    queryKey: ["catalog", "showcase", structureShowcase?.id ?? showcaseId, "products", "page"],
    queryFn: () => getShowcaseProducts(structureShowcase?.id ?? showcaseId, { limit: 100 }),
    enabled: !structureLoading,
  });
  const showcase = (showcaseProductsQuery.data?.section ?? structureShowcase) as typeof structureShowcase;
  const products = showcaseProductsQuery.data?.products ?? [];
  const loading = structureLoading || showcaseProductsQuery.isLoading;
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [cartMessage, setCartMessage] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = products.filter((product) => {
      if (product.active === false || product.isActive === false) return false;
      return !query || searchableProductText(product).includes(query);
    });
    return sortProductsBy(filtered, sort);
  }, [products, searchQuery, sort]);

  const showcaseBanners = useMemo(
    () => banners.filter(() => false),
    [banners]
  );

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
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="flex w-full flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-border pb-4">
          <Loading loading="skeleton-item" isLoading={loading}>
            <div className="text-2xl font-bold">{showcase?.title || `ویترین: ${displayShowcaseId}`}</div>
          </Loading>
          <div className="flex flex-wrap items-center gap-2">
            <CustomInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="جستجو محصول ..."
              aria-label="جستجو محصول"
              showLabel={false}
              size="sm"
              rounded="full"
              icon={<FiSearch />}
              className="bg-primary-media text-sm"
              style={{ backgroundColor: "var(--primary-media)" }}
            />
            <CustomSelect value={sort} aria-label="مرتب‌سازی محصولات ویترین" onChange={(event) => setSort(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CustomSelect>
          </div>
        </div>

        {showcase?.description ? (
          <div className="text-sm text-secondary-text">{showcase.description}</div>
        ) : null}

        {cartMessage ? (
          <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
            {cartMessage}
          </div>
        ) : null}

        {showcaseBanners.length > 0 ? (
          <div className="flex flex-col gap-4">
            {showcaseBanners.map((banner) => (
              <BannerCarousel
                key={banner.id}
                banner={{
                  id: banner.id,
                  title: banner.title ?? "",
                  showcaseId: banner.showcaseId,
                  imageUrls: banner.imageUrls ?? [],
                  active: banner.active !== false,
                  showOnHome: banner.showOnHome,
                  showOnShowcase: banner.showOnShowcase,
                  intervalSeconds: banner.intervalSeconds,
                  heightPercent: banner.heightPercent,
                  homeSortOrder: banner.homeSortOrder,
                  showcaseSortOrder: banner.showcaseSortOrder,
                  sortOrder: Number(banner.showcaseSortOrder ?? banner.sortOrder ?? 0),
                }}
                onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")}
              />
            ))}
          </div>
        ) : null}

        {!loading && visibleProducts.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
            محصولی برای این ویترین پیدا نشد.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {visibleProducts.map((product) => {
            const available = isProductAvailable(product);
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
                    <ProductRatingSummary average={product.ratingAverage} count={product.ratingCount} />
                  </div>
                </div>
                <div className="flex gap-2 border-t border-primary-border pt-3">
                  <CustomButton
                    type="button"
                    variant="success"
                    size="sm"
                    fullWidth
                    className="flex-1"
                    icon={<IoBagAddOutline />}
                    disabled={!available}
                    onClick={() => void addToCart(product)}
                  >
                    {available ? "افزودن" : "ناموجود"}
                  </CustomButton>
                  <ProductLink productId={product.id ?? product.title} productTitle={product.title} className="flex-1" iconAfter={<FiExternalLink />}>
                    مشاهده
                  </ProductLink>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {previewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 p-4 backdrop-blur-sm" onClick={() => setPreviewImage("")}>
          <div className="flex max-h-[75vh] w-full max-w-3xl items-center justify-center overflow-hidden rounded-lg border border-primary-border bg-primary-card p-2 shadow-xl">
            <img
              src={previewImage}
              alt="پیش‌نمایش بنر"
              className="max-h-[72vh] w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
