"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { IoBagAddOutline } from "react-icons/io5";
import { getProductDetail, getProductDetailPageStructure, isProductAvailable, type ProductDetailResult, type ProductRecord } from "@/lib/products-client";
import { addProductToCart } from "@/lib/cart-client";
import {
  formatAmount as formatPrice,
  getDiscountPercentValue as getDiscountPercent,
  getFinalPriceValue as getFinalPrice,
} from "@/lib/price-format";
import { formatShortPersianDate as formatDate } from "@/lib/date-format";
import { normalizeColorStock } from "@/lib/color-counts";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomTag } from "@/app/design-system/components/ui/tag";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { StarRating } from "@/app/design-system/components/ui/star-rating";
import Loading, { useStructureRouteLoading } from "@/app/design-system/components/loading/loading";
import { ProductReviewsSection, type ProductReview } from "./product-reviews-section";
import { ProductImageGallery } from "./product-image-gallery";
import ColorStockDots from "@/app/design-system/components/ui/color-stock-dots";
import { ProductCardBadge } from "@/app/design-system/components/ui/product-card-badge";
import { AppHeading } from "@/app/design-system/components/ui/text";
import { getPageBootstrap } from "@/lib/page-bootstrap-client";

type ProductTab = "details" | "reviews" | "price";

const PRODUCT_TABS: Array<{ id: ProductTab; label: string }> = [
  { id: "details", label: "مشخصات محصول" },
  { id: "reviews", label: "دیدگاه و امتیاز" },
  { id: "price", label: "تغییرات قیمت" },
];

function formatDimensionValue(value?: number | string | null) {
  return String(value ?? "").trim();
}

