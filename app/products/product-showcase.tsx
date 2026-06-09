"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CustomModal } from "../design-system/components/ui/modal";
import { BannerCarousel } from "./product-showcase/banner-carousel";
import { ShowcaseSection } from "./product-showcase/showcase-section";
import type { Banner, Product, Showcase } from "./product-showcase/types";

const PRODUCTS_STORAGE_KEY = "admin-products";
const SHOWCASES_STORAGE_KEY = "admin-product-showcases";
const BANNERS_STORAGE_KEY = "admin-product-banners";
const DEFAULT_SHOWCASE_ID = "default-showcase";
const CART_STORAGE_KEY = "product-cart";
const CART_UPDATED_EVENT = "product-cart-updated";

type CartItem = Product & {
  quantity: number;
};

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

function readLocalProducts(): Product[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLocalShowcases(): Showcase[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHOWCASES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLocalBanners(): Banner[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(BANNERS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function getProductKey(product: Partial<Product>) {
  return [
    product.title,
    product.description,
    product.price,
    product.originalPrice,
    product.discountPrice,
    product.imageUrl,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function dedupeProducts(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = getProductKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeLocalShowcaseIds(apiProducts: Product[], localProducts: Product[]) {
  const localByKey = new Map(localProducts.map((product) => [getProductKey(product), product.showcaseId ?? DEFAULT_SHOWCASE_ID]));

  return apiProducts.map((product) => ({
    ...product,
    showcaseId: localByKey.get(getProductKey(product)) ?? product.showcaseId ?? DEFAULT_SHOWCASE_ID,
  }));
}

function normalizeShowcase(item: Partial<Showcase>, index: number): Showcase {
  return {
    id: String(item.id ?? `showcase-${index + 1}`),
    title: String(item.title ?? `Showcase ${index + 1}`),
    active: item.active !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function normalizeBanner(item: Partial<Banner> & { bannerUrl?: string }, index: number): Banner {
  const legacyImage = typeof item.bannerUrl === "string" && item.bannerUrl ? [item.bannerUrl] : [];
  const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls.map((value) => String(value)).filter(Boolean) : legacyImage;

  return {
    id: String(item.id ?? `banner-${index + 1}`),
    title: String(item.title ?? `Banner ${index + 1}`),
    imageUrls,
    active: item.active !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function ensureShowcases(products: Product[], savedShowcases: Showcase[]) {
  const byId = new Map(savedShowcases.map(normalizeShowcase).map((showcase) => [showcase.id, showcase]));

  if (!byId.has(DEFAULT_SHOWCASE_ID)) {
    byId.set(DEFAULT_SHOWCASE_ID, {
      id: DEFAULT_SHOWCASE_ID,
      title: "Main showcase",
      active: true,
      sortOrder: 1,
    });
  }

  for (const product of products) {
    const showcaseId = product.showcaseId ?? DEFAULT_SHOWCASE_ID;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartMessage, setCartMessage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = await res.json();
        const apiProducts = Array.isArray(data?.data) ? dedupeProducts(data.data) : [];
        const localProducts = dedupeProducts(readLocalProducts().filter((item) => item.active));
        const nextProducts = apiProducts.length > 0 ? mergeLocalShowcaseIds(apiProducts, localProducts) : localProducts;
        setProducts(nextProducts);
        setShowcases(ensureShowcases(nextProducts, readLocalShowcases()));
        setBanners(readLocalBanners().map(normalizeBanner));
      } catch {
        const localProducts = readLocalProducts().filter((item) => item.active);
        setProducts(localProducts);
        setShowcases(ensureShowcases(localProducts, readLocalShowcases()));
        setBanners(readLocalBanners().map(normalizeBanner));
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const sortedProducts = useMemo(
    () => products.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [products]
  );

  const sortedShowcases = useMemo(
    () => ensureShowcases(sortedProducts, showcases).filter((showcase) => showcase.active),
    [sortedProducts, showcases]
  );

  const displaySections = useMemo(() => {
    const bannerSections = banners
      .filter((banner) => banner.active && banner.imageUrls.length > 0)
      .map((banner) => ({ type: "banner" as const, item: banner, sortOrder: banner.sortOrder }));

    const showcaseSections = sortedShowcases
      .map((showcase) => ({
        type: "showcase" as const,
        item: showcase,
        products: sortedProducts.filter((product) => (product.showcaseId ?? DEFAULT_SHOWCASE_ID) === showcase.id),
        sortOrder: showcase.sortOrder,
      }))
      .filter((section) => section.products.length > 0);

    return [...bannerSections, ...showcaseSections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, sortedProducts, sortedShowcases]);

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

  const addToCart = (product: Product) => {
    const key = String(product.id ?? `${product.title}-${product.description}-${product.price}`);
    const currentCart = readCart();
    const existing = currentCart.find((item) => String(item.id ?? `${item.title}-${item.description}-${item.price}`) === key);
    const nextCart = existing
      ? currentCart.map((item) =>
          String(item.id ?? `${item.title}-${item.description}-${item.price}`) === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...currentCart, { ...product, quantity: 1 }];

    writeCart(nextCart);
    setCartMessage(`${product.title} added to cart.`);
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <section className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 border-b border-ui-primary/30 pb-4">
          <div className="text-3xl font-bold">Products</div>
        </div>

        {loading && <div className="text-sm text-text-secondary">Loading products...</div>}

        {!loading && sortedProducts.length === 0 && (
          <div className="rounded-lg border border-ui-primary/30 bg-bg-surface p-6 text-sm text-text-secondary">
            No active products are available.
          </div>
        )}

        {cartMessage && (
          <div className="rounded-md border border-ui-primary/30 bg-bg-surface px-4 py-2 text-sm font-semibold text-ui-primary">
            {cartMessage}
          </div>
        )}

        <div className="flex flex-col gap-8">
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
