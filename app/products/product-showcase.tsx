"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addProductToCart } from "@/lib/cart-client";
import { getProducts, getProductsPageStructure, getShowcaseProducts, isProductAvailable, readCachedProductsPageStructure, type ProductsCache } from "@/lib/products-client";
import Loading from "../design-system/components/loading/loading";
import { CustomModal } from "../design-system/components/ui/modal";
import { LazyViewportSection } from "../design-system/components/ui/lazy-viewport-section";
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

const LOADING_PRODUCTS: Product[] = Array.from({ length: 4 }, (_, index) => ({
  id: `loading-product-${index + 1}`,
  title: "محصول",
  description: "توضیح کوتاه محصول",
  price: "$0",
  active: true,
  isActive: true,
  isAvailable: true,
  stockQuantity: 1,
  sortOrder: index + 1,
}));

const LOADING_BANNER: Banner = {
  id: "loading-banner",
  title: "بنر",
  imageUrls: ["loading-banner"],
  active: true,
  showOnHome: true,
  showOnShowcase: true,
  showOnProducts: true,
  intervalSeconds: 5,
  heightPercent: 28,
  sortOrder: 1,
};

const LOADING_SHOWCASE: Showcase = {
  id: "loading-showcase",
  title: "ویترین",
  active: true,
  limit: 4,
  sortOrder: 2,
};

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

function loadingProductsFor(showcase: Showcase) {
  const limit = Number.isFinite(Number(showcase.limit))
    ? Math.max(1, Math.min(4, Math.round(Number(showcase.limit))))
    : LOADING_PRODUCTS.length;

  return LOADING_PRODUCTS.slice(0, limit).map((product, index) => ({
    ...product,
    id: `${showcase.id}-loading-product-${index + 1}`,
    sortOrder: index + 1,
  }));
}

type LazyShowcaseSectionProps = {
  showcase: Showcase;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onPreview: (imageUrl?: string) => void;
  onDragStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStop: () => void;
  hideShowcaseLink?: boolean;
};

