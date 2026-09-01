"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import CategoryOption from "./design-system/components/ui/category-option";
import Loading, { DynamicLoadingCollection, LazyViewport, startRouteLoading, useStructureRouteLoading } from "./design-system/components/loading/loading";
import { CustomEmptyState } from "./design-system/components/ui/empty-state";
import { ImagePreview } from "./design-system/components/ui/image-preview";
import { BannerCarousel } from "./products/product-showcase/banner-carousel";
import type { Banner } from "./products/product-showcase/types";
import {
  getCatalogSectionData,
  getHomePageStructure,
  readCachedHomePageStructure,
  type BannerRecord,
  type BrandRecord,
  type CatalogLinkGroupRecord,
  type ProductsCache,
} from "@/lib/products-client";
import { useAppUser } from "@/lib/app-user-context";

function homeCarouselBanner(
  banner: BannerRecord,
  loaded?: Pick<BannerRecord, "title" | "imageUrls" | "intervalSeconds" | "heightPercent" | "imageCount"> | null,
): Banner {
  return {
    id: String(banner.id),
    title: loaded?.title ?? banner.title ?? "",
    imageUrls: loaded?.imageUrls ?? [],
    active: banner.active !== false,
    showOnHome: banner.showOnHome,
    intervalSeconds: loaded?.intervalSeconds ?? banner.intervalSeconds,
    heightPercent: loaded?.heightPercent ?? banner.heightPercent,
    imageCount: Number(loaded?.imageCount ?? banner.imageCount ?? loaded?.imageUrls?.length ?? 0),
    sortOrder: Number(banner.homeSortOrder ?? banner.sortOrder ?? 0),
  };
}

function HomeBannerSection({
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
      banner={homeCarouselBanner(banner, loaded)}
      onPreview={onPreview}
      isLoading={dataLoading}
    />
  );
}

function HomeBrandSection({
  group,
  cachedBrands,
  onBrandClick,
}: {
  group: CatalogLinkGroupRecord;
  cachedBrands: BrandRecord[];
  onBrandClick: (brand: BrandRecord) => void;
}) {
  const hasCachedBrands = cachedBrands.length > 0;
  const query = useQuery({
    queryKey: ["catalog", "section", "brands", group.id],
    queryFn: () => getCatalogSectionData({ type: "brands", id: group.id }),
    enabled: !hasCachedBrands,
  });
  const brands = hasCachedBrands ? cachedBrands : (query.data?.brands ?? []);
  const dataLoading = !hasCachedBrands && brands.length === 0 && query.isLoading;
  const itemCount = Number(group.itemCount);
  const totalCount = Number.isFinite(itemCount) ? itemCount : undefined;

  return (
    <Loading isLoading={dataLoading}>
      <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xl font-bold">{group.title}</div>
          <span className="text-xs font-semibold text-secondary-text">{group.itemCount ?? brands.length} برند</span>
        </div>
        {!dataLoading && brands.length === 0 ? <CustomEmptyState size="sm" /> : null}
        <DynamicLoadingCollection
          items={brands}
          isLoading={dataLoading}
          totalCount={totalCount}
          structure={totalCount === undefined ? undefined : { count: totalCount }}
          className="flex gap-4 overflow-x-auto overscroll-x-contain pb-1"
          getKey={(brand) => brand.id}
          renderSkeleton={() => (
            <Loading isLoading>
              <CategoryOption label="برند" size="lg" className="min-w-28 shrink-0" />
            </Loading>
          )}
          renderItem={(brand) => (
            <CategoryOption
              key={brand.id}
              label={brand.title}
              imageUrl={brand.imageUrl}
              size="lg"
              className="min-w-28 shrink-0"
              onClick={() => onBrandClick(brand)}
            />
          )}
        />
      </div>
    </Loading>
  );
}

export default function Home() {
  const router = useRouter();
  const { data: appUserData } = useAppUser();
  const structureQuery = useQuery({
    queryKey: ["catalog", "page-structure", "home"],
    queryFn: () => getHomePageStructure(),
  });
  const [cachedStructure, setCachedStructure] = useState<ProductsCache | null>(null);
  const structure = structureQuery.data ?? cachedStructure;
  const catalogBrands = structure?.brands ?? [];
  const brandGroups = structure?.brandGroups ?? [];
  const catalogBanners = structure?.banners ?? [];
  const structureLoading = structureQuery.isLoading && !structure;
  const [previewImage, setPreviewImage] = useState("");
  useStructureRouteLoading(structureLoading);

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
      .sort((a, b) => Number(a.homeSortOrder ?? a.sortOrder ?? 0) - Number(b.homeSortOrder ?? a.sortOrder ?? 0)),
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
      .map((group) => {
        const groupedBrands = brands.filter((brand) => (brand.groupId || "default-brands") === group.id);
        return {
          type: "brands" as const,
          item: group,
          brands: groupedBrands,
          title: group.title,
          sortOrder: Number(group.sortOrder ?? 1),
          itemCount: Number(group.itemCount ?? groupedBrands.length),
        };
      })
      .filter((section) => section.itemCount > 0);

    return [...bannerSections, ...brandSections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, brandGroups, brands]);
  const firstName = appUserData?.user?.profile?.firstName?.trim()
    || appUserData?.user?.name?.trim().split(/\s+/)[0]
    || "";
  const welcomeText = firstName
    ? `${firstName} عزیز به فروشگاه وال خوش آمدید`
    : "به فروشگاه وال خوش آمدید";

  return (
    <main className="min-h-full bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 border-b border-primary-border pb-5">
          <div className="text-3xl font-bold">{welcomeText}</div>
        </div>

        {!structureLoading && displaySections.length === 0 ? <CustomEmptyState /> : null}

        <div className="flex flex-col gap-8">
          {displaySections.map((section) => {
            if (section.type === "banner") {
              return (
                <LazyViewport
                  key={`banner-${section.item.id}`}
                  fallback={<BannerCarousel banner={homeCarouselBanner(section.item)} isLoading />}
                >
                  <HomeBannerSection banner={section.item} onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")} />
                </LazyViewport>
              );
            }

            return (
              <LazyViewport
                key={`brands-${section.item.id}`}
                fallback={
                  <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
                    <div className="text-xl font-bold">{section.title}</div>
                    <CategoryOption label="برند" size="lg" className="min-w-28 shrink-0" />
                  </div>
                }
              >
                <HomeBrandSection
                  group={section.item}
                  cachedBrands={section.brands}
                  onBrandClick={(brand) => {
                    startRouteLoading();
                    router.push(`/brand/${brand.slug || brand.id}`);
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
