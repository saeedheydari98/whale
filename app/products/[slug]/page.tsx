"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { IoBagAddOutline, IoBagHandleOutline } from "react-icons/io5";
import { findProductById, getProductDetail, isProductAvailable, type ProductDetailResult, type ProductRecord } from "@/lib/products-client";
import { addProductToCart } from "@/lib/cart-client";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomTag } from "@/app/design-system/components/ui/tag";
import { StarRating } from "@/app/design-system/components/ui/star-rating";
import Loading from "@/app/design-system/components/loading/loading";
import { ProductReviewsSection, type ProductReview } from "./product-reviews-section";
import ColorStockDots from "@/app/design-system/components/ui/color-stock-dots";

const LOADING_PRODUCT: ProductRecord = {
  id: "loading-product",
  title: "عنوان محصول",
  description: "توضیح کوتاه محصول برای پیش‌نمایش\nادامه توضیحات محصول در این بخش نمایش داده می‌شود",
  price: "$2,499",
  originalPrice: "$2,899",
  discountPercent: 15,
  badge: "ویژه",
  active: true,
  sortOrder: 1,
};

type ProductTab = "details" | "reviews" | "price";

const PRODUCT_TABS: Array<{ id: ProductTab; label: string }> = [
  { id: "details", label: "مشخصات محصول" },
  { id: "reviews", label: "دیدگاه و امتیاز" },
  { id: "price", label: "تغییرات قیمت" },
];

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
  return new Date(time).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDimensionValue(value?: number | string | null) {
  return String(value ?? "").trim();
}

function formatDimensions(product: ProductRecord) {
  const dimensions = [product.length, product.width, product.height]
    .map(formatDimensionValue)
    .filter(Boolean);

  return dimensions.length > 0 ? dimensions.join(" × ") : "";
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

function commentDisplayName(comment: any) {
  const candidates = [
    comment.user?.firstName,
    comment.profile?.firstName,
    comment.firstName,
    comment.author,
    comment.user?.name,
    comment.user?.username,
  ];

  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (!text || text.includes("@")) continue;
    const firstName = text.split(/\s+/).find(Boolean);
    if (firstName) return firstName;
  }

  return "مهمان";
}

function mapReviews(comments: unknown[]): ProductReview[] {
  return comments.map((comment: any) => ({
    id: String(comment.id ?? Date.now()),
    author: commentDisplayName(comment),
    text: String(comment.content ?? comment.text ?? ""),
    rating: Number.isFinite(Number(comment.rating)) ? Number(comment.rating) : undefined,
    createdAt: String(comment.createdAt ?? new Date().toISOString()),
  }));
}

function findProductInQueryValue(value: unknown, productId: string, depth = 0): ProductRecord | null {
  if (!value || depth > 5) return null;

  if (Array.isArray(value)) {
    const direct = findProductById(value as ProductRecord[], productId);
    if (direct) return direct;

    for (const item of value) {
      const found = findProductInQueryValue(item, productId, depth + 1);
      if (found) return found;
    }

    return null;
  }

  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const product = record.product ? findProductInQueryValue([record.product], productId, depth + 1) : null;
  if (product) return product;

  for (const key of ["products", "items", "page", "catalog", "tree", "sections", "showcases"]) {
    const found = findProductInQueryValue(record[key], productId, depth + 1);
    if (found) return found;
  }

  return null;
}

function findCachedProduct(queryClient: QueryClient, productId: string) {
  for (const [, value] of queryClient.getQueriesData({ queryKey: ["catalog"] })) {
    const product = findProductInQueryValue(value, productId);
    if (product) return product;
  }

  return null;
}

