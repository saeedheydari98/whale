"use client";

import { useMemo } from "react";
import { IoCheckmarkCircle, IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { StarRating } from "@/app/design-system/components/ui/star-rating";

export type ProductReview = {
  id: string;
  text: string;
  rating?: number;
  createdAt: string;
};

type ProductReviewsSectionProps = {
  reviews: ProductReview[];
  text: string;
  rating?: number;
  isPurchased: boolean;
  onTextChange: (value: string) => void;
  onRatingChange: (value: number | undefined) => void;
  onSubmit: () => void;
  onMarkPurchased: () => void;
};

function formatReviewDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function buildDistribution(reviews: ProductReview[]) {
  const counts = [0, 0, 0, 0, 0];

  for (const review of reviews) {
    const stars = Number(review.rating);
    if (Number.isFinite(stars) && stars >= 1 && stars <= 5) {
      counts[stars - 1] += 1;
    }
  }

  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars - 1],
  }));
}

export function ProductReviewsSection({
  reviews,
  text,
  rating,
  isPurchased,
  onTextChange,
  onRatingChange,
  onSubmit,
  onMarkPurchased,
}: ProductReviewsSectionProps) {
  const ratedReviews = useMemo(
    () => reviews.filter((review) => Number(review.rating) > 0),
    [reviews]
  );

  const avgRating = useMemo(() => {
    if (ratedReviews.length === 0) return 0;
    const total = ratedReviews.reduce((sum, review) => sum + Number(review.rating), 0);
    return Math.round((total / ratedReviews.length) * 10) / 10;
  }, [ratedReviews]);

  const distribution = useMemo(() => buildDistribution(reviews), [reviews]);
  const maxCount = Math.max(1, ...distribution.map((item) => item.count));

  return (
    <section
      id="product-reviews"
      className="flex w-full flex-col gap-8 rounded-2xl border border-primary-border bg-primary-soft p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 border-b border-primary-border pb-6">
        <div className="text-2xl font-bold text-primary-text">Customer reviews</div>
        <div className="text-sm text-secondary-text">
          Read what shoppers think and share your own experience with this product.
        </div>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
        <aside className="flex w-full flex-col gap-5 lg:max-w-xs lg:shrink-0">
            <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-card p-5">
            <div className="text-4xl font-bold leading-none text-primary-text">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </div>
            <StarRating value={avgRating} size="lg" ariaLabel={`Average rating ${avgRating} out of 5`} />
            <div className="text-sm text-secondary-text">
              {ratedReviews.length > 0
                ? `${ratedReviews.length} rated review${ratedReviews.length === 1 ? "" : "s"}`
                : "No star ratings yet"}
            </div>
            <div className="text-xs text-secondary-text">
              {reviews.length} total review{reviews.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {distribution.map((item) => {
              const width = `${Math.round((item.count / maxCount) * 100)}%`;

              return (
                <div key={item.stars} className="flex items-center gap-3">
                  <div className="w-12 text-xs font-medium text-secondary-text">{item.stars} star</div>
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
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-5">
            <div className="text-lg font-bold text-primary-text">Write a review</div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-primary-text">Your rating</div>
              <div className="flex flex-wrap items-center gap-3">
                <StarRating
                  value={rating ?? 0}
                  size="lg"
                  interactive
                  disabled={!isPurchased}
                  onChange={(value) => onRatingChange(value)}
                />
                {rating ? (
                  <div className="text-sm font-semibold text-amber-500">{rating}.0 out of 5</div>
                ) : (
                  <div className="text-sm text-secondary-text">Tap a star to rate</div>
                )}
              </div>
              {!isPurchased ? (
                <div className="text-xs leading-5 text-secondary-text">
                  Only verified buyers can leave a star rating. You can still post a comment below.
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <IoCheckmarkCircle aria-hidden="true" />
                  <span>Verified purchase — you can rate this product</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="review-text" className="text-sm font-medium text-primary-text">
                Your review
              </label>
              <textarea
                id="review-text"
                value={text}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder="What did you like or dislike? How was the quality and value?"
                className="min-h-28 w-full resize-y rounded-lg border border-primary-border bg-primary-soft p-3 text-sm text-primary-text outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <CustomButton type="button" variant="primary" onClick={onSubmit}>
                Submit review
              </CustomButton>
              {rating && !isPurchased ? (
                <CustomButton type="button" variant="neutral" onClick={onMarkPurchased}>
                  Mark as purchased (demo)
                </CustomButton>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-bold text-primary-text">All reviews</div>
              <div className="text-xs text-secondary-text">Newest first</div>
            </div>

            {reviews.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-primary-border bg-primary-card py-12 text-center">
                <IoChatbubbleEllipsesOutline className="text-4xl text-primary-border" aria-hidden="true" />
                <div className="text-base font-semibold text-primary-text">No reviews yet</div>
                <div className="max-w-sm text-sm text-secondary-text">
                  Be the first to share your thoughts about this product.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-card p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-bold text-primary-text">Customer</div>
                        {review.rating ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <StarRating value={review.rating} size="sm" />
                            <span className="text-xs font-medium text-secondary-text">
                              {review.rating}.0 out of 5
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-secondary-text">Comment only — no rating</div>
                        )}
                      </div>
                      <div className="text-xs text-secondary-text">{formatReviewDate(review.createdAt)}</div>
                    </div>
                    <div className="text-sm leading-6 text-primary-text whitespace-pre-wrap">{review.text}</div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
