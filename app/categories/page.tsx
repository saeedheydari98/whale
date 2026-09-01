"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import Loading, { DynamicLoadingCollection, LazyViewport, startRouteLoading, useStructureRouteLoading } from "@/app/design-system/components/loading/loading";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { ImagePreview } from "@/app/design-system/components/ui/image-preview";
import { BannerCarousel } from "@/app/products/product-showcase/banner-carousel";
import type { Banner } from "@/app/products/product-showcase/types";
import {
  getCatalogSectionData,
  getCategoriesPageStructure,
  readCachedCategoriesPageStructure,
  slugifyCatalogValue,
  type BannerRecord,
  type CatalogLinkGroupRecord,
  type CategoryRecord,
  type ProductsCache,
} from "@/lib/products-client";

function categoriesCarouselBanner(
  banner: BannerRecord,
  loaded?: Pick<BannerRecord, "title" | "imageUrls" | "intervalSeconds" | "heightPercent" | "imageCount"> | null,
): Banner {
  return {
    id: String(banner.id),
    title: loaded?.title ?? banner.title ?? "",
    imageUrls: loaded?.imageUrls ?? [],
    active: banner.active !== false,
    showOnCategories: banner.showOnCategories,
    intervalSeconds: loaded?.intervalSeconds ?? banner.intervalSeconds,
    heightPercent: loaded?.heightPercent ?? banner.heightPercent,
    imageCount: Number(loaded?.imageCount ?? banner.imageCount ?? loaded?.imageUrls?.length ?? 0),
    sortOrder: Number(banner.categorySortOrder ?? banner.sortOrder ?? 0),
  };
}

function CategoriesBannerSection({
  banner,
  onPreview,
}: {
  banner: BannerRecord;
  onPreview: (imageUrl?: string) => void;
}) {
  const query = useQuery({
    queryKey: ["catalog", "section", "banner", banner.id],
    queryFn: () => getCatalogSectionData({ type: "banner", id: String(banner.id) }),
  });
  const loaded = query.data?.banner;
  const dataLoading = !loaded?.imageUrls?.length && query.isLoading;

  return (
    <BannerCarousel
      banner={categoriesCarouselBanner(banner, loaded)}
      onPreview={onPreview}
      isLoading={dataLoading}
    />
  );
}

function CategoriesGroupSection({
  group,
  cachedCategories,
  onCategoryClick,
}: {
  group: CatalogLinkGroupRecord;
  cachedCategories: CategoryRecord[];
  onCategoryClick: (category: CategoryRecord) => void;
}) {
  const hasCachedCategories = cachedCategories.length > 0;
  const query = useQuery({
    queryKey: ["catalog", "section", "categories", group.id],
    queryFn: () => getCatalogSectionData({ type: "categories", id: group.id }),
    enabled: !hasCachedCategories,
  });
  const categories = hasCachedCategories ? cachedCategories : (query.data?.categories ?? []);
  const dataLoading = !hasCachedCategories && categories.length === 0 && query.isLoading;
  const itemCount = Number(group.itemCount);
  const totalCount = Number.isFinite(itemCount) ? itemCount : undefined;

  return (
    <Loading isLoading={dataLoading}>
      <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xl font-bold">{group.title}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary-text">{group.itemCount ?? categories.length} دسته‌بندی</span>
            <CustomButton href={`/categories/group/${encodeURIComponent(group.id)}`} size="sm" rounded="full">
              <span>مشاهده همه</span>
            </CustomButton>
          </div>
        </div>
        <DynamicLoadingCollection
          items={categories}
          isLoading={dataLoading}
          totalCount={totalCount}
          structure={totalCount === undefined ? undefined : { count: totalCount }}
          className="flex w-full gap-4 overflow-x-auto overscroll-x-contain pb-1"
          getKey={(category) => category.id}
          renderSkeleton={() => (
            <Loading isLoading>
              <CategoryOption label="دسته‌بندی" size="lg" shape="rounded" className="min-w-28 shrink-0" />
            </Loading>
          )}
          renderItem={(category) => (
            <CategoryOption
              key={category.id}
              label={category.title}
              imageUrl={category.imageUrl}
              size="lg"
              shape="rounded"
              className="min-w-28 shrink-0"
              onClick={() => onCategoryClick(category)}
            />
          )}
        />
      </div>
    </Loading>
  );
}

export default function CategoriesPage() {
  const router = useRouter();
  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "categories"],
    queryFn: () => getCategoriesPageStructure(),
  });
  const [cachedStructure, setCachedStructure] = useState<ProductsCache | null>(null);
  const structure = structureQuery.data ?? cachedStructure;
  const categories = useMemo(() => structure?.categories ?? [], [structure?.categories]);
  const categoryGroups = useMemo(() => structure?.categoryGroups ?? [], [structure?.categoryGroups]);
  const banners = useMemo(() => structure?.banners ?? [], [structure?.banners]);
  const structureLoading = structureQuery.isLoading && !structure;
  const [previewImage, setPreviewImage] = useState("");
  useStructureRouteLoading(structureLoading);

  useEffect(() => {
    const timer = window.setTimeout(() => setCachedStructure(readCachedCategoriesPageStructure()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.active !== false).sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [categories]
  );

  const displaySections = useMemo(() => {
    const bannerSections = banners
      .filter((banner) => banner.active !== false && banner.showOnCategories === true)
      .map((banner) => ({
        type: "banner" as const,
        item: banner,
        sortOrder: Number(banner.categorySortOrder ?? banner.sortOrder ?? 0),
      }));

    const categorySections = categoryGroups
      .filter((group) => group.active !== false)
      .map((group) => {
        const groupedCategories = visibleCategories.filter((category) => (category.groupId || "default-categories") === group.id);
        return {
          type: "categories" as const,
          item: group,
          categories: groupedCategories,
          title: group.title,
          sortOrder: Number(group.sortOrder ?? 1),
          itemCount: Number(group.itemCount ?? groupedCategories.length),
        };
      })
      .filter((section) => section.itemCount > 0);

    return [...bannerSections, ...categorySections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, categoryGroups, visibleCategories]);

  return (
    <main className="min-h-full bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 border-b border-primary-border pb-5">
          <div className="text-3xl font-bold">دسته‌بندی محصولات فروشگاه وال</div>
        </div>

        {!structureLoading && visibleCategories.length === 0 && displaySections.length === 0 ? (
          <CustomEmptyState />
        ) : null}

        <div className="flex flex-col gap-4">
          {displaySections.map((section) => {
            if (section.type === "banner") {
              return (
                <LazyViewport
                  key={`banner-${section.item.id}`}
                  fallback={<BannerCarousel banner={categoriesCarouselBanner(section.item)} isLoading />}
                >
                  <CategoriesBannerSection banner={section.item} onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")} />
                </LazyViewport>
              );
            }

            return (
              <LazyViewport
                key={`categories-${section.item.id}`}
                fallback={
                  <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
                    <div className="text-xl font-bold">{section.title}</div>
                    <CategoryOption label="دسته‌بندی" size="lg" shape="rounded" className="min-w-28 shrink-0" />
                  </div>
                }
              >
                <CategoriesGroupSection
                  group={section.item}
                  cachedCategories={section.categories}
                  onCategoryClick={(category) => {
                    const slug = slugifyCatalogValue(category.slug || category.title || category.id);
                    startRouteLoading();
                    router.push(`/categories/${slug || category.id}`);
                  }}
                />
              </LazyViewport>
            );
          })}
        </div>
      </div>

      <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />
    </main>
  );
}