function LazyShowcaseSection({
  showcase,
  products,
  onAddToCart,
  onPreview,
  onDragStart,
  onDragMove,
  onDragStop,
  hideShowcaseLink = false,
}: LazyShowcaseSectionProps) {
  const hasInitialProducts = products.length > 0;
  const showcaseProductsQuery = useQuery({
    queryKey: ["catalog", "showcase", showcase.id, "products", "lazy"],
    queryFn: () => getShowcaseProducts(showcase.id, { limit: Number(showcase.limit ?? 100) || 100 }),
    enabled: Boolean(showcase.id) && showcase.id !== "all-products" && !hasInitialProducts,
    placeholderData: (previous) => previous,
  });

  const loadedProducts = hasInitialProducts
    ? products
    : (showcaseProductsQuery.data?.products as Product[] | undefined) ?? [];
  const isLoading = !hasInitialProducts && showcaseProductsQuery.isLoading;

  if (!isLoading && loadedProducts.length === 0) return null;

  return (
    <ShowcaseSection
      showcase={showcaseProductsQuery.data?.section as Showcase ?? showcase}
      products={isLoading ? loadingProductsFor(showcase) : loadedProducts}
      onAddToCart={onAddToCart}
      onPreview={onPreview}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragStop={onDragStop}
      formatPrice={formatPrice}
      getFinalPrice={getFinalPrice}
      getDiscountPercent={getDiscountPercent}
      hideShowcaseLink={hideShowcaseLink}
      isLoading={isLoading}
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
  const structureLoading = catalogQuery.isLoading;
  const [showSkeletonIntro, setShowSkeletonIntro] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });

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

    const showcaseSections = sortedShowcases
      .map((showcase) => ({
          type: "showcase" as const,
          item: showcase,
          products: showcaseProductsById.get(showcase.id) ?? [],
          sortOrder: showcase.sortOrder,
        }));

    return showcaseSections.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [catalogBanners, mode, showcaseProductsById, sortedProducts, sortedShowcases, tree]);

  

  const loadingSections = useMemo<DisplaySection[]>(() => {
    const withLoadingProducts = (showcase: Showcase): ShowcaseDisplaySection => {
      const products = showcaseProductsById.get(showcase.id) ?? [];

      return {
        type: "showcase",
        item: showcase,
        products: products.length > 0 ? products : loadingProductsFor(showcase),
        sortOrder: showcase.sortOrder,
      };
    };

    if (displaySections.length > 0) {
      return displaySections.map((section) =>
        section.type === "banner"
          ? section
          : {
              ...section,
              products: section.products.length > 0 ? section.products : loadingProductsFor(section.item),
            }
      );
    }

    if (mode === "products") {
      return [{
        type: "showcase",
        item: {
          id: "all-products",
          title: "محصولات",
          active: true,
          limit: 4,
          sortOrder: 1,
        },
        products: loadingProductsFor({ ...LOADING_SHOWCASE, id: "all-products", sortOrder: 1 }),
        sortOrder: 1,
      }];
    }

    if (tree.sections.length > 0) {
      return tree.sections
        .map((section): DisplaySection =>
          section.type === "banner"
            ? {
                type: "banner",
                item: normalizeBanner(section.item, section.sortOrder),
                sortOrder: section.sortOrder,
              }
            : withLoadingProducts(normalizeShowcase(section.item as Showcase, section.sortOrder))
        )
        .filter((section) =>
          section.type === "banner"
            ? section.item.active !== false && (mode === "showcase" ? section.item.showOnProducts === true : section.item.showOnHome !== false)
            : section.item.active !== false
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const bannerSections = catalogBanners
      .map((banner, index): BannerSection => ({
        type: "banner",
        item: normalizeBanner(banner, index + 1),
        sortOrder: Number(
          mode === "showcase"
            ? banner.productSortOrder ?? banner.sortOrder ?? banner.placement ?? index + 1
            : banner.homeSortOrder ?? banner.sortOrder ?? banner.placement ?? index + 1
        ),
      }))
      .filter((section) =>
        section.item.active !== false && (mode === "showcase" ? section.item.showOnProducts === true : section.item.showOnHome !== false)
      );

    const showcaseSections = sortedShowcases
      .filter((showcase) => showcase.active !== false)
      .map(withLoadingProducts);

    const dynamicSections = [...bannerSections, ...showcaseSections].sort((a, b) => a.sortOrder - b.sortOrder);
    if (dynamicSections.length > 0) return dynamicSections;

    return [];
  }, [catalogBanners, displaySections, mode, showcaseProductsById, sortedShowcases, tree.sections]);
  const loading = (loadingSections.length === 0 && structureLoading) || showSkeletonIntro;
  const showWhaleLoading = loading && loadingSections.length === 0;

  useEffect(() => {
    if (structureLoading || !catalogQuery.data || loadingSections.length === 0) return;
    if (cachedStructure || mode === "products") return;

    setShowSkeletonIntro(true);
    const timer = window.setTimeout(() => setShowSkeletonIntro(false), 1000);
    return () => window.clearTimeout(timer);
  }, [cachedStructure, catalogQuery.data, loadingSections.length, mode, structureLoading]);

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

        {showWhaleLoading ? (
          <Loading loading="fullscreen" />
        ) : null}

        {loading && !showWhaleLoading ? (
          <div className="flex flex-col gap-8">
            {loadingSections.map((section) =>
              section.type === "banner" ? (
                <BannerCarousel
                  key={`loading-banner-${section.item.id}`}
                  banner={section.item}
                  onPreview={() => undefined}
                  isLoading
                />
              ) : (
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
              )
            )}
          </div>
        ) : null}

        {!loading && mode === "products" && sortedProducts.length === 0 ? (
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

          {displaySections.map((section) => {
            const fallback = section.type === "banner" ? (
              <BannerCarousel banner={section.item} onPreview={() => undefined} isLoading />
            ) : (
              <ShowcaseSection
                showcase={section.item}
                products={loadingProductsFor(section.item)}
                onAddToCart={() => undefined}
                onPreview={() => undefined}
                onDragStart={() => undefined}
                onDragMove={() => undefined}
                onDragStop={() => undefined}
                formatPrice={(value) => value || ""}
                getFinalPrice={(product) => product.discountPrice || product.price}
                getDiscountPercent={(product) => Number(product.discountPercent) || 0}
                hideShowcaseLink={mode === "products"}
                isLoading
              />
            );

            return (
              <LazyViewportSection key={`${section.type}-${section.item.id}`} fallback={fallback}>
                {section.type === "banner" ? (
                  <BannerCarousel
                    banner={section.item}
                    onPreview={openImagePreview}
                  />
                ) : (
                  <LazyShowcaseSection
                    showcase={section.item}
                    products={section.products}
                    onAddToCart={addToCart}
                    onPreview={openImagePreview}
                    onDragStart={startProductRailDrag}
                    onDragMove={moveProductRailDrag}
                    onDragStop={stopProductRailDrag}
                    hideShowcaseLink={mode === "products"}
                  />
                )}
              </LazyViewportSection>
            );
          })}
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
