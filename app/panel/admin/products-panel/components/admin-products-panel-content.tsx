"use client";

import Loading from "@/app/design-system/components/loading/loading";
import { AdminBannerList } from "./admin-banner-list";
import { AdminShowcaseList } from "./admin-showcase-list";
import { SECTION_COUNT_LABELS, SECTION_TITLES } from "../constants";
import type { AdminCatalogSection } from "../types";
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

export function AdminProductsPanelContent({ section, panel }: AdminProductsPanelContentProps) {
  const sectionCount = getSectionCount(section, panel);
  const sectionLoading = panel.loading && !panel.sectionReady;

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

      {sectionLoading ? <AdminCatalogSectionSkeleton section={section} panel={panel} /> : null}

      {!sectionLoading && section === "products" ? (
        <ProductsSection
          products={panel.sortedProducts}
          brands={panel.sortedBrands}
          draggingProductId={panel.draggingProductId}
          setDraggingProductId={panel.setDraggingProductId}
          onEditProduct={panel.openEditModal}
          onPreview={panel.openImagePreview}
          onReorderProducts={panel.reorderProducts}
          isLoading={panel.loading}
        />
      ) : null}

      {!sectionLoading && section === "banners" ? (
        <div className="flex flex-col gap-5">
          {panel.sortedBanners.map((banner) => (
            <AdminBannerList key={`banner-${banner.id}`} banner={banner} onEdit={panel.openEditBannerModal} onPreview={panel.openImagePreview} isLoading={panel.loading} />
          ))}
        </div>
      ) : null}

      {!sectionLoading && section === "showcases" ? (
        <div className="flex flex-col gap-5">
          {panel.sortedShowcases.map((showcase) => (
            <AdminShowcaseList
              key={`showcase-${showcase.id}`}
              products={panel.sortedProducts}
              showcases={[showcase]}
              onEditShowcase={panel.openEditShowcaseModal}
              onDeleteShowcase={panel.deleteShowcase}
              onReorderProducts={(targetShowcase, sourceId, targetId) => {
                void panel.reorderShowcaseProducts(targetShowcase, sourceId, targetId);
              }}
              onPreview={panel.openImagePreview}
              formatPrice={panel.formatPrice}
              isLoading={panel.loading}
            />
          ))}
        </div>
      ) : null}

      {!sectionLoading && section === "categories" ? (
        <CategoriesSection
          groups={panel.sortedCategoryGroups}
          categories={panel.sortedCategories}
          products={panel.sortedProducts}
          draggingCategoryId={panel.draggingCategoryId}
          setDraggingCategoryId={panel.setDraggingCategoryId}
          onEditGroup={panel.openEditCategoryGroupModal}
          onAddCategory={panel.openCategoryModal}
          onEditCategory={panel.openEditCategoryModal}
          onPreview={panel.openImagePreview}
          onReorderCategories={panel.reorderCategories}
          isLoading={panel.loading}
        />
      ) : null}

      {!sectionLoading && section === "brands" ? (
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
          isLoading={panel.loading}
        />
      ) : null}

      {!sectionLoading && section === "storefront" ? (
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
          isLoading={panel.loading}
        />
      ) : null}

      {!sectionLoading ? (
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
        onPreview={panel.openImagePreview}
        onSubmitDraft={panel.submitDraftProduct}
        onSubmitEdit={panel.submitEditingProduct}
        onDeleteEdit={panel.deleteEditingProduct}
      />

      <ImagePreviewModal imageUrl={panel.previewImage} onClose={() => panel.setPreviewImage("")} />
    </section>
  );
}

function AdminCatalogSectionSkeleton({ section, panel }: AdminProductsPanelContentProps) {
  if (section === "categories" || section === "brands") {
    const groupCount = Math.max(1, section === "categories" ? panel.sortedCategoryGroups.length : panel.sortedBrandGroups.length);
    const itemCount = Math.max(3, Math.min(6, section === "categories" ? panel.sortedCategories.length : panel.sortedBrands.length));

    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: groupCount }, (_, groupIndex) => (
          <Loading key={`${section}-group-skeleton-${groupIndex}`} loading="skeleton-card" isLoading className="min-h-36 w-full">
            <div className="flex min-h-36 w-full flex-col gap-3 rounded-xl border border-primary-border bg-primary-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="h-5 w-32 rounded-md bg-primary-card">بخش</span>
                <span className="h-8 w-28 rounded-full bg-primary-card">افزودن</span>
              </div>
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: itemCount }, (_, itemIndex) => (
                  <span key={`${section}-item-skeleton-${itemIndex}`} className="h-20 min-w-44 rounded-lg bg-primary-card">آیتم</span>
                ))}
              </div>
            </div>
          </Loading>
        ))}
      </div>
    );
  }

  const count = getSkeletonCount(section, panel);
  const cardClassName = section === "products"
    ? "h-16 w-full max-w-64"
    : section === "banners"
      ? "h-56 w-full"
      : section === "storefront"
        ? "h-20 w-full"
        : "h-44 w-full";

  return (
    <div className={section === "products" ? "flex flex-wrap gap-2.5" : "flex flex-col gap-4"}>
      {Array.from({ length: count }, (_, index) => (
        <Loading key={`${section}-skeleton-${index}`} loading="skeleton-card" isLoading className={cardClassName}>
          <div className={`${cardClassName} rounded-lg border border-primary-border bg-primary-card`}>
            <span>{SECTION_TITLES[section]}</span>
          </div>
        </Loading>
      ))}
    </div>
  );
}

function getSkeletonCount(section: AdminCatalogSection, panel: AdminProductsPanelState) {
  const count = getSectionCount(section, panel);
  if (count > 0) return Math.min(8, count);
  if (section === "banners" || section === "showcases") return 2;
  if (section === "storefront") return 3;
  return 4;
}

function getSectionCount(section: AdminCatalogSection, panel: AdminProductsPanelState) {
  if (section === "products") return panel.sortedProducts.length;
  if (section === "banners") return panel.sortedBanners.length;
  if (section === "showcases") return panel.sortedShowcases.length;
  if (section === "categories") return panel.sortedCategories.length;
  if (section === "brands") return panel.sortedBrands.length;
  return panel.displaySections.length;
}
