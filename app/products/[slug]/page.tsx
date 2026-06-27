"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { IoBagAddOutline, IoBagHandleOutline } from "react-icons/io5";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import type { ProductRecord } from "@/lib/products-client";
import { addProductToCart } from "@/lib/cart-client";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomTag } from "@/app/design-system/components/ui/tag";
import { StarRating } from "@/app/design-system/components/ui/star-rating";
import { ProductReviewsSection, type ProductReview } from "./product-reviews-section";
import Loading from "@/app/design-system/components/loading/loading";
import ColorStockDots from "@/app/design-system/components/ui/color-stock-dots";

const LOADING_PRODUCT: ProductRecord = {
  id: "loading-product",
  title: "Product title placeholder text",
  description: "Description line one for layout sizing\nDescription line two continues here",
  price: "$2,499",
  originalPrice: "$2,899",
  discountPercent: 15,
  badge: "Featured",
  active: true,
  sortOrder: 1,
};

function getFinalPrice(product: ProductRecord) {
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

function getDiscountPercent(product: ProductRecord) {
  const percent = Number(product.discountPercent);
  return Number.isFinite(percent) && percent > 0 ? Math.round(percent) : 0;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return String(value);
  return new Date(time).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

export default function ProductPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? params?.id ?? "";
  const productId = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const { getProductById, loading: catalogLoading, refresh } = useProductsCatalog();
  const product = useMemo(() => getProductById(productId), [getProductById, productId]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [isPurchased, setIsPurchased] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "reviews" | "price">("details");

  const productApiId = product?.id;
  const productStorageKey = String(productApiId ?? productId);

  const loadReviews = useCallback(async () => {
    const numericProductId = Number(productApiId);
    if (!Number.isInteger(numericProductId) || numericProductId <= 0) return;

    try {
      const response = await fetch(`/api/products/${numericProductId}/comments`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "Reviews could not be loaded.");
      }
      const comments = Array.isArray(data?.data?.comments) ? data.data.comments : [];
      setReviews(comments.map((comment: any) => ({
        id: String(comment.id ?? Date.now()),
        text: String(comment.content ?? comment.text ?? ""),
        rating: Number.isFinite(Number(comment.rating)) ? Number(comment.rating) : undefined,
        createdAt: String(comment.createdAt ?? new Date().toISOString()),
      })));
      setIsPurchased(Boolean(data?.data?.isPurchased) || localStorage.getItem(`purchased:${productStorageKey}`) === "1");
      setHasRated(Boolean(data?.data?.hasRated));
    } catch {
      setReviews([]);
      setIsPurchased(localStorage.getItem(`purchased:${productStorageKey}`) === "1");
      setHasRated(false);
    }
  }, [productApiId, productStorageKey]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const colorStock = useMemo(() => normalizeColorStock(product?.colorStock), [product]);
  const colorOptions = useMemo(() => Object.entries(colorStock), [colorStock]);
  const firstAvailableColor = useMemo(
    () => colorOptions.find(([, count]) => count > 0)?.[0] ?? "",
    [colorOptions]
  );

  const ratedReviews = useMemo(
    () => reviews.filter((review) => Number(review.rating) > 0),
    [reviews]
  );

  const avgRating = useMemo(() => {
    if (ratedReviews.length === 0) return 0;
    const total = ratedReviews.reduce((sum, review) => sum + Number(review.rating), 0);
    return Math.round((total / ratedReviews.length) * 10) / 10;
  }, [ratedReviews]);

  const submitReview = async () => {
    if (!text.trim()) return;
    setReviewError("");

    if (rating && !isPurchased) {
      setReviewError("Only customers who purchased this product can submit a rating. You may still leave a comment.");
      return;
    }

    if (rating && hasRated) {
      setReviewError("You have already submitted a star rating for this product.");
      return;
    }

    const numericProductId = Number(productApiId);
    if (!Number.isInteger(numericProductId) || numericProductId <= 0) {
      setReviewError("Product is not ready for reviews yet.");
      return;
    }

    try {
      const response = await fetch(`/api/products/${numericProductId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text.trim(),
          ...(rating ? { rating } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "Review could not be submitted.");
      }
      setText("");
      setRating(undefined);
      await loadReviews();
      if (rating) {
        setHasRated(true);
        await refresh();
      }
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Review could not be submitted.");
    }
  };

  const addToCart = async (item: ProductRecord) => {
    if (Number(item.stockQuantity ?? 0) <= 0) {
      setCartMessage(`${item.title} is out of stock.`);
      window.setTimeout(() => setCartMessage(""), 2000);
      return;
    }

    const cartColor = selectedColor || firstAvailableColor;
    if (cartColor && cartColor !== selectedColor) {
      setSelectedColor(cartColor);
    }

    await addProductToCart(item, 1, cartColor);
    setCartMessage(`${item.title} added to cart.`);
    window.setTimeout(() => setCartMessage(""), 2000);
  };

  const scrollToReviews = () => {
    setActiveTab("reviews");
    document.getElementById("product-tabs")?.scrollIntoView({ behavior: "smooth" });
  };

  if (catalogLoading && !product) {
    return (
      <main className="min-h-screen bg-bg-base text-primary-text">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 py-8 px-4">
          <section className="flex w-full flex-col gap-8 rounded-2xl border border-border-default bg-primary-soft p-6 shadow-sm lg:flex-row lg:items-start">
            <div className="flex w-full flex-col gap-4 lg:max-w-md lg:shrink-0">
              <Loading loading="skeleton-item" isLoading>
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border-default bg-primary-media">
                  <IoBagHandleOutline className="text-6xl text-primary" aria-hidden="true" />
                </div>
              </Loading>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <Loading loading="skeleton-item" isLoading>
                <div>
                  <CustomTag size="xs" rounded="full" border="base">
                    {LOADING_PRODUCT.badge}
                  </CustomTag>
                </div>
              </Loading>
              <Loading loading="skeleton-item" isLoading>
                <div className="text-3xl font-bold leading-tight text-primary-text">
                  {LOADING_PRODUCT.title}
                </div>
              </Loading>
              <div className="flex items-center gap-3">
                <Loading loading="skeleton-item" isLoading>
                  <StarRating value={4} size="md" />
                </Loading>
                <Loading loading="skeleton-item" isLoading>
                  <span className="text-sm font-semibold text-primary-text">4.8</span>
                </Loading>
                <Loading loading="skeleton-item" isLoading>
                  <span className="text-sm text-secondary-text">(128 reviews)</span>
                </Loading>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border-default bg-primary-card p-4">
                <Loading loading="skeleton-item" isLoading>
                  <div className="text-sm text-danger-text-nomode line-through">
                    {LOADING_PRODUCT.originalPrice}
                  </div>
                </Loading>
                <Loading loading="skeleton-item" isLoading>
                  <div className="text-3xl font-bold text-primary">{LOADING_PRODUCT.price}</div>
                </Loading>
              </div>
              <div className="flex flex-col gap-2">
                <Loading loading="skeleton-item" isLoading>
                  <div className="text-sm font-bold text-primary-text">About this product</div>
                </Loading>
                <Loading loading="skeleton-item" isLoading>
                  <div className="text-sm leading-7 text-secondary-text whitespace-pre-wrap">
                    {LOADING_PRODUCT.description}
                  </div>
                </Loading>
              </div>
              <div className="flex flex-wrap gap-3">
              <Loading loading="skeleton-item" isLoading>
                <CustomButton type="button" variant="success" border="base" icon={<IoBagAddOutline />}>
                  Add to cart
                </CustomButton>
              </Loading>
            </div>
            </div>
          </section>

          <section className="flex w-full flex-col gap-8 rounded-2xl border border-border-default bg-primary-soft p-6 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-border-default pb-6">
              <Loading loading="skeleton-item" isLoading>
                <div className="text-2xl font-bold text-primary-text">Customer reviews</div>
              </Loading>
              <Loading loading="skeleton-item" isLoading>
                <div className="text-sm text-secondary-text">
                  Read what shoppers think about this product.
                </div>
              </Loading>
            </div>
            <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
              <div className="flex w-full flex-col gap-5 lg:max-w-xs">
                <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-primary-card p-5">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-4xl font-bold">4.8</div>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading>
                    <StarRating value={4} size="lg" />
                  </Loading>
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-sm text-secondary-text">128 rated reviews</div>
                  </Loading>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex flex-col gap-4 rounded-xl border border-border-default bg-primary-card p-5">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-lg font-bold">Write a review</div>
                  </Loading>
                  <Loading loading="skeleton-item" isLoading>
                    <div className="min-h-28 w-full rounded-lg border border-border-default bg-primary-media" />
                  </Loading>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-bg-base p-6">
        <div className="text-lg font-bold text-primary-text">Product not found</div>
        <div className="text-sm text-secondary-text">The requested product could not be located.</div>
      </div>
    );
  }

  const discountPercent = getDiscountPercent(product);
  const finalPrice = formatPrice(getFinalPrice(product));
  const originalPrice = formatPrice(product.originalPrice);
  const detailRows = [
    ["Brand", product.brand],
    ["Vendor", product.vendor],
    ["SKU", product.sku],
    ["Barcode", product.barcode],
    ["Manufacture year", product.manufactureYear],
    ["Category", product.categoryId],
    ["Stock status", product.stockStatus],
    ["Minimum order", product.minOrder],
    ["Maximum order", product.maxOrder],
    ["Weight", product.weight],
    ["Length", product.length],
    ["Width", product.width],
    ["Height", product.height],
    ["Published", formatDate(product.publishedAt)],
  ].filter(([, value]) => String(value ?? "").trim());
  const finalPriceDate = formatDate(product.updatedAt || product.publishedAt || product.createdAt);

  return (
    <main className="min-h-screen bg-bg-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        {cartMessage ? (
          <div className="rounded-lg border border-primary-border bg-primary-card px-4 py-3 text-sm font-semibold text-primary">
            {cartMessage}
          </div>
        ) : null}

        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
        <Loading loading="skeleton-card" isLoading={catalogLoading}>
          <section className="flex w-full flex-col gap-6 rounded-2xl border border-primary-border bg-primary-soft p-6 shadow-sm lg:w-[42rem] lg:max-w-[42rem] lg:shrink-0">
            <div className="flex w-full flex-col gap-4">
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-primary-border bg-primary-media">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <IoBagHandleOutline className="text-6xl text-primary" aria-hidden="true" />
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-col gap-3">
                {product.badge ? (
                  <div>
                    <CustomTag size="xs" rounded="full" border="base">
                      {product.badge}
                    </CustomTag>
                  </div>
                ) : null}

              <div className="text-3xl font-bold leading-tight text-primary-text">{product.title}</div>

              <button
                type="button"
                onClick={scrollToReviews}
                className="flex w-fit flex-wrap items-center gap-3 rounded-lg text-left transition-opacity hover:opacity-80"
              >
                <StarRating value={avgRating} size="md" />
                <span className="text-sm font-semibold text-primary-text">
                  {avgRating > 0 ? avgRating.toFixed(1) : "No ratings"}
                </span>
                <span className="text-sm text-secondary-text">
                  ({reviews.length} review{reviews.length === 1 ? "" : "s"})
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-1 rounded-xl border border-primary-border bg-primary-card p-4">
              {originalPrice && discountPercent > 0 ? (
                <div className="text-sm text-danger-text-nomode line-through">{originalPrice}</div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-3xl font-bold text-primary">{finalPrice || "No price"}</div>
                {discountPercent > 0 ? (
                  <CustomTag size="xs" rounded="full" border="base">
                    {discountPercent}% off
                  </CustomTag>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-bold text-primary-text">About this product</div>
              <div className="text-sm leading-7 text-secondary-text whitespace-pre-wrap">
                {product.description}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <CustomButton
                type="button"
                variant="success"
                border="base"
                icon={<IoBagAddOutline />}
                onClick={() => addToCart(product)}
              >
                Add to cart
              </CustomButton>
            </div>
            </div>
          </section>
        </Loading>

        <section id="product-tabs" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap gap-2 border-b border-primary-border">
            {[
              { id: "details", label: "Product details" },
              { id: "reviews", label: "Reviews and rating" },
              { id: "price", label: "Price changes" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-primary-soft ${
                  activeTab === tab.id ? "border-primary text-primary-text" : "border-transparent text-secondary-text"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "details" ? (
            <Loading loading="skeleton-card" isLoading={catalogLoading}>
              <section className="flex flex-col gap-6 rounded-2xl border border-primary-border bg-primary-soft p-6">
                <div className="flex flex-col gap-2">
                  <div className="text-2xl font-bold text-primary-text">Full product information</div>
                  <div className="text-sm leading-7 text-secondary-text whitespace-pre-wrap">{product.description}</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {detailRows.length > 0 ? detailRows.map(([label, value]) => (
                    <div key={String(label)} className="flex min-w-52 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
                      <span className="text-xs font-semibold text-secondary-text">{label}</span>
                      <span className="text-sm font-bold text-primary-text">{String(value)}</span>
                    </div>
                  )) : (
                    <div className="text-sm text-secondary-text">No additional product fields are available.</div>
                  )}
                </div>
                <div className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-3">
                  <div className="text-sm font-bold text-primary-text">Color inventory</div>
                  <span className="text-sm font-semibold text-secondary-text">
                    Total stock: {Number(product.stockQuantity ?? 0)}
                  </span>
                  <ColorStockDots
                    value={product.colorStock}
                    selectedColor={selectedColor}
                    onSelect={setSelectedColor}
                    disabledUnavailable
                    size="md"
                  />
                </div>
              </section>
            </Loading>
          ) : null}

          {activeTab === "reviews" ? (
            <Loading loading="skeleton-card" isLoading={catalogLoading}>
              <ProductReviewsSection
                reviews={reviews}
                text={text}
                rating={rating}
                isPurchased={isPurchased}
                hasRated={hasRated}
                error={reviewError}
                onTextChange={setText}
                onRatingChange={setRating}
                onSubmit={submitReview}
              />
            </Loading>
          ) : null}

          {activeTab === "price" ? (
            <Loading loading="skeleton-card" isLoading={catalogLoading}>
              <section className="flex flex-col gap-5 rounded-2xl border border-primary-border bg-primary-soft p-6">
                <div className="flex flex-col gap-2">
                  <div className="text-2xl font-bold text-primary-text">Price changes</div>
                  <div className="text-sm text-secondary-text">Final product price and the date it was recorded.</div>
                </div>
                <div className="flex flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-primary-text">Final price</span>
                    <span className="text-xs text-secondary-text">
                      {finalPriceDate ? `Recorded on ${finalPriceDate}` : "Recorded date is not available"}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-primary">{finalPrice || "No price"}</span>
                </div>
              </section>
            </Loading>
          ) : null}
        </section>
        </div>
      </div>
    </main>
  );
}