export default function ProductPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? params?.id ?? "";
  const productId = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const queryClient = useQueryClient();
  const cachedProduct = useMemo(
    () => (productId ? findCachedProduct(queryClient, productId) : null),
    [productId, queryClient]
  );
  const productQuery = useQuery<ProductDetailResult>({
    queryKey: ["catalog", "product", productId],
    queryFn: () => getProductDetail(productId),
    enabled: Boolean(productId),
    placeholderData: cachedProduct
      ? {
          product: cachedProduct,
          comments: [],
          recommendations: [],
        }
      : undefined,
  });
  const product = productQuery.data?.product ?? null;
  const loadingProduct = product ?? cachedProduct ?? LOADING_PRODUCT;
  const catalogLoading = productQuery.isLoading && !product;
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [isPurchased, setIsPurchased] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeTab, setActiveTab] = useState<ProductTab>("details");

  const productApiId = product?.id;
  const productStorageKey = String(productApiId ?? productId);

  useEffect(() => {
    const detail = productQuery.data;
    if (!detail) return;

    setReviews(mapReviews(Array.isArray(detail.comments) ? detail.comments : []));
    setIsPurchased(Boolean(detail.isPurchased) || localStorage.getItem(`purchased:${productStorageKey}`) === "1");
    setHasRated(Boolean(detail.hasRated));
  }, [productQuery.data, productStorageKey]);

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
      setReviewError("فقط خریداران این محصول می‌توانند امتیاز ثبت کنند. همچنان می‌توانید دیدگاه متنی بنویسید.");
      return;
    }

    if (rating && hasRated) {
      setReviewError("شما قبلا برای این محصول امتیاز ثبت کرده‌اید.");
      return;
    }

    const numericProductId = Number(productApiId);
    if (!Number.isInteger(numericProductId) || numericProductId <= 0) {
      setReviewError("این محصول هنوز برای ثبت دیدگاه آماده نیست.");
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
        throw new Error(data?.message || "دیدگاه ثبت نشد.");
      }
      const createdComment = data?.data?.comment;
      const createdReview = createdComment ? mapReviews([createdComment])[0] : null;
      setText("");
      setRating(undefined);

      if (createdReview) {
        setReviews((current) => [createdReview, ...current]);
      }

      if (rating) {
        setHasRated(true);
      }

      if (createdComment) {
        queryClient.setQueryData<ProductDetailResult>(
          ["catalog", "product", productId],
          (current) => current
            ? {
                ...current,
                comments: [createdComment, ...(Array.isArray(current.comments) ? current.comments : [])],
                hasRated: rating ? true : current.hasRated,
              }
            : current
        );
      }
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "دیدگاه ثبت نشد.");
    }
  };

  const addToCart = async (item: ProductRecord) => {
    if (!isProductAvailable(item)) {
      setCartMessage(`${item.title} ناموجود است.`);
      window.setTimeout(() => setCartMessage(""), 2000);
      return;
    }

    const cartColor = selectedColor || firstAvailableColor;
    if (colorOptions.length > 0 && !cartColor) {
      setCartMessage("برای افزودن این محصول باید یک رنگ موجود انتخاب کنید.");
      window.setTimeout(() => setCartMessage(""), 2000);
      return;
    }

    if (cartColor && cartColor !== selectedColor) {
      setSelectedColor(cartColor);
    }

    try {
      await addProductToCart(item, 1, cartColor);
      setCartMessage(`${item.title} به سبد خرید اضافه شد.`);
    } catch (error) {
      setCartMessage(error instanceof Error ? error.message : "افزودن به سبد خرید ناموفق بود.");
    }
    window.setTimeout(() => setCartMessage(""), 2000);
  };

  const scrollToReviews = () => {
    setActiveTab("reviews");
    document.getElementById("product-tabs")?.scrollIntoView({ behavior: "smooth" });
  };

  if (catalogLoading && !product) {
    return <Loading loading="product-detail" product={loadingProduct} />;
  }

  if (!product) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-primary-base p-6">
        <div className="text-lg font-bold text-primary-text">محصول پیدا نشد</div>
        <div className="text-sm text-secondary-text">محصول موردنظر در فروشگاه پیدا نشد.</div>
      </div>
    );
  }

  const discountPercent = getDiscountPercent(product);
  const hasColorOptions = colorOptions.length > 0;
  const available = isProductAvailable(product) && (!hasColorOptions || Boolean(firstAvailableColor));
  const finalPrice = formatPrice(getFinalPrice(product));
  const originalPrice = formatPrice(product.originalPrice);
  const dimensions = formatDimensions(product);
  const detailRows = [
    ["برند", product.brand],
    ["فروشنده", product.vendor],
    ["SKU", product.sku],
    ["Barcode", product.barcode],
    ["سال تولید", product.manufactureYear],
    ["وزن", product.weight],
    ["ابعاد", dimensions],
    ["تاریخ انتشار", formatDate(product.publishedAt)],
  ].filter(([, value]) => String(value ?? "").trim());
  const finalPriceDate = formatDate(product.updatedAt || product.publishedAt || product.createdAt);

  return (
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        {cartMessage ? (
          <div className="rounded-lg border border-primary-border bg-primary-card px-4 py-3 text-sm font-semibold text-primary">
            {cartMessage}
          </div>
        ) : null}

        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
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
                    <CustomTag size="xs" rounded="full" >
                      {product.badge}
                    </CustomTag>
                  </div>
                ) : null}

              <div className="text-3xl font-bold leading-tight text-primary-text">{product.title}</div>

              <button
                type="button"
                onClick={scrollToReviews}
                className="flex w-fit flex-wrap items-center gap-3 rounded-lg text-right transition-opacity hover:opacity-80"
              >
                <StarRating value={avgRating} size="md" />
                <span className="text-sm font-semibold text-primary-text">
                  {avgRating > 0 ? avgRating.toFixed(1) : "بدون امتیاز"}
                </span>
                <span className="text-sm text-secondary-text">
                  ({reviews.length} دیدگاه)
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-1 rounded-xl border border-primary-border bg-primary-card p-4">
              {originalPrice && discountPercent > 0 ? (
                <div className="text-sm text-danger-text-nomode line-through">{originalPrice}</div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-3xl font-bold text-primary">{finalPrice || "بدون قیمت"}</div>
                {discountPercent > 0 ? (
                  <CustomTag size="xs" rounded="full">
                    {discountPercent}٪ تخفیف
                  </CustomTag>
                ) : null}
              </div>
            </div>

            {hasColorOptions ? (
              <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-primary-text">رنگ‌های موجود</div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${firstAvailableColor ? "bg-success-bg-nomode text-success-text-nomode" : "bg-danger-bg-nomode text-danger-text-nomode"}`}>
                    {firstAvailableColor ? "موجود" : "ناموجود"}
                  </span>
                </div>
                <ColorStockDots
                  value={product.colorStock}
                  selectedColor={selectedColor}
                  onSelect={setSelectedColor}
                  disabledUnavailable
                  showCount={false}
                  size="md"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <CustomButton
                type="button"
                variant="success"
                icon={<IoBagAddOutline />}
                disabled={!available}
                onClick={() => addToCart(product)}
              >
                {available ? "افزودن" : "ناموجود"}
              </CustomButton>
            </div>
            </div>
          </section>

        <section id="product-tabs" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap gap-2 border-b border-primary-border">
            {PRODUCT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-primary-soft ${
                  activeTab === tab.id ? "border-primary text-primary-text" : "border-transparent text-secondary-text"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "details" ? (
              <section className="flex flex-col gap-6 rounded-2xl border border-primary-border bg-primary-soft p-6">
                <div className="flex flex-col gap-2">
                  <div className="text-2xl font-bold text-primary-text">مشخصات محصول</div>
                </div>
                <div className="flex flex-col gap-3">
                  {detailRows.length > 0 ? detailRows.map(([label, value]) => (
                    <div key={String(label)} className="flex min-w-52 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
                      <span className="text-xs font-semibold text-secondary-text">{label}</span>
                      <span className="text-sm font-bold text-primary-text">{String(value)}</span>
                    </div>
                  )) : (
                    <div className="text-sm text-secondary-text">اطلاعات تکمیلی برای این محصول ثبت نشده است.</div>
                  )}
                </div>
                <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-card p-4">
                  <div className="text-sm font-bold text-primary-text">توضیحات محصول</div>
                  {product.description.trim() ? (
                    <div className="whitespace-pre-wrap text-sm leading-7 text-secondary-text">{product.description}</div>
                  ) : (
                    <div className="text-sm leading-7 text-secondary-text">
                      توضیحی برای این محصول ثبت نشده است.
                    </div>
                  )}
                </div>
              </section>
          ) : null}

          {activeTab === "reviews" ? (
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
          ) : null}

          {activeTab === "price" ? (
              <section className="flex flex-col gap-5 rounded-2xl border border-primary-border bg-primary-soft p-6">
                <div className="flex flex-col gap-2">
                  <div className="text-2xl font-bold text-primary-text">تغییرات قیمت</div>
                  <div className="text-sm text-secondary-text">قیمت نهایی محصول و تاریخ ثبت آن.</div>
                </div>
                <div className="flex flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-primary-text">قیمت نهایی</span>
                    <span className="text-xs text-secondary-text">
                      {finalPriceDate ? `ثبت شده در ${finalPriceDate}` : "تاریخ ثبت قیمت موجود نیست"}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-primary">{finalPrice || "بدون قیمت"}</span>
                </div>
              </section>
          ) : null}
        </section>
        </div>
      </div>
    </main>
  );
}
