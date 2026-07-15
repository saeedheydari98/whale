"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import Loading from "@/app/design-system/components/loading/loading";
import { LazyViewportSection } from "@/app/design-system/components/ui/lazy-viewport-section";
import { BannerCarousel } from "@/app/products/product-showcase/banner-carousel";
import { getCategoriesPageStructure, readCachedCategoriesPageStructure, slugifyCatalogValue, type ProductsCache } from "@/lib/products-client";

export default function CategoriesPage() {
  const router = useRouter();
  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "categories"],
    queryFn: () => getCategoriesPageStructure(),
  });
  const [cachedStructure, setCachedStructure] = useState<ProductsCache | null>(null);
  const structure = structureQuery.data ?? cachedStructure;
  const categories = structure?.categories ?? [];
  const categoryGroups = structure?.categoryGroups ?? [];
  const banners = structure?.banners ?? [];
  const structureLoading = structureQuery.isLoading;
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    setCachedStructure(readCachedCategoriesPageStructure());
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
      .map((group) => ({
        type: "categories" as const,
        item: visibleCategories.filter((category) => (category.groupId || "default-categories") === group.id),
        title: group.title,
        sortOrder: Number(group.sortOrder ?? 1),
      }))
      .filter((section) => section.item.length > 0);

    return [...bannerSections, ...categorySections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, categoryGroups, visibleCategories]);
  const loading = displaySections.length === 0 && structureLoading;
  const showWhaleLoading = loading && displaySections.length === 0;

  return (
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 border-b border-primary-border pb-5">
          <div className="text-3xl font-bold">دسته بندی</div>
          <span className="text-sm text-secondary-text">یک دسته بندی را انتخاب کنید تا محصولات همان گروه را ببینید.</span>
        </div>

        {showWhaleLoading ? (
          <Loading loading="fullscreen" />
        ) : null}

        {false ? (
          <div className="flex flex-col gap-4">
            {displaySections.map((section, index) => (
              section.type === "banner" ? (
                <Loading key={`loading-category-banner-${index}`} loading="skeleton-item" isLoading className="w-full">
                  <div className="h-[24vh] w-full rounded-xl border border-primary-border bg-primary-media" />
                </Loading>
              ) : (
                <div key={`loading-category-group-${section.title}-${index}`} className="flex flex-col gap-3">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-xl font-bold">{section.title}</div>
                  </Loading>
                  <div className="flex flex-wrap gap-4">
                    {[0, 1, 2, 3].map((item) => (
                      <Loading key={item} loading="skeleton-item" isLoading>
                        <CategoryOption label="دسته بندی" imageUrl="" size="lg" />
                      </Loading>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        ) : null}

        {!loading && visibleCategories.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
            در حال حاضر دسته بندی فعالی وجود ندارد.
          </div>
        ) : null}

        {!loading ? (
          <div className="flex flex-col gap-4">
            {displaySections.map((section) => {
              const fallback = section.type === "banner" ? (
                <BannerCarousel
                  banner={{
                    ...section.item,
                    title: section.item.title ?? "",
                    imageUrls: section.item.imageUrls ?? ["loading-banner"],
                    active: section.item.active !== false,
                    sortOrder: Number(section.item.categorySortOrder ?? section.item.sortOrder ?? 0),
                  }}
                  onPreview={() => undefined}
                  isLoading
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-xl font-bold">{section.title}</div>
                  </Loading>
                  <div className="flex w-full gap-4 overflow-x-auto overscroll-x-contain pb-1">
                    {(section.item.length > 0 ? section.item.slice(0, 4) : [0, 1, 2, 3]).map((category) => (
                      <Loading key={typeof category === "number" ? category : category.id} loading="skeleton-item" isLoading>
                        <CategoryOption label={typeof category === "number" ? "Ø¯Ø³ØªÙ‡ Ø¨Ù†Ø¯ÛŒ" : category.title} imageUrl="" size="lg" className="min-w-28 shrink-0" />
                      </Loading>
                    ))}
                  </div>
                </div>
              );

              return (
                <LazyViewportSection key={`${section.type}-${section.type === "banner" ? section.item.id : section.title}`} fallback={fallback}>
                  {(() => {
              if (section.type === "banner") {
                return (
                  <BannerCarousel
                    banner={{
                      ...section.item,
                      title: section.item.title ?? "",
                      imageUrls: section.item.imageUrls ?? [],
                      active: section.item.active !== false,
                      sortOrder: Number(section.item.categorySortOrder ?? section.item.sortOrder ?? 0),
                    }}
                    onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")}
                  />
                );
              }
              return (
                <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xl font-bold">{section.title}</div>
                    <span className="text-xs font-semibold text-secondary-text">{section.item.length} دسته بندی</span>
                  </div>
                  <div className="flex w-full gap-4 overflow-x-auto overscroll-x-contain pb-1">
                    {section.item.map((category) => {
                      const slug = slugifyCatalogValue(category.slug || category.title || category.id);
                      return (
                        <CategoryOption
                          key={category.id}
                          label={category.title}
                          imageUrl={category.imageUrl}
                          size="lg"
                          className="min-w-28 shrink-0"
                          onClick={() => router.push(`/categories/${slug || category.id}`)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
                  })()}
                </LazyViewportSection>
              );
            })}
          </div>
        ) : null}
      </div>

      {previewImage ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-0"
          onClick={() => setPreviewImage("")}
          aria-label="بستن تصویر بنر"
        >
          <img src={previewImage} alt="تصویر بنر" className="max-h-screen max-w-full object-contain" />
        </button>
      ) : null}
    </main>
  );
}
