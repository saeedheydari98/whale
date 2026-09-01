"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { addProductToCart } from "@/lib/cart-client";
import {
  formatAmount as formatPrice,
  getDiscountPercentValue as getDiscountPercent,
  getFinalPriceValue as getFinalPrice,
} from "@/lib/price-format";
import { normalizeColorStock } from "@/lib/color-counts";
import { getCatalogSectionData, getProducts, getProductsPageStructure, getShowcaseProducts, isProductAvailable, readCachedProductsPageStructure, type ProductsCache } from "@/lib/products-client";
import { LazyViewport, useStructureRouteLoading } from "../design-system/components/loading/loading";
import { CustomEmptyState } from "../design-system/components/ui/empty-state";
import { ImagePreview } from "../design-system/components/ui/image-preview";
import { AppHeading } from "../design-system/components/ui/text";
import { BannerCarousel } from "./product-showcase/banner-carousel";
import { ShowcaseSection } from "./product-showcase/showcase-section";
import type { Banner, Product, Showcase } from "./product-showcase/types";

// No default showcase id: only use explicit showcase ids provided by data

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
    productCount: Number.isFinite(Number(item.productCount)) ? Math.max(0, Math.round(Number(item.productCount))) : undefined,
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
    imageCount: Number.isFinite(Number(item.imageCount)) ? Number(item.imageCount) : imageUrls.length,
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

type BannerSection = {
  type: "banner";
  item: Banner;
  sortOrder: number;
};

type ShowcaseDisplaySection = {
  type: "showcase";
  item: Showcase;
  products: Product[];
  sortOrder: number;
};

type DisplaySection = BannerSection | ShowcaseDisplaySection;

type LazyShowcaseSectionProps = {
  showcase: Showcase;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onPreview: (imageUrl?: string) => void;
  hideShowcaseLink?: boolean;
};

function LazyShowcaseSection({
  showcase,
  products,
  onAddToCart,
  onPreview,
  hideShowcaseLink = false,
}: LazyShowcaseSectionProps) {
  const [capacity, setCapacity] = useState(0);
  const hasInitialProducts = products.length > 0;
  const showcaseProductsQuery = useQuery({
    queryKey: ["catalog", "showcase", showcase.id, "products", "lazy", capacity],
    queryFn: () => getShowcaseProducts(showcase.id, { limit: Math.max(1, capacity) }),
    enabled: Boolean(showcase.id) && showcase.id !== "all-products" && !hasInitialProducts && capacity > 0,
    placeholderData: (previous) => previous,
  });

  const loadedProducts = hasInitialProducts
    ? products
    : (showcaseProductsQuery.data?.products as Product[] | undefined) ?? [];
  const isLoading = !hasInitialProducts && (capacity === 0 || showcaseProductsQuery.isLoading);

  if (!isLoading && loadedProducts.length === 0 && Number(showcase.productCount ?? 0) === 0) return null;

  return (
    <ShowcaseSection
      showcase={showcaseProductsQuery.data?.section as Showcase ?? showcase}
      products={loadedProducts}
      onAddToCart={onAddToCart}
      onPreview={onPreview}
      formatPrice={formatPrice}
      getFinalPrice={getFinalPrice}
      getDiscountPercent={getDiscountPercent}
      hideShowcaseLink={hideShowcaseLink}
      isLoading={isLoading}
      totalCount={showcase.productCount}
      onCapacityChange={setCapacity}
    />
  );
}

function ShowcaseBannerSection({
  banner,
  onPreview,
}: {
  banner: Banner;
  onPreview: (imageUrl?: string) => void;
}) {
  const hasImages = banner.imageUrls.length > 0;
  const query = useQuery({
    queryKey: ["catalog", "section", "banner", banner.id],
    queryFn: () => getCatalogSectionData({ type: "banner", id: banner.id }),
    enabled: !hasImages,
  });
  const loaded = query.data?.banner;
  const dataLoading = !hasImages && !loaded?.imageUrls?.length && query.isLoading;

  return (
    <BannerCarousel
      banner={{
        ...banner,
        title: loaded?.title ?? banner.title,
        imageUrls: loaded?.imageUrls ?? banner.imageUrls,
        intervalSeconds: loaded?.intervalSeconds ?? banner.intervalSeconds,
        heightPercent: loaded?.heightPercent ?? banner.heightPercent,
        imageCount: Number(loaded?.imageCount ?? banner.imageCount ?? loaded?.imageUrls?.length ?? 0),
      }}
      onPreview={onPreview}
      isLoading={dataLoading}
    />
  );
}

type ProductShowcaseProps = {
  mode?: "storefront" | "showcase" | "products";
  root?: "main" | "div";
};

