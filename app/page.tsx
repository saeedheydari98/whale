"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CategoryOption from "./design-system/components/ui/category-option";
import Loading from "./design-system/components/loading/loading";
import { LazyViewportSection } from "./design-system/components/ui/lazy-viewport-section";
import { BannerCarousel } from "./products/product-showcase/banner-carousel";
import { getHomePageStructure, readCachedHomePageStructure, type ProductsCache } from "@/lib/products-client";

export default function Home() {
  const router = useRouter();
  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "home"],
    queryFn: () => getHomePageStructure(),
  });
  const [cachedStructure, setCachedStructure] = useState<ProductsCache | null>(null);
  const structure = structureQuery.data ?? cachedStructure;
  const catalogBrands = structure?.brands ?? [];
  const brandGroups = structure?.brandGroups ?? [];
  const catalogBanners = structure?.banners ?? [];
  const structureLoading = structureQuery.isLoading;
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    setCachedStructure(readCachedHomePageStructure());
  }, []);

  const brands = useMemo(
    () => catalogBrands
      .filter((brand) => brand.active !== false)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [catalogBrands]
  );

  const banners = useMemo(
    () => catalogBanners
      .filter((banner) => banner.active !== false && banner.showOnHome !== false)
      .sort((a, b) => Number(a.homeSortOrder ?? a.sortOrder ?? 0) - Number(b.homeSortOrder ?? b.sortOrder ?? 0)),
    [catalogBanners]
  );

  const displaySections = useMemo(() => {
    const bannerSections = banners.map((banner) => ({
      type: "banner" as const,
      item: banner,
      sortOrder: Number(banner.homeSortOrder ?? banner.sortOrder ?? 0),
    }));
    const brandSections = brandGroups
      .filter((group) => group.active !== false)
      .map((group) => ({
        type: "brands" as const,
        item: brands.filter((brand) => (brand.groupId || "default-brands") === group.id),
        title: group.title,
        sortOrder: Number(group.sortOrder ?? 1),
      }))
      .filter((section) => section.item.length > 0);

    return [...bannerSections, ...brandSections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, brandGroups, brands]);
  const loading = displaySections.length === 0 && structureLoading;
  const showWhaleLoading = loading && displaySections.length === 0;

  return (
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 border-b border-primary-border pb-5">
          <div className="text-3xl font-bold">خوش آمدید</div>
          <span className="text-sm text-secondary-text">اینجا خانه فروشگاه است؛ معرفی فروشگاه، بنرها و برندهای منتخب را از همین صفحه دنبال کنید.</span>
        </div>

        {showWhaleLoading ? (
          <Loading loading="fullscreen" />
        ) : null}

        {false ? (
          <div className="flex flex-col gap-8">
            {displaySections.map((section, index) => (
              section.type === "banner" ? (
                <Loading key={`loading-home-banner-${index}`} loading="skeleton-item" isLoading className="w-full">
                  <div className="h-[28vh] w-full rounded-xl border border-primary-border bg-primary-media" />
                </Loading>
              ) : (
                <div key={`loading-home-brand-${section.title}-${index}`} className="flex flex-col gap-3">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-xl font-bold">{section.title}</div>
                  </Loading>
                  <div className="flex flex-wrap gap-4">
                    {[0, 1, 2, 3].map((item) => (
                      <Loading key={item} loading="skeleton-item" isLoading>
                        <CategoryOption label="برند" imageUrl="" size="lg" />
                      </Loading>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        ) : null}

        {!loading ? (
          <div className="flex flex-col gap-8">
            {displaySections.map((section) => {
              const fallback = section.type === "banner" ? (
                <BannerCarousel
                  banner={{ ...section.item, title: section.item.title ?? "", imageUrls: section.item.imageUrls ?? ["loading-banner"], active: section.item.active !== false, sortOrder: Number(section.item.sortOrder ?? 0) }}
                  onPreview={() => undefined}
                  isLoading
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
                  <Loading loading="skeleton-item" isLoading>
                    <div className="text-xl font-bold">{section.title}</div>
                  </Loading>
                  <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-1">
                    {(section.item.length > 0 ? section.item.slice(0, 4) : [0, 1, 2, 3]).map((brand) => (
                      <Loading key={typeof brand === "number" ? brand : brand.id} loading="skeleton-item" isLoading>
                        <CategoryOption label={typeof brand === "number" ? "Ø¨Ø±Ù†Ø¯" : brand.title} imageUrl="" size="lg" className="min-w-28 shrink-0" />
                      </Loading>
                    ))}
                  </div>
                </div>
              );

              return (
                <LazyViewportSection key={`${section.type}-${section.type === "banner" ? section.item.id : section.title}`} fallback={fallback}>
                  {section.type === "banner" ? (
              <BannerCarousel
                key={`banner-${section.item.id}`}
                banner={{ ...section.item, title: section.item.title ?? "", imageUrls: section.item.imageUrls ?? [], active: section.item.active !== false, sortOrder: Number(section.item.sortOrder ?? 0) }}
                onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")}
              />
                  ) : (
              <div key={`brand-group-${section.title}`} className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xl font-bold">{section.title}</div>
                  <span className="text-xs font-semibold text-secondary-text">{section.item.length} برند</span>
                </div>
                {brands.length === 0 ? (
                  <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">در حال حاضر برند فعالی وجود ندارد.</div>
                ) : null}
                <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-1">
                  {section.item.map((brand) => (
                    <CategoryOption
                      key={brand.id}
                      label={brand.title}
                      imageUrl={brand.imageUrl}
                      size="lg"
                      className="min-w-28 shrink-0"
                      onClick={() => router.push(`/brand/${brand.slug || brand.id}`)}
                    />
                  ))}
                </div>
              </div>
                  )}
                </LazyViewportSection>
              );
            })}
          </div>
        ) : null}
      </div>

      {previewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 p-4 backdrop-blur-sm" onClick={() => setPreviewImage("")}>
          <div className="flex max-h-[75vh] w-full max-w-3xl items-center justify-center overflow-hidden rounded-lg border border-primary-border bg-primary-card p-2 shadow-xl">
            <img src={previewImage} alt="پیش نمایش بنر" className="max-h-[72vh] w-full object-contain" onClick={(event) => event.stopPropagation()} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
