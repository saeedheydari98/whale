"use client";

import { useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import { addProductToCart } from "@/lib/cart-client";
import { getProductPage, getShowcaseProducts, isProductAvailable } from "@/lib/products-client";
import { CustomModal } from "../design-system/components/ui/modal";
import { BannerCarousel } from "./product-showcase/banner-carousel";
import { ShowcaseSection } from "./product-showcase/showcase-section";
import type { Banner, Product, Showcase } from "./product-showcase/types";

// No default showcase id: only use explicit showcase ids provided by data
function getFinalPrice(product: Product) {
  return product.discountPrice || product.price;
}

function formatPrice(value?: string) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || !normalized) {
    return value || "";
  }

  return `$${parsed.toLocaleString("en-US")}`;
}

function getDiscountPercent(product: Product) {
  const percent = Number(product.discountPercent);
  return Number.isFinite(percent) && percent > 0 ? Math.round(percent) : 0;
}

function normalizeColorStock(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([color, count]) => [
        color.trim(),
        Math.max(0, Math.round(Number(count))),
      ] as const)
      .filter(([color, count]) => color && Number.isFinite(count))
  );
}

function getFirstAvailableColor(product: Product) {
  const colorStock = normalizeColorStock(product.colorStock);
  return Object.entries(colorStock).find(([, count]) => count > 0)?.[0] ?? "";
}