export function ProductShowcase({ mode = "storefront", root = "main" }: ProductShowcaseProps) {
  // header search is handled on the separate `/search` route
  const catalogQuery = useQuery({
    queryKey: ["catalog", mode === "products" ? "products-page-full" : "products-page-structure", mode],
    queryFn: () => mode === "products" ? getProducts() : getProductsPageStructure(),
    placeholderData: (previous) => previous,
  });
  const [cachedStructure, setCachedStructure] = useState<ProductsCache | null>(null);
  const structure = catalogQuery.data ?? cachedStructure;
  const catalogShowcases = structure?.catalog.showcases ?? structure?.showcases ?? [];
  const catalogBanners = structure?.banners ?? [];
  const tree = structure?.tree ?? { sections: [] };
  const structureLoading = catalogQuery.isLoading && !structure;
  useStructureRouteLoading(mode !== "products" && structureLoading);
  const [cartMessage, setCartMessage] = useState("");
  useTransientAppMessage(cartMessage);
  const [previewImage, setPreviewImage] = useState("");
  const [bannerPreviewImage, setBannerPreviewImage] = useState("");

  useEffect(() => {
    if (mode !== "products") {
      setCachedStructure(readCachedProductsPageStructure());
    }
  }, [mode]);

  const sortedShowcases = useMemo(
    () =>
      ensureShowcases([], catalogShowcases as Showcase[]).filter(
        (showcase) => showcase.active
      ),
    [catalogShowcases]
  );

  const showcaseProductsById = useMemo(() => {
    const map = new Map<string, Product[]>();
    catalogShowcases.forEach((showcase) => {
      const showcaseWithProducts = showcase as Showcase & { products?: Product[] };
      map.set(showcaseWithProducts.id, Array.isArray(showcaseWithProducts.products) ? showcaseWithProducts.products : []);
    });
    return map;
  }, [catalogShowcases]);

  const catalogProducts = useMemo(
    () =>
      mode === "products"
        ? structure?.products ?? []
        : Array.from(showcaseProductsById.values()).flat(),
    [mode, showcaseProductsById, structure?.products]
  );

  const sortedProducts = useMemo(
    () => catalogProducts.filter((item) => item.active !== false && item.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder),
    [catalogProducts]
  );

  const displaySections = useMemo<DisplaySection[]>(() => {
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
        .map((showcase) => ({
            type: "showcase" as const,
            item: showcase,
            products: showcaseProductsById.get(showcase.id) ?? [],
            sortOrder: showcase.sortOrder,
          }));

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
            : section.item.active !== false
        );
    }

    const bannerSections = catalogBanners
      .map((banner, index): BannerSection => ({
        type: "banner",
        item: normalizeBanner(banner, index + 1),
        sortOrder: Number(banner.homeSortOrder ?? banner.sortOrder ?? banner.placement ?? index + 1),
      }))
      .filter((section) => section.item.active !== false && section.item.showOnHome !== false);

    const showcaseSections = sortedShowcases
      .map((showcase) => ({
          type: "showcase" as const,
          item: showcase,
          products: showcaseProductsById.get(showcase.id) ?? [],
          sortOrder: showcase.sortOrder,
        }));

    return [...bannerSections, ...showcaseSections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [catalogBanners, mode, showcaseProductsById, sortedProducts, sortedShowcases, tree]);

  const openImagePreview = (imageUrl?: string) => {
    if (!imageUrl) return;
    setPreviewImage(imageUrl);
  };

  const openBannerPreview = (imageUrl?: string) => {
    if (!imageUrl) return;
    setBannerPreviewImage(imageUrl);
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
    <Root className="min-h-full bg-primary-base text-primary-text">
      <section className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 border-b border-primary-border pb-4">
          <AppHeading level={1} className="text-3xl font-bold">ویترین محصولات فروشگاه وال</AppHeading>
        </div>

        {!structureLoading && mode === "products" && sortedProducts.length === 0 ? (
          <CustomEmptyState />
        ) : null}

        <div className="flex flex-col gap-8">
          {displaySections.map((section) => {
            if (section.type === "banner") {
              return (
                <LazyViewport
                  key={`${section.type}-${section.item.id}`}
                  fallback={<BannerCarousel banner={section.item} isLoading />}
                >
                  <ShowcaseBannerSection banner={section.item} onPreview={openBannerPreview} />
                </LazyViewport>
              );
            }

            return (
              <LazyViewport
                key={`${section.type}-${section.item.id}`}
                fallback={
                  <ShowcaseSection
                    showcase={section.item}
                    products={[]}
                    onAddToCart={() => undefined}
                    onPreview={() => undefined}
                    formatPrice={formatPrice}
                    getFinalPrice={getFinalPrice}
                    getDiscountPercent={getDiscountPercent}
                    hideShowcaseLink={mode === "products"}
                    isLoading
                    totalCount={Math.min(1, Number(section.item.productCount) || 1)}
                  />
                }
              >
                <LazyShowcaseSection
                  showcase={section.item}
                  products={section.products}
                  onAddToCart={addToCart}
                  onPreview={openImagePreview}
                  hideShowcaseLink={mode === "products"}
                />
              </LazyViewport>
            );
          })}
        </div>

        <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />
        <ImagePreview imageUrl={bannerPreviewImage} onClose={() => setBannerPreviewImage("")} />
      </section>
    </Root>
  );
}
