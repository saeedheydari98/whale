"use client";

import { collectionCardClasses } from "@/app/design-system/variants/collection-card.variant";

import { useQuery } from "@tanstack/react-query";
import { useStructurePagedCollection } from "@/hooks/use-structure-paged-collection";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { IoCheckmarkCircle, IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { StarRating } from "@/app/design-system/components/ui/star-rating";
import { AppHeading } from "@/app/design-system/components/ui/text";

export type ProductReview = {
  id: string;
  author?: string;
  text: string;
  rating?: number;
  createdAt: string;
};

type ProductReviewsSectionProps = {
  productId?: string | number;
  totalCount?: number;
  text: string;
  rating?: number;
  userRating?: number;
  isPurchased: boolean;
  hasRated: boolean;
  onTextChange: (value: string) => void;
  onRatingChange: (value: number | undefined) => void;
  onSubmit: () => void;
};

function formatReviewDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function ProductReviewsSection({
  productId,
  totalCount,
  text,
  rating,
  userRating,
  isPurchased,
  hasRated,
  onTextChange,
  onRatingChange,
  onSubmit,
}: ProductReviewsSectionProps) {
  const endpoint = "/api/products/" + encodeURIComponent(String(productId)) + "/comments";
  const hasProduct = Number.isInteger(Number(productId)) && Number(productId) > 0;
  const summary = useQuery({
    enabled: hasProduct,
    queryKey: ["review-structure", String(productId)],
    queryFn: async ({ signal }) => {
      const response = await fetch(endpoint + "/structure", { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) throw new Error(payload?.showMessage || "دریافت ساختار دیدگاه‌ها انجام نشد.");
      return payload.data.structure as { count: number; ratings: Array<{ stars: number; count: number }> };
    }, staleTime: 30_000, refetchOnWindowFocus: false, retry: false,
  });
  const page = useStructurePagedCollection<{ id: string; author?: string; content: string; rating?: number | null; createdAt: string }>({ endpoint, itemKey: "comments", totalCount: summary.data?.count ?? totalCount, enabled: hasProduct });
  useTransientAppMessage(summary.error?.message || page.error);
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: summary.data?.ratings.find((group) => group.stars === stars)?.count ?? 0 }));
  const ratedCount = distribution.reduce((total, group) => total + group.count, 0);
  const avgRating = ratedCount ? Math.round(distribution.reduce((total, group) => total + group.stars * group.count, 0) / ratedCount * 10) / 10 : 0;
  const maxCount = Math.max(1, ...distribution.map((item) => item.count));
  const canRate = isPurchased && !hasRated;
  const displayRating = rating ?? userRating ?? 0;

  return (
    <section
      id="product-reviews"
      className="flex w-full flex-col gap-4 rounded-2xl border border-primary-border bg-primary-soft p-3 shadow-sm sm:p-4"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-primary-border pb-3">
        <AppHeading level={2} className="text-2xl font-bold text-primary-text">دیدگاه‌های خریداران</AppHeading>
        <div className="text-sm text-secondary-text">
          نظر خریداران و امتیازها را ببینید.
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="flex w-full flex-col gap-3 lg:max-w-xs lg:shrink-0">
          <Loading loading="skeleton-structure" isLoading={summary.isPending}>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-border bg-primary-card p-2">
            <div className="text-4xl font-bold leading-none text-primary-text">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </div>
            <StarRating value={avgRating} size="lg" ariaLabel={`میانگین امتیاز ${avgRating} از ۵`} />
            <div className="text-sm text-secondary-text">
              {ratedCount > 0
                ? `${ratedCount} دیدگاه امتیازدار`
                : "هنوز امتیازی ثبت نشده است"}
            </div>
            <div className="text-xs text-secondary-text">
              مجموع {page.total ?? totalCount ?? 0} دیدگاه
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {distribution.map((item) => {
              const width = `${Math.round((item.count / maxCount) * 100)}%`;

              return (
                <div key={item.stars} className="flex items-center gap-3">
                  <div className="w-12 text-xs font-medium text-secondary-text">{item.stars} ستاره</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary-media">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width }}
                    />
                  </div>
                  <div className="w-6 text-right text-xs text-secondary-text">{item.count}</div>
                </div>
              );
            })}
          </div>
          </Loading>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-card p-3">
            <div className="text-lg font-bold text-primary-text">ثبت دیدگاه</div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-primary-text">امتیاز شما</div>
              <div className="flex flex-wrap items-center gap-3">
                <StarRating
                  value={displayRating}
                  size="lg"
                  interactive
                  disabled={!canRate}
                  onChange={(value) => onRatingChange(value)}
                />
                {rating ? (
                  <div className="text-sm font-semibold text-amber-500">{rating}.0 از ۵</div>
                ) : hasRated ? (
                  <div className="text-sm text-secondary-text">شما قبلا به این محصول امتیاز داده‌اید</div>
                ) : (
                  <div className="text-sm text-secondary-text">برای امتیاز دادن، یک ستاره را انتخاب کنید</div>
                )}
              </div>
              {!isPurchased ? (
                <div className="text-xs leading-5 text-secondary-text">
                  امتیاز ستاره‌ای فقط برای خریداران فعال است.
                </div>
              ) : hasRated ? (
                <div className="flex items-center gap-1 text-xs font-medium text-secondary-text">
                  <IoCheckmarkCircle aria-hidden="true" />
                  <span>می‌توانید دیدگاه متنی هم ثبت کنید.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <IoCheckmarkCircle aria-hidden="true" />
                  <span>خرید تایید شده است.</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-primary-text">
                دیدگاه شما
              </div>
              <CustomInput
                multiline
                id="review-text"
                aria-label="دیدگاه شما"
                value={text}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder="از کیفیت، ارزش خرید یا تجربه استفاده از این محصول بنویسید."
                rounded="lg"
                className="min-h-28 text-sm"
                style={{ backgroundColor: "var(--primary-soft)" }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <CustomButton type="button" variant="primary" onClick={onSubmit}>
                <span>ثبت دیدگاه</span>
              </CustomButton>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-bold text-primary-text">همه دیدگاه‌ها</div>
              <div className="text-xs text-secondary-text">جدیدترین‌ها</div>
            </div>

            {!page.loading && page.items.length === 0 ? <CustomEmptyState size="sm" icon={<IoChatbubbleEllipsesOutline />} /> : null}
            <DynamicLoadingCollection items={page.items} isLoading={page.loading} {...page.collectionProps} lazy className="flex flex-col gap-2" getKey={(review) => review.id}
              renderItem={(review) => <ReviewCard review={{ ...review, text: review.content, rating: review.rating ?? undefined }} />}
              renderSkeleton={() => <Loading loading="skeleton-structure" isLoading><ReviewCard review={{ id: "loading", text: "...", author: "...", rating: 5, createdAt: new Date(0).toISOString() }} /></Loading>} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: ProductReview }) {
  return (
                  <article
                    data-card-family="review" className={collectionCardClasses("review", "flex flex-col gap-2 rounded-xl border border-primary-border bg-primary-card p-2")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="min-w-0 truncate text-xs font-bold text-primary-text">{review.author || "مهمان"}</div>
                        {review.rating ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <StarRating value={review.rating} size="sm" />
                            <span className="text-xs font-medium text-secondary-text">
                              {review.rating}.0 از ۵
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-secondary-text"></div>
                        )}
                      </div>
                      <div className="text-xs text-secondary-text">{formatReviewDate(review.createdAt)}</div>
                    </div>
                    <div className="min-h-0 line-clamp-2 text-xs leading-5 text-primary-text whitespace-pre-wrap">{review.text}</div>
                  </article>
  );
}
