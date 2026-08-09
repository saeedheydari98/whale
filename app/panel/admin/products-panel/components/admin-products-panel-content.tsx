"use client";

import Loading from "@/app/design-system/components/loading/loading";
import { resolveExactLoadingItemCount } from "@/app/design-system/components/loading/loading-count";
import { AdminBannerList } from "./admin-banner-list";
import { AdminShowcaseList } from "./admin-showcase-list";
import { SECTION_COUNT_LABELS, SECTION_TITLES } from "../constants";
import type { AdminCatalogSection, BannerForm } from "../types";
import type { AdminProductsPanelState } from "../hooks/use-admin-products-panel";
import { BannerModals } from "./banner-modals";
import { BrandsSection, CategoriesSection } from "./catalog-sections";
import { CatalogGroupModals } from "./catalog-group-modals";
import { CategoryBrandModals } from "./category-brand-modals";
import { FloatingActions } from "./floating-actions";
import { ImagePreviewModal } from "./image-preview-modal";
import { ProductModals } from "./product-modals";
import { ProductsSection } from "./products-section";
import { ShowcaseModals } from "./showcase-modals";
import { StorefrontSection } from "./storefront-section";

type AdminProductsPanelContentProps = {
  section: AdminCatalogSection;
  panel: AdminProductsPanelState;
};

function createLoadingBanners(count: number): BannerForm[] {
  return Array.from({ length: count }, (_, index) => ({
  id: `loading-banner-${index + 1}`,
  title: `بنر ${index + 1}`,
  showcaseId: "",
  imageUrls: [""],
  active: true,
  showOnHome: true,
  showOnShowcase: false,
  showOnCategories: false,
  showOnProducts: false,
  intervalSeconds: 5,
  heightPercent: 28,
  homeSortOrder: index + 1,
  showcaseSortOrder: index + 1,
  categorySortOrder: index + 1,
  productSortOrder: index + 1,
  sortOrder: index + 1,
  }));
}

function hasFiniteLoadingHint(value: unknown) {
  return Number.isFinite(Number(value));
}

function hasLoadingItemHints(value: Record<string, number> | undefined) {
  return Object.keys(value ?? {}).length > 0;
}