function formatDimensions(product: ProductRecord) {
  const dimensions = [product.length, product.width, product.height]
    .map(formatDimensionValue)
    .filter(Boolean);

  return dimensions.length > 0 ? dimensions.join(" × ") : "";
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

function normalizeRatingValue(value: unknown) {
  const ratingValue = Number(value);
  return Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5
    ? ratingValue
    : undefined;
}

function getProductGalleryImages(product: ProductRecord) {
  const values = [
    product.imageUrl,
    ...(Array.isArray(product.images) ? product.images : []),
  ];
  const seen = new Set<string>();
  const imageUrls: string[] = [];

  for (const value of values) {
    const imageUrl = String(value ?? "").trim();
    if (!imageUrl || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    imageUrls.push(imageUrl);
  }

  return imageUrls;
}

export default function ProductPage() {
  const params = useParams();
  const rawSlug = params?.slug ?? params?.id ?? "";
  const productId = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const queryClient = useQueryClient();
  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "product", productId],
    queryFn: () => getPageBootstrap(() => getProductDetailPageStructure(productId)),
    enabled: Boolean(productId),
  });
  const productQuery = useQuery<ProductDetailResult>({
    queryKey: ["catalog", "product", productId],
    queryFn: () => getProductDetail(productId),
    enabled: Boolean(productId),
  });
  const structureProduct = structureQuery.data?.page.products[0] ?? null;
  const fetchedProduct = productQuery.data?.product ?? null;
  const catalogLoading = !fetchedProduct;
  const product = fetchedProduct ?? structureProduct;
  useStructureRouteLoading(structureQuery.isLoading && !structureQuery.data);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [userRating, setUserRating] = useState<number | undefined>(undefined);
  const [isPurchased, setIsPurchased] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [reviewError, setReviewError] = useState("");
  useTransientAppMessage(reviewError);
  const [cartMessage, setCartMessage] = useState("");
  useTransientAppMessage(cartMessage);
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
    setUserRating(normalizeRatingValue(detail.userRating));
  }, [productQuery.data, productStorageKey]);

  const colorStock = useMemo(() => normalizeColorStock(product?.colorStock), [product]);
  const colorOptions = useMemo(() => Object.entries(colorStock), [colorStock]);
  const structureColorCount = Number(product?.colorCount);
  const showColorSection = colorOptions.length > 0
    || (catalogLoading && (product?.hasColors === true || (Number.isFinite(structureColorCount) && structureColorCount > 0)));
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
    const submittedRating = rating;

    if (submittedRating && !isPurchased) {
      setReviewError("امتیاز ستاره‌ای فقط برای خریداران فعال است.");
      return;
    }

    if (submittedRating && hasRated) {
      setReviewError("شما قبلا به این محصول امتیاز داده‌اید.");
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
          ...(submittedRating ? { rating: submittedRating } : {}),
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

      if (submittedRating) {
        setHasRated(true);
        setUserRating(submittedRating);
      }

      if (createdComment) {
        queryClient.setQueryData<ProductDetailResult>(
          ["catalog", "product", productId],
          (current) => current
            ? {
                ...current,
                comments: [createdComment, ...(Array.isArray(current.comments) ? current.comments : [])],
                hasRated: submittedRating ? true : current.hasRated,
                userRating: submittedRating ?? current.userRating,
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

  if (!product) {
    if (structureQuery.isLoading || productQuery.isLoading) return null;
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-primary-base p-6">
        <CustomEmptyState description="محصول موردنظر در فروشگاه پیدا نشد." />
      </div>
    );
  }

  const discountPercent = getDiscountPercent(product);
  const hasColorOptions = colorOptions.length > 0;
  const available = isProductAvailable(product) && (!hasColorOptions || Boolean(firstAvailableColor) || catalogLoading);
  const finalPrice = formatPrice(getFinalPrice(product));
  const originalPrice = formatPrice(product.originalPrice);
  const dimensions = formatDimensions(product);
  const detailRows = [
    ["برند", product.brand],
    ["فروشنده", product.vendor],
    ["کد کالا", product.sku],
    ["بارکد", product.barcode],
    ["سال تولید", product.manufactureYear],
    ["وزن", product.weight],
    ["ابعاد", dimensions],
    ["تاریخ انتشار", formatDate(product.publishedAt)],
  ].filter(([, value]) => String(value ?? "").trim());
  const structureSpecCount = Number(product.specCount);
  const visibleDetailRows = detailRows.length > 0
    ? detailRows
    : catalogLoading && Number.isFinite(structureSpecCount) && structureSpecCount > 0
      ? Array.from({ length: structureSpecCount }, (_, index) => [`مشخصات ${index + 1}`, "مقدار مشخصات"])
      : [];
  const showDiscount = discountPercent > 0 || (catalogLoading && product.hasDiscount === true);
  const showBadge = Boolean(String(product.badge ?? "").trim()) || (catalogLoading && product.hasBadge === true);
  const productDescription = String(product.description ?? "").trim();
  const showDescription = Boolean(productDescription) || (catalogLoading && product.hasDescription === true);
  const displayedReviewCount = catalogLoading
    ? (Number.isFinite(Number(product.reviewCount)) ? Math.max(0, Math.round(Number(product.reviewCount))) : reviews.length)
    : reviews.length;
  const displayedAvgRating = catalogLoading
    ? Number(product.ratingAverage ?? 0)
    : avgRating;
  const loadingReviews = catalogLoading && displayedReviewCount > 0 && reviews.length === 0
    ? Array.from({ length: displayedReviewCount }, (_, index) => ({
        id: `loading-review-${index}`,
        author: "خریدار",
        text: "متن دیدگاه خریدار برای هم‌اندازه بودن اسکلتون بارگذاری.",
        rating: 5,
        createdAt: new Date().toISOString(),
      }))
    : reviews;
  const finalPriceDate = formatDate(product.updatedAt || product.publishedAt || product.createdAt);
  const productGalleryImages = getProductGalleryImages(product);
  const galleryImageCount = Number.isFinite(Number(product.imageCount))
    ? Math.max(productGalleryImages.length, Math.round(Number(product.imageCount)))
    : productGalleryImages.length;

  return (
    <main className="min-h-full bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-6 px-4 py-8">

        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
          <Loading loading="skeleton-structure" isLoading={catalogLoading}>
          <section className="relative flex w-full flex-col gap-6 overflow-hidden rounded-2xl border border-primary-border bg-primary-soft p-6 shadow-sm lg:w-[42rem] lg:max-w-[42rem] lg:shrink-0">
            {showBadge ? <ProductCardBadge label={product.badge} /> : null}
            <div className="flex w-full flex-col gap-4">
              <ProductImageGallery
                imageUrls={productGalleryImages}
                title={product.title}
                isLoading={catalogLoading}
                imageCount={galleryImageCount}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-col gap-3">
                <AppHeading level={1} className="text-3xl font-bold leading-tight text-primary-text">{product.title}</AppHeading>

                <button
                  type="button"
                  onClick={scrollToReviews}
                  disabled={catalogLoading}
                  className="flex w-fit flex-wrap items-center gap-3 rounded-lg text-right transition-opacity hover:opacity-80 disabled:pointer-events-none"
                >
                  <StarRating value={displayedAvgRating} size="md" />
                  <span className="text-sm font-semibold text-primary-text">
                    {displayedAvgRating > 0 ? displayedAvgRating.toFixed(1) : "بدون امتیاز"}
                  </span>
                  <span className="text-sm text-secondary-text">
                    ({displayedReviewCount} دیدگاه)
                  </span>
                </button>
            </div>

            <div className="flex flex-col gap-1 rounded-xl border border-primary-border bg-primary-card p-4">
              {showDiscount ? (
                <div className="text-sm text-danger-text-nomode line-through">{originalPrice || formatPrice(0)}</div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-3xl font-bold text-primary">{finalPrice || "بدون قیمت"}</div>
                {showDiscount ? (
                  <CustomTag size="xs" rounded="full">
                    <span>{discountPercent > 0 ? `${discountPercent}٪ تخفیف` : "تخفیف"}</span>
                  </CustomTag>
                ) : null}
              </div>
            </div>

            {showColorSection ? (
              <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-primary-text">رنگ‌های موجود</div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${firstAvailableColor || catalogLoading ? "bg-success-bg-nomode text-success-text-nomode" : "bg-danger-bg-nomode text-danger-text-nomode"}`}>
                    {firstAvailableColor || catalogLoading ? "موجود" : "ناموجود"}
                  </span>
                </div>
                <ColorStockDots
                  value={hasColorOptions ? product.colorStock : Object.fromEntries(
                    Array.from({ length: Math.max(1, Number.isFinite(structureColorCount) ? structureColorCount : 1) }, (_, index) => [`color-${index}`, 1])
                  )}
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
                disabled={catalogLoading || !available}
                onClick={() => {
                  if (!catalogLoading) addToCart(product);
                }}
              >
                <span>{available ? "افزودن" : "ناموجود"}</span>
              </CustomButton>
            </div>
            </div>
          </section>
          </Loading>

        <Loading loading="skeleton-structure" isLoading={catalogLoading}>
        <section id="product-tabs" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain border-b border-primary-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PRODUCT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-w-max grow whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors hover:bg-primary-soft sm:px-4 sm:text-sm ${
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
                  <AppHeading level={2} className="text-2xl font-bold text-primary-text">مشخصات محصول</AppHeading>
                </div>
                <div className="flex flex-col gap-3">
                  {visibleDetailRows.length > 0 ? visibleDetailRows.map(([label, value]) => (
                    <div key={String(label)} className="flex min-w-52 flex-col gap-1 rounded-md border border-primary-border bg-primary-card p-3">
                      <span className="text-xs font-semibold text-secondary-text">{label}</span>
                      <span className="text-sm font-bold text-primary-text">{String(value)}</span>
                    </div>
                  )) : (
                    <CustomEmptyState description="اطلاعات تکمیلی برای این محصول وجود ندارد." size="sm" />
                  )}
                </div>
                <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-card p-4">
                  <AppHeading level={3} className="text-sm font-bold text-primary-text">توضیحات محصول</AppHeading>
                  {showDescription ? (
                    <div className="whitespace-pre-wrap text-sm leading-7 text-secondary-text">
                      {productDescription || (catalogLoading
                        ? "توضیحات محصول برای هم‌اندازه بودن اسکلتون بارگذاری در حال آماده‌سازی است و پس از دریافت دادهٔ کامل جایگزین می‌شود."
                        : "توضیحات محصول")}
                    </div>
                  ) : (
                    <CustomEmptyState description="توضیحی برای این محصول وجود ندارد." size="sm" />
                  )}
                </div>
              </section>
          ) : null}

          {activeTab === "reviews" ? (
              <ProductReviewsSection
                reviews={loadingReviews}
                text={text}
                rating={rating}
                userRating={userRating}
                isPurchased={isPurchased}
                hasRated={hasRated}
                onTextChange={setText}
                onRatingChange={setRating}
                onSubmit={submitReview}
              />
          ) : null}

          {activeTab === "price" ? (
              <section className="flex flex-col gap-5 rounded-2xl border border-primary-border bg-primary-soft p-6">
                <div className="flex flex-col gap-2">
                  <AppHeading level={2} className="text-2xl font-bold text-primary-text">تغییرات قیمت</AppHeading>
                  <div className="text-sm text-secondary-text">آخرین قیمت ثبت‌شده.</div>
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
        </Loading>
        </div>
      </div>
    </main>
  );
}
