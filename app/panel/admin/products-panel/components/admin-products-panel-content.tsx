"use client";

import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { AdminBannerList } from "./admin-banner-list";
import { AdminShowcaseList } from "./admin-showcase-list";
import { SECTION_COUNT_LABELS, SECTION_TITLES } from "../constants";
import { AppHeading } from "@/app/design-system/components/ui/text";
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

const loadingBanner: BannerForm = {
  id: "loading-banner",
  title: "بنر",
  showcaseId: "",
  imageUrls: [],
  active: true,
  showOnHome: true,
  showOnShowcase: true,
  showOnCategories: true,
  showOnProducts: true,
  intervalSeconds: 5,
  heightPercent: 30,
  homeSortOrder: 0,
  showcaseSortOrder: 0,
  categorySortOrder: 0,
  productSortOrder: 0,
  sortOrder: 0,
};

export function AdminProductsPanelContent({ section, panel }: AdminProductsPanelContentProps) {
  useTransientAppMessage(panel.status);
  const sectionCount = getSectionCount(section, panel);
  const canPage = Boolean(panel.structure) && section !== "storefront";
  const collectionPaging = {
    totalCount: panel.sectionTotalCount,
    hasMore: canPage && panel.sectionHasMore,
    onCapacityChange: canPage ? panel.setActiveCapacity : undefined,
    onLoadMore: canPage ? panel.loadMoreSection : undefined,
  };

  return (
    <section className="flex w-full max-w-none flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <Loading loading="skeleton-item" isLoading={panel.loading}>
          <AppHeading level={2} className="text-base font-bold text-primary-text">{SECTION_TITLES[section]}</AppHeading>
        </Loading>
        <Loading loading="skeleton-item" isLoading={panel.loading}>
          <span className="text-xs font-semibold text-primary-text">
            {sectionCount} {SECTION_COUNT_LABELS[section]}
          </span>
        </Loading>
      </div>


      {section === "products" ? (
        <ProductsSection
          products={panel.sortedProducts}
          brands={panel.sortedBrands}
          draggingProductId={panel.draggingProductId}
          setDraggingProductId={panel.setDraggingProductId}
          onEditProduct={panel.openEditModal}
          onPreview={panel.openImagePreview}
          onReorderProducts={panel.reorderProducts}
          isLoading={panel.loading}
          isLoadingMore={panel.loadingMore}
          {...collectionPaging}
          onNeedAllItems={panel.loadRemainingSection}
        />
      ) : null}

      {section === "banners" ? (
        <DynamicLoadingCollection
          items={panel.sortedBanners}
          isLoading={panel.loading}
          isLoadingMore={panel.loadingMore}
          {...collectionPaging}
          className="flex flex-col gap-5"
          getKey={(banner) => banner.id}
          lazy
          renderItem={(banner) => (
            <AdminBannerList banner={banner} onEdit={panel.openEditBannerModal} onPreview={panel.openImagePreview} />
          )}
          renderSkeleton={() => (
            <Loading loading="skeleton-structure" isLoading>
              <AdminBannerList banner={loadingBanner} onEdit={() => undefined} onPreview={() => undefined} isLoading />
            </Loading>
          )}
        />
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
          isLoading={panel.loading}
          isLoadingMore={panel.loadingMore}
          {...collectionPaging}
          showcaseCounts={panel.structure?.showcases}
        />
      ) : null}

      {section === "categories" ? (
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
          isLoadingMore={panel.loadingMore}
          {...collectionPaging}
          groupCounts={panel.structure?.categoryGroups}
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
          isLoading={panel.loading}
          isLoadingMore={panel.loadingMore}
          {...collectionPaging}
          groupCounts={panel.structure?.brandGroups}
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
          isLoading={panel.loading}
          totalCount={panel.sectionTotalCount}
        />
      ) : null}

      <FloatingActions
          section={section}
          onCreateProduct={panel.openCreateModal}
          onCreateShowcase={panel.openShowcaseModal}
          onCreateCategoryGroup={panel.openCategoryGroupModal}
          onCreateBrandGroup={panel.openBrandGroupModal}
          onCreateBanner={panel.openBannerModal}
      />

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

function sumCounts(items?: Array<{ count: number }>) {
  return items?.reduce((total, item) => total + item.count, 0) ?? 0;
}

function getSectionCount(section: AdminCatalogSection, panel: AdminProductsPanelState) {
  const loaded = section === "products"
    ? panel.sortedProducts.length
    : section === "banners"
      ? panel.sortedBanners.length
      : section === "showcases"
        ? panel.sortedShowcases.length
        : section === "categories"
          ? panel.sortedCategories.length
          : section === "brands"
            ? panel.sortedBrands.length
            : panel.displaySections.length;
  const fromStructure = panel.structure;
  if (!fromStructure) return loaded;
  const structured = section === "products"
    ? fromStructure.products
    : section === "banners"
      ? fromStructure.banners
      : section === "showcases"
        ? fromStructure.showcases.length
        : section === "categories"
          ? sumCounts(fromStructure.categoryGroups)
          : section === "brands"
            ? sumCounts(fromStructure.brandGroups)
            : loaded;
  return Math.max(loaded, structured);
}