export function AdminProductsPanelContent({ section, panel }: AdminProductsPanelContentProps) {
  const sectionCount = getSectionCount(section, panel);
  const contentLoading = panel.loading;
  const canUseActiveSectionState = !contentLoading || panel.sectionReady;
  const hasCategorySkeletonHints = hasFiniteLoadingHint(panel.skeletonHints.categoryGroups)
    || hasLoadingItemHints(panel.skeletonHints.categoryItemsByGroupId);
  const categoryGroupsForRender = canUseActiveSectionState || hasCategorySkeletonHints
    ? panel.sortedCategoryGroups
    : [];
  const categoriesForRender = canUseActiveSectionState
    ? panel.sortedCategories
    : [];
  const bannerLoadingCount = resolveExactLoadingItemCount(panel.sortedBanners.length || panel.skeletonHints.banners);
  const visibleBanners = contentLoading
    ? panel.sortedBanners.length > 0
      ? panel.sortedBanners.slice(0, bannerLoadingCount)
      : createLoadingBanners(bannerLoadingCount)
    : panel.sortedBanners;

  return (
    <section className="flex w-full max-w-none flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-bold text-primary-text">{SECTION_TITLES[section]}</div>
        <div className="hidden text-base font-bold text-primary-text">{SECTION_TITLES[section]}</div>
        <Loading loading="skeleton-item" isLoading={panel.loading}>
          <span className="text-xs font-semibold text-primary-text">
            {sectionCount} {SECTION_COUNT_LABELS[section]}
          </span>
        </Loading>
      </div>

      {panel.status ? (
        <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary-text">
          <span>{panel.status}</span>
        </div>
      ) : null}

      {section === "products" ? (
        <ProductsSection
          products={panel.sortedProducts}
          brands={panel.sortedBrands}
          draggingProductId={panel.draggingProductId}
          setDraggingProductId={panel.setDraggingProductId}
          onEditProduct={panel.openEditModal}
          onPreview={panel.openImagePreview}
          onReorderProducts={panel.reorderProducts}
          isLoading={contentLoading}
          loadingCountHint={panel.skeletonHints.products}
        />
      ) : null}

      {section === "banners" ? (
        <div className="flex flex-col gap-5">
          {visibleBanners.map((banner) => (
            <AdminBannerList key={`banner-${banner.id}`} banner={banner} onEdit={panel.openEditBannerModal} onPreview={panel.openImagePreview} isLoading={contentLoading} />
          ))}
        </div>
      ) : null}

      {section === "showcases" ? (
        <AdminShowcaseList
          products={panel.sortedProducts}
          showcases={panel.sortedShowcases}
          onEditShowcase={panel.openEditShowcaseModal}
          onDeleteShowcase={panel.deleteShowcase}
          onReorderProducts={(targetShowcase, sourceId, targetId) => {
            void panel.reorderShowcaseProducts(targetShowcase, sourceId, targetId);
          }}
          onPreview={panel.openImagePreview}
          formatPrice={panel.formatPrice}
          isLoading={contentLoading}
          loadingCountHint={panel.skeletonHints.showcases}
          productCountHints={panel.skeletonHints.showcaseProductsById}
        />
      ) : null}

      {section === "categories" ? (
        <CategoriesSection
          groups={categoryGroupsForRender}
          categories={categoriesForRender}
          products={panel.sortedProducts}
          draggingCategoryId={panel.draggingCategoryId}
          setDraggingCategoryId={panel.setDraggingCategoryId}
          onEditGroup={panel.openEditCategoryGroupModal}
          onAddCategory={panel.openCategoryModal}
          onEditCategory={panel.openEditCategoryModal}
          onPreview={panel.openImagePreview}
          onReorderCategories={panel.reorderCategories}
          isLoading={contentLoading}
          loadingGroupCountHint={panel.skeletonHints.categoryGroups}
          loadingItemCountHints={panel.skeletonHints.categoryItemsByGroupId}
        />
      ) : null}

      {section === "brands" ? (
        <BrandsSection
          groups={panel.sortedBrandGroups}
          brands={panel.sortedBrands}
          products={panel.sortedProducts}
          draggingBrandId={panel.draggingBrandId}
          setDraggingBrandId={panel.setDraggingBrandId}
          onEditGroup={panel.openEditBrandGroupModal}
          onAddBrand={panel.openBrandModal}
          onEditBrand={panel.openEditBrandModal}
          onPreview={panel.openImagePreview}
          onReorderBrands={panel.reorderBrands}
          isLoading={contentLoading}
          loadingGroupCountHint={panel.skeletonHints.brandGroups}
          loadingItemCountHints={panel.skeletonHints.brandItemsByGroupId}
        />
      ) : null}

      {section === "storefront" ? (
        <StorefrontSection
          displaySections={panel.displaySections}
          tab={panel.storefrontLayoutTab}
          draggingKey={panel.draggingStorefrontKey}
          setTab={panel.setStorefrontLayoutTab}
          setDraggingKey={panel.setDraggingStorefrontKey}
          onReorder={panel.reorderStorefrontSections}
          onUpdateBannerPlacement={panel.updateBannerPlacement}
          onUpdateShowcasePlacement={panel.updateShowcasePlacement}
          onUpdateCategoryGroupPlacement={panel.updateCategoryGroupPlacement}
          onUpdateBrandGroupPlacement={panel.updateBrandGroupPlacement}
          onSave={panel.saveStorefrontPlacement}
          isLoading={contentLoading}
          loadingCountHint={panel.skeletonHints.storefront?.[panel.storefrontLayoutTab]}
        />
      ) : null}

      {!contentLoading ? (
        <FloatingActions
          section={section}
          onCreateProduct={panel.openCreateModal}
          onCreateShowcase={panel.openShowcaseModal}
          onCreateCategoryGroup={panel.openCategoryGroupModal}
          onCreateBrandGroup={panel.openBrandGroupModal}
          onCreateBanner={panel.openBannerModal}
        />
      ) : null}

      <CatalogGroupModals
        categories={panel.sortedCategories}
        brands={panel.sortedBrands}
        draftCategoryGroup={panel.draftCategoryGroup}
        draftBrandGroup={panel.draftBrandGroup}
        editingCategoryGroup={panel.editingCategoryGroup}
        editingBrandGroup={panel.editingBrandGroup}
        categoryGroupLinkIds={panel.categoryGroupLinkIds}
        brandGroupLinkIds={panel.brandGroupLinkIds}
        isCategoryGroupOpen={panel.isCategoryGroupOpen}
        isBrandGroupOpen={panel.isBrandGroupOpen}
        isEditCategoryGroupOpen={panel.isEditCategoryGroupOpen}
        isEditBrandGroupOpen={panel.isEditBrandGroupOpen}
        hasRequiredError={panel.hasRequiredError}
        setDraftCategoryGroup={panel.setDraftCategoryGroup}
        setDraftBrandGroup={panel.setDraftBrandGroup}
        setEditingCategoryGroup={panel.setEditingCategoryGroup}
        setEditingBrandGroup={panel.setEditingBrandGroup}
        setCategoryGroupLinkIds={panel.setCategoryGroupLinkIds}
        setBrandGroupLinkIds={panel.setBrandGroupLinkIds}
        onCloseCategoryGroup={() => panel.setIsCategoryGroupOpen(false)}
        onCloseBrandGroup={() => panel.setIsBrandGroupOpen(false)}
        onCloseEditCategoryGroup={() => {
          panel.setIsEditCategoryGroupOpen(false);
          panel.setEditingCategoryGroup(null);
          panel.setCategoryGroupLinkIds([]);
        }}
        onCloseEditBrandGroup={() => {
          panel.setIsEditBrandGroupOpen(false);
          panel.setEditingBrandGroup(null);
          panel.setBrandGroupLinkIds([]);
        }}
        onSubmitCategoryGroup={panel.submitDraftCategoryGroup}
        onSubmitBrandGroup={panel.submitDraftBrandGroup}
        onSubmitEditCategoryGroup={panel.submitEditingCategoryGroup}
        onSubmitEditBrandGroup={panel.submitEditingBrandGroup}
      />

      <CategoryBrandModals
        categoryGroups={panel.sortedCategoryGroups}
        brandGroups={panel.sortedBrandGroups}
        draftCategory={panel.draftCategory}
        draftBrand={panel.draftBrand}
        editingCategory={panel.editingCategory}
        editingBrand={panel.editingBrand}
        isCategoryOpen={panel.isCategoryOpen}
        isBrandOpen={panel.isBrandOpen}
        isEditCategoryOpen={panel.isEditCategoryOpen}
        isEditBrandOpen={panel.isEditBrandOpen}
        hasRequiredError={panel.hasRequiredError}
        onCloseCategory={() => panel.setIsCategoryOpen(false)}
        onCloseBrand={() => panel.setIsBrandOpen(false)}
        onCloseEditCategory={() => {
          panel.setIsEditCategoryOpen(false);
          panel.setEditingCategory(null);
        }}
        onCloseEditBrand={() => {
          panel.setIsEditBrandOpen(false);
          panel.setEditingBrand(null);
        }}
        updateDraftCategory={panel.updateDraftCategory}
        updateDraftBrand={panel.updateDraftBrand}
        updateEditingCategory={panel.updateEditingCategory}
        updateEditingBrand={panel.updateEditingBrand}
        onCategoryImageUpload={panel.handleCategoryImageUpload}
        onBrandImageUpload={panel.handleBrandImageUpload}
        onPreview={panel.openImagePreview}
        onSubmitCategory={panel.submitDraftCategory}
        onSubmitBrand={panel.submitDraftBrand}
        onSubmitEditCategory={panel.submitEditingCategory}
        onSubmitEditBrand={panel.submitEditingBrand}
        onDeleteCategory={panel.deleteEditingCategory}
        onDeleteBrand={panel.deleteEditingBrand}
      />

      <BannerModals
        showcases={panel.sortedShowcases}
        draftBanner={panel.draftBanner}
        editingBanner={panel.editingBanner}
        isBannerOpen={panel.isBannerOpen}
        isEditBannerOpen={panel.isEditBannerOpen}
        draftBannerImageUrl={panel.draftBannerImageUrl}
        editingBannerImageUrl={panel.editingBannerImageUrl}
        hasRequiredError={panel.hasRequiredError}
        setDraftBannerImageUrl={panel.setDraftBannerImageUrl}
        setEditingBannerImageUrl={panel.setEditingBannerImageUrl}
        onCloseBanner={() => panel.setIsBannerOpen(false)}
        onCloseEditBanner={() => {
          panel.setIsEditBannerOpen(false);
          panel.setEditingBanner(null);
        }}
        updateDraftBanner={panel.updateDraftBanner}
        updateEditingBanner={panel.updateEditingBanner}
        onUploadBannerImages={panel.handleBannerImagesUpload}
        onAddBannerImageUrl={panel.addBannerImageUrl}
        onRemoveBannerImage={panel.removeBannerImage}
        onPreview={panel.openImagePreview}
        onSubmitBanner={panel.submitDraftBanner}
        onSubmitEditBanner={panel.submitEditingBanner}
        onDeleteBanner={panel.deleteEditingBanner}
      />

      <ShowcaseModals
        products={panel.sortedProducts}
        categories={panel.sortedCategories}
        draftShowcase={panel.draftShowcase}
        editingShowcase={panel.editingShowcase}
        isShowcaseOpen={panel.isShowcaseOpen}
        isEditShowcaseOpen={panel.isEditShowcaseOpen}
        hasRequiredError={panel.hasRequiredError}
        onCloseShowcase={() => panel.setIsShowcaseOpen(false)}
        onCloseEditShowcase={() => {
          panel.setIsEditShowcaseOpen(false);
          panel.setEditingShowcase(null);
        }}
        updateDraftShowcase={panel.updateDraftShowcase}
        updateEditingShowcase={panel.updateEditingShowcase}
        onSubmitShowcase={panel.submitDraftShowcase}
        onSubmitEditShowcase={panel.submitEditingShowcase}
        onDeleteShowcase={panel.deleteEditingShowcase}
      />

      <ProductModals
        showcases={panel.sortedShowcases}
        categories={panel.sortedCategories}
        brands={panel.sortedBrands}
        draftProduct={panel.draftProduct}
        editingProduct={panel.editingProduct}
        isCreateOpen={panel.isCreateOpen}
        isEditOpen={panel.isEditOpen}
        saving={panel.saving}
        hasRequiredError={panel.hasRequiredError}
        onCloseCreate={() => panel.setIsCreateOpen(false)}
        onCloseEdit={() => {
          panel.setIsEditOpen(false);
          panel.setEditingProduct(null);
        }}
        updateDraftProduct={panel.updateDraftProduct}
        updateEditingProduct={panel.updateEditingProduct}
        updateDraftPricing={panel.updateDraftPricing}
        updateEditingPricing={panel.updateEditingPricing}
        onDraftImageUpload={panel.handleImageUpload}
        onEditImageUpload={panel.handleEditImageUpload}
        onDraftImageUrlAdd={(imageUrl) => panel.addProductImageUrl(imageUrl, "draft")}
        onEditImageUrlAdd={(imageUrl) => panel.addProductImageUrl(imageUrl, "edit")}
        onDraftImageRemove={(imageUrl) => panel.removeProductImage(imageUrl, "draft")}
        onEditImageRemove={(imageUrl) => panel.removeProductImage(imageUrl, "edit")}
        onPreview={panel.openImagePreview}
        onSubmitDraft={panel.submitDraftProduct}
        onSubmitEdit={panel.submitEditingProduct}
        onDeleteEdit={panel.deleteEditingProduct}
      />

      <ImagePreviewModal imageUrl={panel.previewImage} onClose={() => panel.setPreviewImage("")} />
    </section>
  );
}

