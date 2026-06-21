"use client";

import { useMemo, useRef, useState } from "react";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import { addProductToCart } from "@/lib/cart-client";
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
    title: String(item.title ?? `Showcase ${index + 1}`),
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
    title: String(item.title ?? `Banner ${index + 1}`),
    imageUrls,
    active: item.active !== false,
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
        title: "Untitled showcase",
        active: true,
        sortOrder: byId.size + 1,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ProductShowcase() {
  // header search is handled on the separate `/search` route
  const { products: catalogProducts, showcases: catalogShowcases, tree, loading } = useProductsCatalog();
  const [cartMessage, setCartMessage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });

  const sortedProducts = useMemo(
    () => catalogProducts.filter((item) => item.active !== false && item.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder),
    [catalogProducts]
  );

  const sortedShowcases = useMemo(
    () =>
      ensureShowcases(sortedProducts, catalogShowcases as Showcase[]).filter(
        (showcase) => showcase.active
      ),
    [sortedProducts, catalogShowcases]
  );

  const displaySections = useMemo(() => {
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
                products: section.products as Product[],
                sortOrder: section.sortOrder,
              }
        )
        .filter((section) => section.type === "banner" || section.products.length > 0);
    }

    const showcaseSections = sortedShowcases
      .map((showcase) => {
        const allProducts = sortedProducts.filter((product) => (product.showcaseId ?? "") === showcase.id);

        return {
          type: "showcase" as const,
          item: showcase,
          products: allProducts,
          sortOrder: showcase.sortOrder,
        };
      })
      .filter((section) => section.products.length > 0);

    return showcaseSections.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sortedProducts, sortedShowcases, tree]);

  

  const loadingSections = useMemo(() => {
    const activeProducts = sortedProducts
      .filter((item) => item.active !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const localSortedShowcases = ensureShowcases(
      activeProducts,
      sortedShowcases as Showcase[]
    ).filter((showcase) => showcase.active !== false);

    const showcaseSections = localSortedShowcases
      .map((showcase) => ({
        type: "showcase" as const,
        item: showcase,
        products: activeProducts.filter((product) => (product.showcaseId ?? "") === showcase.id),
        sortOrder: showcase.sortOrder,
      }))
      .filter((section) => section.products.length > 0);

    return showcaseSections.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sortedProducts, sortedShowcases]);

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
    if (Number(product.stockQuantity ?? 0) <= 0) {
      setCartMessage(`${product.title} is out of stock.`);
      window.setTimeout(() => setCartMessage(""), 1800);
      return;
    }

    const selectedColor = getFirstAvailableColor(product);
    await addProductToCart(product, 1, selectedColor);
    setCartMessage(`${product.title} added to cart.`);
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  return (
    <main className="min-h-screen bg-bg-base text-primary-text">
      <section className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 border-b border-primary-border pb-4">
          <div className="text-3xl font-bold">Products</div>
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
            No active products are available.
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
              />
            )
          )}
        </div>
        ) : null}

        <CustomModal
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage("")}
          title="Product image"
          closeText="Close"
          rounded="lg"
          border="base"
          shadow="lg"
        >
          <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-md bg-bg-base">
            {previewImage && (
              <img
                src={previewImage}
                alt="Product image preview"
                className="max-h-[75vh] w-full object-contain"
              />
            )}
          </div>
        </CustomModal>
      </section>
    </main>
  );
}