function normalizeShowcase(item: Partial<Showcase>, index: number): Showcase {
  return {
    id: String(item.id ?? `showcase-${index + 1}`),
    title: String(item.title ?? `ویترین ${index + 1}`),
    active: item.active !== false,
    mode: item.mode === "auto" ? "auto" : "manual",
    autoSort: String(item.autoSort ?? "newest"),
    limit: Number.isFinite(Number(item.limit)) ? Math.max(1, Math.round(Number(item.limit))) : 8,
    categoryId: String(item.categoryId ?? ""),
    manualProductIds: Array.isArray(item.manualProductIds) ? item.manualProductIds.map((value) => String(value)) : [],
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function normalizeBanner(item: Partial<Banner> & { bannerUrl?: string; images?: unknown }, index: number): Banner {
  const legacyImage = typeof item.bannerUrl === "string" && item.bannerUrl ? [item.bannerUrl] : [];
  const dbImages = Array.isArray(item.images) ? item.images.map((value) => String(value)).filter(Boolean) : [];
  const imageUrls = Array.isArray(item.imageUrls)
    ? item.imageUrls.map((value) => String(value)).filter(Boolean)
    : dbImages.length > 0
      ? dbImages
      : legacyImage;

  return {
    id: String(item.id ?? `banner-${index + 1}`),
    title: String(item.title ?? `بنر ${index + 1}`),
    imageUrls,
    active: item.active !== false,
    showOnHome: item.showOnHome,
    showOnShowcase: item.showOnShowcase,
    showOnCategories: item.showOnCategories,
    showOnProducts: item.showOnProducts,
    homeSortOrder: item.homeSortOrder,
    showcaseSortOrder: item.showcaseSortOrder,
    categorySortOrder: item.categorySortOrder,
    productSortOrder: item.productSortOrder,
    intervalSeconds: Number.isFinite(Number(item.intervalSeconds)) ? Math.max(1, Math.round(Number(item.intervalSeconds))) : 5,
    heightPercent: Number.isFinite(Number(item.heightPercent)) ? Math.max(10, Math.min(100, Math.round(Number(item.heightPercent)))) : 28,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function ensureShowcases(products: Product[], savedShowcases: Showcase[]) {
  const normalized = savedShowcases.map(normalizeShowcase);
  const byId = new Map(normalized.map((showcase) => [showcase.id, showcase]));

  // Add showcases referenced by products if missing (ignore empty/undefined ids)
  for (const product of products) {
    const showcaseId = product.showcaseId ?? "";
    if (!showcaseId) continue;
    if (!byId.has(showcaseId)) {
      byId.set(showcaseId, {
        id: showcaseId,
        title: "ویترین بدون عنوان",
        active: true,
        sortOrder: byId.size + 1,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

type ProductShowcaseProps = {
  mode?: "storefront" | "showcase" | "products";
  root?: "main" | "div";
};

export function ProductShowcase({ mode = "storefront", root = "main" }: ProductShowcaseProps) {
  // header search is handled on the separate `/search` route
  const { showcases: catalogShowcases, banners: catalogBanners, tree, loading: structureLoading } = useProductsCatalog();
  const [cartMessage, setCartMessage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });

  const sortedShowcases = useMemo(
    () =>
      ensureShowcases([], catalogShowcases as Showcase[]).filter(
        (showcase) => showcase.active
      ),
    [catalogShowcases]
  );

  const allProductsQuery = useQuery({
    queryKey: ["catalog", "products", "page", mode],
    queryFn: () => getProductPage({ limit: 100 }),
    enabled: mode === "products",
  });

  const showcaseQueries = useQueries({
    queries: sortedShowcases.map((showcase) => ({
      queryKey: ["catalog", "showcase", showcase.id, "products", Number(showcase.limit ?? 8)],
      queryFn: () => getShowcaseProducts(showcase.id, { limit: Number(showcase.limit ?? 8) }),
      enabled: mode !== "products" && !structureLoading,
    })),
  });

  const showcaseProductsById = useMemo(() => {
    const map = new Map<string, Product[]>();
    sortedShowcases.forEach((showcase, index) => {
      map.set(showcase.id, (showcaseQueries[index]?.data?.products ?? []) as Product[]);
    });
    return map;
  }, [showcaseQueries, sortedShowcases]);

  const catalogProducts = useMemo(
    () =>
      mode === "products"
        ? allProductsQuery.data?.products ?? []
        : Array.from(showcaseProductsById.values()).flat(),
    [allProductsQuery.data?.products, mode, showcaseProductsById]
  );

  const loading = structureLoading
    || (mode === "products"
      ? allProductsQuery.isLoading
      : showcaseQueries.some((query) => query.isLoading));

  const sortedProducts = useMemo(
    () => catalogProducts.filter((item) => item.active !== false && item.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder),
    [catalogProducts]
  );

  const displaySections = useMemo(() => {
    if (mode === "products") {
      return sortedProducts.length > 0
        ? [{
            type: "showcase" as const,
            item: {
              id: "all-products",
              title: "محصولات",
              active: true,
              sortOrder: 1,
            },
            products: sortedProducts,
            sortOrder: 1,
          }]
        : [];
    }

    if (mode === "showcase") {
      const productBanners = catalogBanners
        .map((banner, index) => ({
          type: "banner" as const,
          item: normalizeBanner(banner, index + 1),
          sortOrder: Number(banner.productSortOrder ?? banner.sortOrder ?? banner.placement ?? index + 1),
        }))
        .filter((section) => section.item.active !== false && section.item.showOnProducts === true);

      const showcaseSections = sortedShowcases
        .map((showcase) => {
          const allProducts = showcaseProductsById.get(showcase.id) ?? [];

          return {
            type: "showcase" as const,
            item: showcase,
            products: allProducts,
            sortOrder: showcase.sortOrder,
          };
        })
        .filter((section) => section.products.length > 0);

      return [...productBanners, ...showcaseSections].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (tree.sections.length > 0) {
      return tree.sections
        .map((section) =>
          section.type === "banner"
            ? {
                type: "banner" as const,
                item: normalizeBanner(section.item, section.sortOrder),
                sortOrder: section.sortOrder,
              }
            : {
                type: "showcase" as const,
                item: normalizeShowcase(section.item as Showcase, section.sortOrder),
                products: showcaseProductsById.get(String(section.item.id)) ?? [],
                sortOrder: section.sortOrder,
              }
        )
        .filter((section) =>
          section.type === "banner"
            ? section.item.active !== false && section.item.showOnHome !== false
            : section.products.length > 0
        );
    }

    const showcaseSections = sortedShowcases
      .map((showcase) => {
        const allProducts = showcaseProductsById.get(showcase.id) ?? [];

        return {
          type: "showcase" as const,
          item: showcase,
          products: allProducts,
          sortOrder: showcase.sortOrder,
        };
      })
      .filter((section) => section.products.length > 0);

    return showcaseSections.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [catalogBanners, mode, showcaseProductsById, sortedProducts, sortedShowcases, tree]);

  

  const loadingSections = useMemo(() => {
    const showcaseSections = sortedShowcases.slice(0, 4)
      .map((showcase) => ({
        type: "showcase" as const,
        item: showcase,
        products: showcaseProductsById.get(showcase.id) ?? [],
        sortOrder: showcase.sortOrder,
      }))
      .filter((section) => section.item.active !== false);

    return showcaseSections.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [showcaseProductsById, sortedShowcases]);

  const startProductRailDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) {
      return;
    }

    dragRef.current = {
      active: true,
      startX: event.pageX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
  };

  const moveProductRailDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    event.preventDefault();
    const dragDistance = event.pageX - dragRef.current.startX;
    event.currentTarget.scrollLeft = dragRef.current.scrollLeft - dragDistance;
  };

  const stopProductRailDrag = () => {
    dragRef.current.active = false;
  };

  const openImagePreview = (imageUrl?: string) => {
    if (!imageUrl) return;
    setPreviewImage(imageUrl);
  };

  const addToCart = async (product: Product) => {
    if (!isProductAvailable(product)) {
      setCartMessage(`${product.title} ناموجود است.`);
      window.setTimeout(() => setCartMessage(""), 1800);
      return;
    }

    const selectedColor = getFirstAvailableColor(product);
    try {
      await addProductToCart(product, 1, selectedColor);
      setCartMessage(`${product.title} به سبد خرید اضافه شد.`);
    } catch (error) {
      setCartMessage(error instanceof Error ? error.message : "افزودن به سبد خرید ناموفق بود.");
    }
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  const Root = root;

  return (
    <Root className="min-h-screen bg-primary-base text-primary-text">
      <section className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 border-b border-primary-border pb-4">
          <div className="text-3xl font-bold">محصولات</div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-8">
            {loadingSections.map((section) => (
                <ShowcaseSection
                  key={`loading-showcase-${section.item.id}`}
                  showcase={section.item}
                  products={section.products}
                  onAddToCart={() => undefined}
                  onPreview={() => undefined}
                  onDragStart={() => undefined}
                  onDragMove={() => undefined}
                  onDragStop={() => undefined}
                  formatPrice={(value) => value || ""}
                  getFinalPrice={(product) => product.discountPrice || product.price}
                  getDiscountPercent={(product) => Number(product.discountPercent) || 0}
                  isLoading
                />
            ))}
          </div>
        ) : null}

        {!loading && sortedProducts.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-6 text-sm text-secondary-text">
            در حال حاضر محصول فعالی وجود ندارد.
          </div>
        ) : null}

        {cartMessage ? (
          <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
            {cartMessage}
          </div>
        ) : null}

        {!loading ? (
        <div className="flex flex-col gap-8">
          {/* Normal showcase/banner sections */}

          {displaySections.map((section) =>
            section.type === "banner" ? (
              <BannerCarousel
                key={`banner-${section.item.id}`}
                banner={section.item}
                onPreview={openImagePreview}
              />
            ) : (
              <ShowcaseSection
                key={`showcase-${section.item.id}`}
                showcase={section.item}
                products={section.products}
                onAddToCart={addToCart}
                onPreview={openImagePreview}
                onDragStart={startProductRailDrag}
                onDragMove={moveProductRailDrag}
                onDragStop={stopProductRailDrag}
                formatPrice={formatPrice}
                getFinalPrice={getFinalPrice}
                getDiscountPercent={getDiscountPercent}
                hideShowcaseLink={mode === "products"}
              />
            )
          )}
        </div>
        ) : null}

        <CustomModal
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage("")}
          title="تصویر محصول"
          rounded="lg"
          shadow="lg"
        >
          <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-md bg-primary-base">
            {previewImage && (
              <img
                src={previewImage}
                alt="پیش‌نمایش تصویر محصول"
                className="max-h-[75vh] w-full object-contain"
              />
            )}
          </div>
        </CustomModal>
      </section>
    </Root>
  );
}
