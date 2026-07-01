"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CategoryOption from "@/app/design-system/components/ui/category-option";
import { BannerCarousel } from "@/app/products/product-showcase/banner-carousel";
import { useProductsCatalog } from "@/lib/products-catalog-context";
import { slugifyCatalogValue } from "@/lib/products-client";

export default function CategoriesPage() {
  const router = useRouter();
  const { categories, categoryGroups, banners, loading } = useProductsCatalog();
  const [previewImage, setPreviewImage] = useState("");

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

  return (
    <main className="min-h-screen bg-primary-base text-primary-text">
      <div className="mx-auto flex w-full flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 border-b border-primary-border pb-5">
          <div className="text-3xl font-bold">دسته بندی</div>
          <span className="text-sm text-secondary-text">یک دسته بندی را انتخاب کنید تا محصولات همان گروه را ببینید.</span>
        </div>

        {loading ? (
          <div className="text-sm text-secondary-text">در حال بارگذاری دسته بندی ها...</div>
        ) : null}

        {!loading && visibleCategories.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-4 text-sm text-secondary-text">
            در حال حاضر دسته بندی فعالی وجود ندارد.
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          {displaySections.map((section) => {
            if (section.type === "banner") {
              return (
                <BannerCarousel
                  key={`banner-${section.item.id}`}
                  banner={{
                    ...section.item,
                    title: section.item.title ?? "",
                    imageUrls: section.item.imageUrls ?? [],
                    active: section.item.active !== false,
                    sortOrder: Number(section.item.categorySortOrder ?? section.item.sortOrder ?? 0)
                  }}
                  onPreview={(imageUrl) => setPreviewImage(imageUrl ?? "")}
                />
              );
            }
            return (
              <div key={`category-group-${section.title}`} className="flex flex-col gap-3">
                <div className="text-xl font-bold">{section.title}</div>
                <div className="flex w-full flex-wrap gap-4">
                  {section.item.map((category) => {
                    const slug = slugifyCatalogValue(category.slug || category.title || category.id);
                    return (
                      <CategoryOption
                        key={category.id}
                        label={category.title}
                        imageUrl={category.imageUrl}
                        size="lg"
                        onClick={() => router.push(`/categories/${slug || category.id}`)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