function getSectionCount(section: AdminCatalogSection, panel: AdminProductsPanelState) {
  if (panel.loading) {
    if (section === "products" && hasFiniteLoadingHint(panel.skeletonHints.products)) return Number(panel.skeletonHints.products);
    if (section === "banners" && hasFiniteLoadingHint(panel.skeletonHints.banners)) return Number(panel.skeletonHints.banners);
    if (section === "showcases" && hasFiniteLoadingHint(panel.skeletonHints.showcases)) return Number(panel.skeletonHints.showcases);
    if (section === "categories" && hasFiniteLoadingHint(panel.skeletonHints.categories)) return Number(panel.skeletonHints.categories);
    if (section === "brands" && hasFiniteLoadingHint(panel.skeletonHints.brands)) return Number(panel.skeletonHints.brands);
    if (section === "storefront" && hasFiniteLoadingHint(panel.skeletonHints.storefront?.[panel.storefrontLayoutTab])) {
      return Number(panel.skeletonHints.storefront?.[panel.storefrontLayoutTab]);
    }
    return 0;
  }

  if (section === "products") return panel.sortedProducts.length;
  if (section === "banners") return panel.sortedBanners.length;
  if (section === "showcases") return panel.sortedShowcases.length;
  if (section === "categories") return panel.sortedCategories.length;
  if (section === "brands") return panel.sortedBrands.length;
  return panel.displaySections.length;
}
