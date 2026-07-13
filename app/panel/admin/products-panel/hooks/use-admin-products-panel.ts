"use client";

import { useEffect, useMemo, useState } from "react";
import { clearProductsCache, getProducts } from "@/lib/products-client";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import { useFileDataUrl } from "@/hooks/useFileDataUrl";
import { createBanner, createBrand, createCatalogLinkGroup, createCategory, createProduct, createShowcase } from "../factories";
import type {
  BannerForm,
  BrandForm,
  AdminCatalogSection,
  CatalogLinkGroupForm,
  CategoryForm,
  ProductForm,
  ProductRelationMode,
  StorefrontDisplayEntry,
  StorefrontLayoutTab,
  ShowcaseForm,
} from "../types";
import {
  calculateDiscountPercent,
  dedupeProducts,
  ensureShowcases,
  formatPrice,
  getProductKey,
  getShowcaseProductsForAdmin,
  hasMatchingColorStock,
  normalizeBanner,
  normalizeBannerTiming,
  normalizeBrand,
  normalizeCatalogLinkGroup,
  normalizeCategory,
  normalizeProduct,
  normalizeShowcase,
  slugifyValue,
  storefrontKey,
  waitForMinimumLoading,
} from "../utils";

export function useAdminProductsPanel(activeSection: AdminCatalogSection = "products") {
  void activeSection;
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseForm[]>([]);
  const [categories, setCategories] = useState<CategoryForm[]>([
    normalizeCategory({ id: "general", groupId: "default-categories", title: "عمومی", slug: "general", imageUrl: "", active: true, sortOrder: 1 }, 0),
  ]);
  const [categoryGroups, setCategoryGroups] = useState<CatalogLinkGroupForm[]>([
    normalizeCatalogLinkGroup({ id: "default-categories", title: "دسته بندی ها", active: true, sortOrder: 1 }, 0, "default-categories", "دسته بندی ها"),
  ]);
  const [brands, setBrands] = useState<BrandForm[]>([]);
  const [brandGroups, setBrandGroups] = useState<CatalogLinkGroupForm[]>([
    normalizeCatalogLinkGroup({ id: "default-brands", title: "برندها", active: true, sortOrder: 1 }, 0, "default-brands", "برندها"),
  ]);
  const [banners, setBanners] = useState<BannerForm[]>([]);
  const [draftProduct, setDraftProduct] = useState<ProductForm>(createProduct);
  const [draftShowcase, setDraftShowcase] = useState<ShowcaseForm>(createShowcase);
  const [draftCategory, setDraftCategory] = useState<CategoryForm>(createCategory);
  const [draftCategoryGroup, setDraftCategoryGroup] = useState<CatalogLinkGroupForm>(() => createCatalogLinkGroup("category"));
  const [draftBrand, setDraftBrand] = useState<BrandForm>(createBrand);
  const [draftBrandGroup, setDraftBrandGroup] = useState<CatalogLinkGroupForm>(() => createCatalogLinkGroup("brand"));
  const [draftBanner, setDraftBanner] = useState<BannerForm>(createBanner);
  const [editingShowcase, setEditingShowcase] = useState<ShowcaseForm | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryForm | null>(null);
  const [editingBrand, setEditingBrand] = useState<BrandForm | null>(null);
  const [editingCategoryGroup, setEditingCategoryGroup] = useState<CatalogLinkGroupForm | null>(null);
  const [editingBrandGroup, setEditingBrandGroup] = useState<CatalogLinkGroupForm | null>(null);
  const [editingBanner, setEditingBanner] = useState<BannerForm | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isEditShowcaseOpen, setIsEditShowcaseOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const [isCategoryGroupOpen, setIsCategoryGroupOpen] = useState(false);
  const [isBrandGroupOpen, setIsBrandGroupOpen] = useState(false);
  const [isEditCategoryGroupOpen, setIsEditCategoryGroupOpen] = useState(false);
  const [isEditBrandGroupOpen, setIsEditBrandGroupOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isEditBrandOpen, setIsEditBrandOpen] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [requiredErrors, setRequiredErrors] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState("");
  const [relationProduct, setRelationProduct] = useState<ProductForm | null>(null);
  const [relationMode, setRelationMode] = useState<ProductRelationMode>("category");
  const [relationCategoryIds, setRelationCategoryIds] = useState<string[]>([]);
  const [relationShowcaseIds, setRelationShowcaseIds] = useState<string[]>([]);
  const [draggingProductId, setDraggingProductId] = useState<number | string | null>(null);
  const [draggingStorefrontKey, setDraggingStorefrontKey] = useState<string | null>(null);
  const [storefrontLayoutTab, setStorefrontLayoutTab] = useState<StorefrontLayoutTab>("home");
  const [draftBannerImageUrl, setDraftBannerImageUrl] = useState("");
  const [editingBannerImageUrl, setEditingBannerImageUrl] = useState("");
  const [categoryGroupLinkIds, setCategoryGroupLinkIds] = useState<string[]>([]);
  const [brandGroupLinkIds, setBrandGroupLinkIds] = useState<string[]>([]);
  const { readFileAsDataUrl, readFilesAsDataUrls } = useFileDataUrl();

  const hasRequiredError = (key: string) => requiredErrors.includes(key);

  const showRequiredErrors = (keys: string[], message: string) => {
    setRequiredErrors(keys);
    setStatus(message);
    window.setTimeout(() => scrollToFirstInvalidField(document), 0);
  };

  useEffect(() => {
    let cancelled = false;

    const hasCatalogData = (catalog: Awaited<ReturnType<typeof getProducts>>) => (
      catalog.products.length > 0 ||
      catalog.showcases.length > 0 ||
      catalog.categories.length > 0 ||
      catalog.categoryGroups.length > 0 ||
      catalog.brands.length > 0 ||
      catalog.brandGroups.length > 0 ||
      catalog.banners.length > 0
    );

    const loadProducts = async () => {
      const startedAt = Date.now();
      try {
        let catalog = await getProducts({ all: true, full: true });
        if (!hasCatalogData(catalog)) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          catalog = await getProducts({ all: true, full: true, force: true });
        }
        if (cancelled) return;

        const apiProducts = dedupeProducts(
          catalog.products.map((item, index) => normalizeProduct(item as Partial<ProductForm>, index))
        );
        const nextShowcases = ensureShowcases(
          apiProducts,
          catalog.showcases.map((item, index) => normalizeShowcase({
            id: String(item.id),
            title: String(item.title ?? `ویترین ${index + 1}`),
            active: item.active !== false,
            mode: item.mode === "auto" ? "auto" : "manual",
            autoSort: String(item.autoSort ?? "newest"),
            limit: Number.isFinite(Number(item.limit)) ? Math.max(1, Math.round(Number(item.limit))) : 8,
            categoryId: String(item.categoryId ?? ""),
            manualProductIds: Array.isArray(item.manualProductIds) ? item.manualProductIds.map((value) => String(value)) : [],
            sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
          }, index))
        );
        const nextBanners = catalog.banners.map((item, index) =>
          normalizeBanner({
            ...item,
            showcaseId: String(item.showcaseId ?? ""),
            homeSortOrder: Number(item.homeSortOrder ?? item.sortOrder),
            showcaseSortOrder: Number(item.showcaseSortOrder ?? item.sortOrder),
            categorySortOrder: Number(item.categorySortOrder ?? item.homeSortOrder ?? item.sortOrder),
            productSortOrder: Number(item.productSortOrder ?? item.showcaseSortOrder ?? item.sortOrder),
            intervalSeconds: Number(item.intervalSeconds),
            heightPercent: Number(item.heightPercent),
          }, index)
        );
        const nextCategories = catalog.categories.length > 0
          ? catalog.categories.map((item, index) => normalizeCategory({
            id: item.id,
            groupId: item.groupId ?? "default-categories",
            title: item.title,
            slug: item.slug,
            imageUrl: item.imageUrl ?? "",
            active: item.active,
            sortOrder: Number(item.sortOrder),
            pageSortOrder: Number(item.pageSortOrder ?? 1),
          }, index))
          : [
            normalizeCategory({
              id: "general",
              groupId: "default-categories",
              title: "عمومی",
              slug: "general",
              imageUrl: "",
              active: true,
              sortOrder: 1,
              pageSortOrder: 1,
            }, 0),
          ];
        const nextBrands = Array.isArray(catalog.brands)
          ? catalog.brands.map((item, index) => normalizeBrand({
            id: String(item.id),
            groupId: String(item.groupId ?? "default-brands"),
            title: String(item.title ?? ""),
            slug: String(item.slug ?? ""),
            imageUrl: String(item.imageUrl ?? ""),
            active: item.active !== false,
            sortOrder: Number(item.sortOrder),
            homeSortOrder: Number(item.homeSortOrder ?? 1),
          }, index))
          : [];
        const nextCategoryGroups = Array.isArray(catalog.categoryGroups) && catalog.categoryGroups.length > 0
          ? catalog.categoryGroups.map((item, index) => normalizeCatalogLinkGroup({
            id: String(item.id),
            title: String(item.title ?? ""),
            active: item.active !== false,
            sortOrder: Number(item.sortOrder),
          }, index, "default-categories", "دسته بندی ها"))
          : [normalizeCatalogLinkGroup({ id: "default-categories", title: "دسته بندی ها", active: true, sortOrder: Number(nextCategories[0]?.pageSortOrder ?? 1) }, 0, "default-categories", "دسته بندی ها")];
        const nextBrandGroups = Array.isArray(catalog.brandGroups) && catalog.brandGroups.length > 0
          ? catalog.brandGroups.map((item, index) => normalizeCatalogLinkGroup({
            id: String(item.id),
            title: String(item.title ?? ""),
            active: item.active !== false,
            sortOrder: Number(item.sortOrder),
          }, index, "default-brands", "برندها"))
          : [normalizeCatalogLinkGroup({ id: "default-brands", title: "برندها", active: true, sortOrder: Number(nextBrands[0]?.homeSortOrder ?? 1) }, 0, "default-brands", "برندها")];

        setProducts(apiProducts);
        setShowcases(nextShowcases);
        setCategoryGroups(nextCategoryGroups);
        setCategories(nextCategories.map((category) => ({ ...category, groupId: category.groupId || nextCategoryGroups[0]?.id || "default-categories" })));
        setBrandGroups(nextBrandGroups);
        setBrands(nextBrands.map((brand) => ({ ...brand, groupId: brand.groupId || nextBrandGroups[0]?.id || "default-brands" })));
        setBanners(nextBanners);
        await waitForMinimumLoading(startedAt);
      } catch {
        if (cancelled) return;
        setStatus("دریافت اطلاعات فروشگاه ممکن نشد.");
        await waitForMinimumLoading(startedAt);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.sortOrder - b.sortOrder), [products]);
  const sortedShowcases = useMemo(() => ensureShowcases(products, showcases), [products, showcases]);
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);
  const sortedCategoryGroups = useMemo(() => [...categoryGroups].sort((a, b) => a.sortOrder - b.sortOrder), [categoryGroups]);
  const sortedBrands = useMemo(() => [...brands].sort((a, b) => a.sortOrder - b.sortOrder), [brands]);
  const sortedBrandGroups = useMemo(() => [...brandGroups].sort((a, b) => a.sortOrder - b.sortOrder), [brandGroups]);
  const sortedBanners = useMemo(() => [...banners].sort((a, b) => a.sortOrder - b.sortOrder), [banners]);
  const nextDisplayOrder = useMemo(() => {
    const orders = [...sortedShowcases, ...sortedBanners].map((item) => item.sortOrder);
    return (Math.max(0, ...orders) || 0) + 1;
  }, [sortedBanners, sortedShowcases]);
  const nextCategoryOrder = useMemo(() => (Math.max(0, ...sortedCategories.map((item) => item.sortOrder)) || 0) + 1, [sortedCategories]);

  const displaySections = useMemo<StorefrontDisplayEntry[]>(() => {
    if (storefrontLayoutTab === "categories") {
      const bannerSections = sortedBanners
        .filter((banner) => banner.showOnCategories)
        .map((banner) => ({
          type: "banner" as const,
          item: banner,
          sortOrder: Number(banner.categorySortOrder ?? banner.sortOrder),
        }));
      const categorySections = sortedCategories.length > 0
        ? [{
          type: "categoryGroup" as const,
          item: { id: "category-group", title: "دسته‌بندی‌ها", sortOrder: Number(sortedCategories[0]?.pageSortOrder ?? 1) },
          sortOrder: Number(sortedCategories[0]?.pageSortOrder ?? 1),
        }]
        : [];
      const groupedCategorySections = sortedCategoryGroups
        .filter((group) => group.active !== false)
        .map((group) => ({
          type: "categoryGroup" as const,
          item: { id: group.id, title: group.title, sortOrder: Number(group.sortOrder ?? 1) },
          sortOrder: Number(group.sortOrder ?? 1),
        }));

      return [...bannerSections, ...(groupedCategorySections.length > 0 ? groupedCategorySections : categorySections)].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (storefrontLayoutTab === "products") {
      const bannerSections = sortedBanners
        .filter((banner) => banner.showOnProducts)
        .map((banner) => ({
          type: "banner" as const,
          item: banner,
          sortOrder: Number(banner.productSortOrder ?? banner.sortOrder),
        }));
      const showcaseSections = sortedShowcases.map((showcase) => ({
        type: "showcase" as const,
        item: showcase,
        sortOrder: showcase.sortOrder,
      }));

      return [...bannerSections, ...showcaseSections].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const brandSections = sortedBrands.length > 0
      ? [{
        type: "brandGroup" as const,
        item: { id: "brand-group", title: "برندها", sortOrder: Number(sortedBrands[0]?.homeSortOrder ?? 1) },
        sortOrder: Number(sortedBrands[0]?.homeSortOrder ?? 1),
      }]
      : [];
    const groupedBrandSections = sortedBrandGroups
      .filter((group) => group.active !== false)
      .map((group) => ({
        type: "brandGroup" as const,
        item: { id: group.id, title: group.title, sortOrder: Number(group.sortOrder ?? 1) },
        sortOrder: Number(group.sortOrder ?? 1),
      }));

    return [
      ...sortedBanners
        .filter((banner) => banner.showOnHome)
        .map((banner) => ({
          type: "banner" as const,
          item: banner,
          sortOrder: Number(banner.homeSortOrder ?? banner.sortOrder),
        })),
      ...(groupedBrandSections.length > 0 ? groupedBrandSections : brandSections),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sortedBanners, sortedBrandGroups, sortedBrands, sortedCategories, sortedCategoryGroups, sortedShowcases, storefrontLayoutTab]);

  const persistProducts = async (
    nextProducts: ProductForm[],
    nextShowcases = sortedShowcases,
    nextBanners = sortedBanners,
    nextCategories = sortedCategories,
    nextBrands = sortedBrands,
    showSavedStatus = true,
    nextCategoryGroups = sortedCategoryGroups,
    nextBrandGroups = sortedBrandGroups
  ) => {
    const validProducts = dedupeProducts(
      nextProducts.filter((item) => item.title.trim() && item.price.trim())
    );

    setSaving(true);
    setStatus("");

    try {
      let attempt = 0;
      let res: Response | null = null;
      const maxAttempts = 3;
      const bodyPayload = JSON.stringify({
        products: validProducts,
        showcases: nextShowcases.map((showcase) => ({
          id: showcase.id,
          title: showcase.title,
          active: showcase.active,
          mode: showcase.mode,
          autoSort: showcase.autoSort,
          limit: showcase.limit,
          categoryId: showcase.categoryId,
          manualProductIds: showcase.manualProductIds,
          sortOrder: showcase.sortOrder,
        })),
        categories: nextCategories.map((category) => ({
          id: category.id,
          groupId: category.groupId,
          title: category.title,
          slug: category.slug,
          imageUrl: category.imageUrl,
          active: category.active,
          sortOrder: category.sortOrder,
          pageSortOrder: category.pageSortOrder,
        })),
        categoryGroups: nextCategoryGroups.map((group) => ({
          id: group.id,
          title: group.title,
          active: group.active,
          sortOrder: group.sortOrder,
        })),
        brands: nextBrands.map((brand) => ({
          id: brand.id,
          groupId: brand.groupId,
          title: brand.title,
          slug: brand.slug,
          imageUrl: brand.imageUrl,
          active: brand.active,
          sortOrder: brand.sortOrder,
          homeSortOrder: brand.homeSortOrder,
        })),
        brandGroups: nextBrandGroups.map((group) => ({
          id: group.id,
          title: group.title,
          active: group.active,
          sortOrder: group.sortOrder,
        })),
        banners: nextBanners.map((banner) => {
          const normalizedBanner = normalizeBannerTiming(banner);
          return {
            id: normalizedBanner.id,
            title: normalizedBanner.title,
            showcaseId: normalizedBanner.showOnShowcase ? normalizedBanner.showcaseId : "",
            imageUrls: normalizedBanner.imageUrls,
            active: normalizedBanner.active,
            showOnHome: normalizedBanner.showOnHome,
            showOnShowcase: normalizedBanner.showOnShowcase,
            showOnCategories: normalizedBanner.showOnCategories,
            showOnProducts: normalizedBanner.showOnProducts,
            intervalSeconds: normalizedBanner.intervalSeconds,
            heightPercent: normalizedBanner.heightPercent,
            homeSortOrder: normalizedBanner.homeSortOrder,
            showcaseSortOrder: normalizedBanner.showcaseSortOrder,
            categorySortOrder: normalizedBanner.categorySortOrder,
            productSortOrder: normalizedBanner.productSortOrder,
            sortOrder: normalizedBanner.sortOrder,
          };
        }),
      });

      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          res = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyPayload,
          });
        } catch {
          res = null;
        }

        if (!res) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 300));
          continue;
        }

        const maybeText = await res.text();
        let data: any = null;
        try {
          data = maybeText ? JSON.parse(maybeText) : null;
        } catch {
          data = { ok: res.ok, raw: maybeText };
        }

        if (res.ok && data?.ok !== false) {
          const savedProducts = Array.isArray(data?.data?.products)
            ? dedupeProducts(data.data.products.map(normalizeProduct))
            : validProducts;
          const savedShowcases = Array.isArray(data?.data?.showcases)
            ? ensureShowcases(savedProducts, data.data.showcases.map(normalizeShowcase))
            : nextShowcases;
          const savedBanners = Array.isArray(data?.data?.banners)
            ? data.data.banners.map(normalizeBanner)
            : nextBanners;
          const savedCategories = Array.isArray(data?.data?.categories)
            ? data.data.categories.map(normalizeCategory)
            : nextCategories;
          const savedCategoryGroups = Array.isArray(data?.data?.categoryGroups)
            ? data.data.categoryGroups.map((group: Partial<CatalogLinkGroupForm>, index: number) => normalizeCatalogLinkGroup(group, index, "default-categories", "دسته بندی ها"))
            : nextCategoryGroups;
          const savedBrands = Array.isArray(data?.data?.brands)
            ? data.data.brands.map(normalizeBrand)
            : nextBrands;
          const savedBrandGroups = Array.isArray(data?.data?.brandGroups)
            ? data.data.brandGroups.map((group: Partial<CatalogLinkGroupForm>, index: number) => normalizeCatalogLinkGroup(group, index, "default-brands", "برندها"))
            : nextBrandGroups;

          setProducts(savedProducts);
          setShowcases(savedShowcases);
          setCategoryGroups(savedCategoryGroups);
          setCategories(savedCategories);
          setBrandGroups(savedBrandGroups);
          setBrands(savedBrands);
          setBanners(savedBanners);
          clearProductsCache();
          if (showSavedStatus) setStatus("Catalog saved to database.");
          return true;
        }

        const transientMessage = String((data && data?.error) || "").toLowerCase();
        if (attempt < maxAttempts && (res.status >= 500 || transientMessage.includes("transaction"))) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          continue;
        }

        throw new Error(data?.error || "API save failed");
      }

      throw new Error("API save failed after retries");
    } catch (error) {
      console.error("Catalog save error:", error);
      setStatus(error instanceof Error ? error.message : "Database save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const reorderProducts = async (sourceId: number | string, targetId: number | string) => {
    if (String(sourceId) === String(targetId)) return;
    const ordered = [...sortedProducts];
    const sourceIndex = ordered.findIndex((product) => String(product.id) === String(sourceId));
    const targetIndex = ordered.findIndex((product) => String(product.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const reordered = ordered.map((product, index) => ({ ...product, sortOrder: index + 1 }));
    setProducts(reordered);
    await persistProducts(reordered, sortedShowcases, sortedBanners, sortedCategories, sortedBrands, false);
    setStatus("ترتیب محصولات ذخیره شد.");
  };

  const reorderShowcaseProducts = async (showcase: ShowcaseForm, sourceProductId: number | string, targetProductId: number | string) => {
    if (String(sourceProductId) === String(targetProductId)) return;
    const visibleIds = getShowcaseProductsForAdmin(sortedProducts, showcase).map((product) => String(product.id));
    const sourceIndex = visibleIds.findIndex((id) => id === String(sourceProductId));
    const targetIndex = visibleIds.findIndex((id) => id === String(targetProductId));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = visibleIds.splice(sourceIndex, 1);
    visibleIds.splice(targetIndex, 0, moved);
    const nextShowcases = sortedShowcases.map((item) =>
      item.id === showcase.id
        ? { ...item, mode: "manual" as const, manualProductIds: visibleIds }
        : item
    );
    setShowcases(nextShowcases);
    await persistProducts(products, nextShowcases, sortedBanners, sortedCategories, sortedBrands, false);
    setStatus("ترتیب محصولات ویترین ذخیره شد.");
  };

  const openProductRelations = (product: ProductForm, mode: ProductRelationMode) => {
    const categoryIds = product.categoryIds.length > 0 ? product.categoryIds : [product.categoryId || sortedCategories[0]?.id || "general"];
    const showcaseIds = product.showcaseIds.length > 0 ? product.showcaseIds : product.showcaseId ? [product.showcaseId] : [];
    setRelationProduct(product);
    setRelationMode(mode);
    setRelationCategoryIds(categoryIds.filter(Boolean));
    setRelationShowcaseIds(showcaseIds.filter(Boolean));
  };

  const openImagePreview = (imageUrl?: string) => {
    if (imageUrl) setPreviewImage(imageUrl);
  };

  const openCreateModal = () => {
    const firstCategory = sortedCategories[0]?.id ?? "general";
    setRequiredErrors([]);
    setDraftProduct({
      ...createProduct(),
      showcaseId: "",
      showcaseIds: [],
      categoryId: firstCategory,
      categoryIds: [firstCategory],
      sortOrder: products.length + 1,
    });
    setIsCreateOpen(true);
  };

  const openShowcaseModal = () => {
    setRequiredErrors([]);
    setDraftShowcase({ ...createShowcase(), sortOrder: nextDisplayOrder });
    setIsShowcaseOpen(true);
  };

  const openCategoryModal = (groupId?: string) => {
    setRequiredErrors([]);
    setDraftCategory({ ...createCategory(), groupId: groupId || sortedCategoryGroups[0]?.id || "default-categories", sortOrder: nextCategoryOrder });
    setIsCategoryOpen(true);
  };

  const openBrandModal = (groupId?: string) => {
    setRequiredErrors([]);
    setDraftBrand({ ...createBrand(), groupId: groupId || sortedBrandGroups[0]?.id || "default-brands", sortOrder: (Math.max(0, ...sortedBrands.map((brand) => brand.sortOrder)) || 0) + 1 });
    setIsBrandOpen(true);
  };

  const openCategoryGroupModal = () => {
    setRequiredErrors([]);
    setDraftCategoryGroup({ ...createCatalogLinkGroup("category"), sortOrder: (Math.max(0, ...sortedCategoryGroups.map((group) => group.sortOrder)) || 0) + 1 });
    setCategoryGroupLinkIds([]);
    setIsCategoryGroupOpen(true);
  };

  const openBrandGroupModal = () => {
    setRequiredErrors([]);
    setDraftBrandGroup({ ...createCatalogLinkGroup("brand"), sortOrder: (Math.max(0, ...sortedBrandGroups.map((group) => group.sortOrder)) || 0) + 1 });
    setBrandGroupLinkIds([]);
    setIsBrandGroupOpen(true);
  };

  const openEditCategoryGroupModal = (group: CatalogLinkGroupForm) => {
    setRequiredErrors([]);
    setEditingCategoryGroup(group);
    setCategoryGroupLinkIds(sortedCategories.filter((category) => category.groupId === group.id).map((category) => category.id));
    setIsEditCategoryGroupOpen(true);
  };

  const openEditBrandGroupModal = (group: CatalogLinkGroupForm) => {
    setRequiredErrors([]);
    setEditingBrandGroup(group);
    setBrandGroupLinkIds(sortedBrands.filter((brand) => brand.groupId === group.id).map((brand) => brand.id));
    setIsEditBrandGroupOpen(true);
  };

  const openBannerModal = () => {
    setRequiredErrors([]);
    setDraftBanner({ ...createBanner(), homeSortOrder: nextDisplayOrder, showcaseSortOrder: nextDisplayOrder, sortOrder: nextDisplayOrder });
    setDraftBannerImageUrl("");
    setIsBannerOpen(true);
  };

  const openEditShowcaseModal = (showcase: ShowcaseForm) => {
    setRequiredErrors([]);
    setEditingShowcase(showcase);
    setIsEditShowcaseOpen(true);
  };

  const openEditCategoryModal = (category: CategoryForm) => {
    setRequiredErrors([]);
    setEditingCategory(category);
    setIsEditCategoryOpen(true);
  };

  const openEditBrandModal = (brand: BrandForm) => {
    setRequiredErrors([]);
    setEditingBrand(brand);
    setIsEditBrandOpen(true);
  };

  const openEditBannerModal = (banner: BannerForm) => {
    setRequiredErrors([]);
    setEditingBanner(banner);
    setEditingBannerImageUrl("");
    setIsEditBannerOpen(true);
  };

  const openEditModal = (product: ProductForm) => {
    const selectedBrand = sortedBrands.find((brand) => product.brand === brand.id || product.brand === brand.title);
    setRequiredErrors([]);
    setEditingProduct(product.brand ? { ...product, brand: selectedBrand?.id ?? "" } : product);
    setIsEditOpen(true);
  };

  const updateDraftProduct = (patch: Partial<ProductForm>) => setDraftProduct((current) => updateProductPatch(current, patch));
  const updateDraftShowcase = (patch: Partial<ShowcaseForm>) => setDraftShowcase((current) => ({ ...current, ...patch }));
  const updateEditingShowcase = (patch: Partial<ShowcaseForm>) => setEditingShowcase((current) => (current ? { ...current, ...patch } : current));
  const updateEditingProduct = (patch: Partial<ProductForm>) => setEditingProduct((current) => (current ? updateProductPatch(current, patch) : current));
  const updateDraftBanner = (patch: Partial<BannerForm>) => setDraftBanner((current) => normalizeBannerTiming({ ...current, ...patch }));
  const updateEditingBanner = (patch: Partial<BannerForm>) => setEditingBanner((current) => (current ? normalizeBannerTiming({ ...current, ...patch }) : current));

  const updateDraftCategory = (patch: Partial<CategoryForm>) => {
    setDraftCategory((current) => {
      const next = { ...current, ...patch };
      if (patch.title !== undefined && !patch.slug) return { ...next, slug: slugifyValue(next.title), id: slugifyValue(next.title) || next.id };
      if (patch.slug !== undefined) return { ...next, slug: slugifyValue(patch.slug), id: slugifyValue(patch.slug) || next.id };
      return next;
    });
  };

  const updateEditingCategory = (patch: Partial<CategoryForm>) => {
    setEditingCategory((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (patch.title !== undefined && !patch.slug) return { ...next, slug: slugifyValue(next.title) };
      if (patch.slug !== undefined) return { ...next, slug: slugifyValue(patch.slug) };
      return next;
    });
  };

  const updateDraftBrand = (patch: Partial<BrandForm>) => {
    setDraftBrand((current) => {
      const next = { ...current, ...patch };
      if ("title" in patch && !current.slug.trim()) {
        next.slug = slugifyValue(String(patch.title ?? ""));
        next.id = next.slug || next.id;
      }
      if ("slug" in patch) {
        next.slug = slugifyValue(String(patch.slug ?? ""));
        next.id = next.slug || next.id;
      }
      return next;
    });
  };

  const updateEditingBrand = (patch: Partial<BrandForm>) => {
    setEditingBrand((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if ("title" in patch && !current.slug.trim()) {
        next.slug = slugifyValue(String(patch.title ?? ""));
        next.id = next.slug || next.id;
      }
      if ("slug" in patch) {
        next.slug = slugifyValue(String(patch.slug ?? ""));
        next.id = next.slug || next.id;
      }
      return next;
    });
  };

  const updateDraftPricing = (patch: Partial<ProductForm>) => {
    setDraftProduct((current) => updatePricingPatch(current, patch));
  };

  const updateEditingPricing = (patch: Partial<ProductForm>) => {
    setEditingProduct((current) => (current ? updatePricingPatch(current, patch) : current));
  };

  const handleImageUpload = (file: File | null) => {
    void readFileAsDataUrl(file).then((imageUrl) => {
      if (imageUrl) updateDraftProduct({ imageUrl });
    });
  };

  const handleEditImageUpload = (file: File | null) => {
    void readFileAsDataUrl(file).then((imageUrl) => {
      if (imageUrl) updateEditingProduct({ imageUrl });
    });
  };

  const handleCategoryImageUpload = (file: File | null, mode: "draft" | "edit") => {
    void readFileAsDataUrl(file).then((imageUrl) => {
      if (!imageUrl) return;
      if (mode === "draft") updateDraftCategory({ imageUrl });
      else updateEditingCategory({ imageUrl });
    });
  };

  const handleBrandImageUpload = (file: File | null, mode: "draft" | "edit") => {
    void readFileAsDataUrl(file).then((imageUrl) => {
      if (!imageUrl) return;
      if (mode === "draft") updateDraftBrand({ imageUrl });
      else updateEditingBrand({ imageUrl });
    });
  };

  const appendBannerImages = (imageUrls: string[], mode: "draft" | "edit") => {
    if (imageUrls.length === 0) return;
    if (mode === "draft") {
      updateDraftBanner({ imageUrls: [...draftBanner.imageUrls, ...imageUrls] });
      return;
    }
    if (editingBanner) updateEditingBanner({ imageUrls: [...editingBanner.imageUrls, ...imageUrls] });
  };

  const handleBannerImagesUpload = (files: FileList | null, mode: "draft" | "edit") => {
    void readFilesAsDataUrls(files).then((imageUrls) => appendBannerImages(imageUrls.filter(Boolean), mode));
  };

  const addBannerImageUrl = (mode: "draft" | "edit") => {
    const imageUrl = mode === "draft" ? draftBannerImageUrl.trim() : editingBannerImageUrl.trim();
    if (!imageUrl) return;
    appendBannerImages([imageUrl], mode);
    if (mode === "draft") setDraftBannerImageUrl("");
    else setEditingBannerImageUrl("");
  };

  const removeBannerImage = (imageUrl: string, mode: "draft" | "edit") => {
    if (mode === "draft") {
      updateDraftBanner({ imageUrls: draftBanner.imageUrls.filter((item) => item !== imageUrl) });
      return;
    }
    if (editingBanner) updateEditingBanner({ imageUrls: editingBanner.imageUrls.filter((item) => item !== imageUrl) });
  };

  const submitDraftProduct = async () => {
    if (saving) return;
    const errors = [
      !draftProduct.title.trim() && "draftProduct.title",
      !draftProduct.discountPrice.trim() && "draftProduct.discountPrice",
      draftProduct.categoryIds.length === 0 && "draftProduct.categoryId",
      !hasMatchingColorStock(draftProduct) && "draftProduct.colorStock",
    ].filter(Boolean) as string[];
    if (errors.length > 0) {
      showRequiredErrors(errors, "نام، قیمت جدید، دسته‌بندی و موجودی رنگ‌ها الزامی است.");
      return;
    }
    setRequiredErrors([]);
    const nextProducts = [...products, draftProduct];
    setProducts(nextProducts);
    setIsCreateOpen(false);
    await persistProducts(nextProducts);
  };

  const submitDraftShowcase = async () => {
    if (!draftShowcase.title.trim()) {
      showRequiredErrors(["draftShowcase.title"], "عنوان ویترین الزامی است.");
      return;
    }
    setRequiredErrors([]);
    const nextShowcases = [...sortedShowcases, draftShowcase];
    setShowcases(nextShowcases);
    setIsShowcaseOpen(false);
    await persistProducts(products, nextShowcases, sortedBanners);
  };

  const submitDraftCategory = async () => {
    if (!draftCategory.title.trim()) {
      showRequiredErrors(["draftCategory.title"], "عنوان دسته‌بندی الزامی است.");
      return;
    }
    const normalized = normalizeCategory(draftCategory, sortedCategories.length);
    setRequiredErrors([]);
    const nextCategories = [...sortedCategories, normalized];
    setCategories(nextCategories);
    setIsCategoryOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, nextCategories);
  };

  const submitDraftCategoryGroup = async () => {
    if (!draftCategoryGroup.title.trim()) {
      showRequiredErrors(["draftCategoryGroup.title"], "عنوان بخش دسته‌بندی الزامی است.");
      return;
    }
    const normalized = normalizeCatalogLinkGroup({
      ...draftCategoryGroup,
      id: slugifyValue(draftCategoryGroup.title) || draftCategoryGroup.id,
      sortOrder: (Math.max(0, ...sortedCategoryGroups.map((group) => group.sortOrder)) || 0) + 1,
    }, sortedCategoryGroups.length, "default-categories", "دسته بندی ها");
    const nextGroups = [...sortedCategoryGroups, normalized];
    const nextCategories = sortedCategories.map((category) =>
      categoryGroupLinkIds.includes(category.id) ? { ...category, groupId: normalized.id } : category
    );
    setRequiredErrors([]);
    setCategoryGroups(nextGroups);
    setCategories(nextCategories);
    setDraftCategoryGroup(createCatalogLinkGroup("category"));
    setCategoryGroupLinkIds([]);
    setIsCategoryGroupOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, nextCategories, sortedBrands, false, nextGroups, sortedBrandGroups);
  };

  const submitEditingCategoryGroup = async () => {
    if (!editingCategoryGroup) return;
    if (!editingCategoryGroup.title.trim()) {
      showRequiredErrors(["editingCategoryGroup.title"], "عنوان بخش دسته‌بندی الزامی است.");
      return;
    }
    const normalized = normalizeCatalogLinkGroup(editingCategoryGroup, editingCategoryGroup.sortOrder, "default-categories", "دسته بندی ها");
    const nextGroups = sortedCategoryGroups.map((group) => (group.id === editingCategoryGroup.id ? normalized : group));
    const fallbackGroupId = sortedCategoryGroups.find((group) => group.id !== editingCategoryGroup.id)?.id || normalized.id;
    const nextCategories = sortedCategories.map((category) => {
      if (categoryGroupLinkIds.includes(category.id)) return { ...category, groupId: normalized.id };
      if (category.groupId === normalized.id) return { ...category, groupId: fallbackGroupId };
      return category;
    });
    setRequiredErrors([]);
    setCategoryGroups(nextGroups);
    setCategories(nextCategories);
    setEditingCategoryGroup(null);
    setCategoryGroupLinkIds([]);
    setIsEditCategoryGroupOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, nextCategories, sortedBrands, false, nextGroups, sortedBrandGroups);
  };

  const submitDraftBrand = async () => {
    if (!draftBrand.title.trim()) {
      showRequiredErrors(["draftBrand.title"], "عنوان برند الزامی است.");
      return;
    }
    const normalized = normalizeBrand(draftBrand, sortedBrands.length);
    setRequiredErrors([]);
    const nextBrands = [...sortedBrands, normalized];
    setBrands(nextBrands);
    setIsBrandOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, sortedCategories, nextBrands);
  };

  const submitDraftBrandGroup = async () => {
    if (!draftBrandGroup.title.trim()) {
      showRequiredErrors(["draftBrandGroup.title"], "عنوان بخش برند الزامی است.");
      return;
    }
    const normalized = normalizeCatalogLinkGroup({
      ...draftBrandGroup,
      id: slugifyValue(draftBrandGroup.title) || draftBrandGroup.id,
      sortOrder: (Math.max(0, ...sortedBrandGroups.map((group) => group.sortOrder)) || 0) + 1,
    }, sortedBrandGroups.length, "default-brands", "برندها");
    const nextGroups = [...sortedBrandGroups, normalized];
    const nextBrands = sortedBrands.map((brand) =>
      brandGroupLinkIds.includes(brand.id) ? { ...brand, groupId: normalized.id } : brand
    );
    setRequiredErrors([]);
    setBrandGroups(nextGroups);
    setBrands(nextBrands);
    setDraftBrandGroup(createCatalogLinkGroup("brand"));
    setBrandGroupLinkIds([]);
    setIsBrandGroupOpen(false);
    await persistProducts(products, sortedShowcases, sortedBanners, sortedCategories, nextBrands, false, sortedCategoryGroups, nextGroups);
  };

  const submitEditingBrandGroup = async () => {
    if (!editingBrandGroup) return;
    if (!editingBrandGroup.title.trim()) {
      showRequiredErrors(["editingBrandGroup.title"], "عنوان بخش برند الزامی است.");
      return;
    }
    const normalized = normalizeCatalogLinkGroup(editingBrandGroup, editingBrandGroup.sortOrder, "default-brands", "برندها");
    const nextGroups = sortedBrandGroups.map((group) => (group.id === editingBrandGroup.id ? normalized : group));
    const fallbackGroupId = sortedBrandGroups.find((group) => group.id !== editingBrandGroup.id)?.id || normalized.id;
    const nextBrands = sortedBrands.map((brand) => {
      if (brandGroupLinkIds.includes(brand.id)) return { ...brand, groupId: normalized.id };
      if (brand.groupId === normalized.id) return { ...brand, groupId: fallbackGroupId };
      return brand;
    });
    setRequiredErrors([]);
    const saved = await persistProducts(products, sortedShowcases, sortedBanners, sortedCategories, nextBrands, false, sortedCategoryGroups, nextGroups);
    if (!saved) return;
    setBrandGroups(nextGroups);
    setBrands(nextBrands);
    setEditingBrandGroup(null);
    setBrandGroupLinkIds([]);
    setIsEditBrandGroupOpen(false);
  };

  const submitDraftBanner = async () => {
    if (draftBanner.imageUrls.length === 0) {
      showRequiredErrors(["draftBanner.images"], "Banner needs at least one image.");
      return;
    }
    setRequiredErrors([]);
    const normalizedBanner = normalizeBannerTiming(draftBanner);
    const nextBanners = [...sortedBanners, normalizedBanner];
    setBanners(nextBanners);
    setIsBannerOpen(false);
    await persistProducts(products, sortedShowcases, nextBanners);
  };

  const submitEditingShowcase = async () => {
    if (!editingShowcase) return;
    if (!editingShowcase.title.trim()) {
      showRequiredErrors(["editingShowcase.title"], "عنوان ویترین الزامی است.");
      return;
    }
    setRequiredErrors([]);
    const nextShowcases = sortedShowcases.map((showcase) => showcase.id === editingShowcase.id ? editingShowcase : showcase);
    setShowcases(nextShowcases);
    setIsEditShowcaseOpen(false);
    setEditingShowcase(null);
    await persistProducts(products, nextShowcases, sortedBanners);
  };

  const submitEditingCategory = async () => {
    if (!editingCategory) return;
    if (!editingCategory.title.trim()) {
      showRequiredErrors(["editingCategory.title"], "عنوان دسته‌بندی الزامی است.");
      return;
    }
    const nextCategories = sortedCategories.map((category) =>
      category.id === editingCategory.id ? normalizeCategory(editingCategory, category.sortOrder) : category
    );
    setRequiredErrors([]);
    setCategories(nextCategories);
    setIsEditCategoryOpen(false);
    setEditingCategory(null);
    await persistProducts(products, sortedShowcases, sortedBanners, nextCategories);
  };

  const submitEditingBrand = async () => {
    if (!editingBrand) return;
    if (!editingBrand.title.trim()) {
      showRequiredErrors(["editingBrand.title"], "عنوان برند الزامی است.");
      return;
    }
    const nextBrand = normalizeBrand(editingBrand, editingBrand.sortOrder);
    const nextBrands = sortedBrands.map((brand) => brand.id === editingBrand.id ? nextBrand : brand);
    const nextProducts = products.map((product) => product.brand === editingBrand.id ? { ...product, brand: nextBrand.id } : product);
    setRequiredErrors([]);
    setProducts(nextProducts);
    setBrands(nextBrands);
    setIsEditBrandOpen(false);
    setEditingBrand(null);
    await persistProducts(nextProducts, sortedShowcases, sortedBanners, sortedCategories, nextBrands);
  };

  const submitEditingBanner = async () => {
    if (!editingBanner) return;
    if (editingBanner.imageUrls.length === 0) {
      showRequiredErrors(["editingBanner.images"], "Banner needs at least one image.");
      return;
    }
    setRequiredErrors([]);
    const normalizedBanner = normalizeBannerTiming(editingBanner);
    const nextBanners = sortedBanners.map((banner) => banner.id === normalizedBanner.id ? normalizedBanner : banner);
    setBanners(nextBanners);
    setIsEditBannerOpen(false);
    setEditingBanner(null);
    await persistProducts(products, sortedShowcases, nextBanners);
  };

  const deleteEditingBanner = async () => {
    if (!editingBanner) return;
    const nextBanners = sortedBanners.filter((banner) => banner.id !== editingBanner.id);
    setBanners(nextBanners);
    setIsEditBannerOpen(false);
    setEditingBanner(null);
    await persistProducts(products, sortedShowcases, nextBanners);
  };

  const deleteShowcase = async (showcaseToDelete: ShowcaseForm) => {
    const nextShowcases = sortedShowcases.filter((showcase) => showcase.id !== showcaseToDelete.id);
    const nextProducts = products.map((product) => {
      if (!product.showcaseIds.includes(showcaseToDelete.id)) return product;
      const showcaseIds = product.showcaseIds.filter((id) => id !== showcaseToDelete.id);
      return { ...product, showcaseId: showcaseIds[0] ?? "", showcaseIds };
    });
    setShowcases(nextShowcases);
    setProducts(nextProducts);
    setIsEditShowcaseOpen(false);
    setEditingShowcase(null);
    await persistProducts(nextProducts, nextShowcases, sortedBanners);
    setStatus("ویترین حذف شد.");
  };

  const deleteEditingShowcase = async () => {
    if (editingShowcase) await deleteShowcase(editingShowcase);
  };

  const deleteEditingCategory = async () => {
    if (!editingCategory) return;
    const fallbackCategory = sortedCategories.find((category) => category.id !== editingCategory.id)?.id ?? "general";
    const nextCategories = sortedCategories.filter((category) => category.id !== editingCategory.id);
    const nextProducts = products.map((product) => {
      if (!product.categoryIds.includes(editingCategory.id)) return product;
      const categoryIds = product.categoryIds.filter((id) => id !== editingCategory.id);
      const normalized = categoryIds.length > 0 ? categoryIds : [fallbackCategory];
      return { ...product, categoryId: normalized[0], categoryIds: normalized };
    });
    setProducts(nextProducts);
    setCategories(nextCategories);
    setIsEditCategoryOpen(false);
    setEditingCategory(null);
    await persistProducts(nextProducts, sortedShowcases, sortedBanners, nextCategories);
  };

  const deleteEditingBrand = async () => {
    if (!editingBrand) return;
    const nextBrands = sortedBrands.filter((brand) => brand.id !== editingBrand.id);
    const nextProducts = products.map((product) => product.brand === editingBrand.id ? { ...product, brand: "" } : product);
    setProducts(nextProducts);
    setBrands(nextBrands);
    setIsEditBrandOpen(false);
    setEditingBrand(null);
    await persistProducts(nextProducts, sortedShowcases, sortedBanners, sortedCategories, nextBrands);
  };

  const submitEditingProduct = async () => {
    if (saving || !editingProduct) return;
    const errors = [
      !editingProduct.title.trim() && "editingProduct.title",
      !editingProduct.discountPrice.trim() && "editingProduct.discountPrice",
      editingProduct.categoryIds.length === 0 && "editingProduct.categoryId",
      !hasMatchingColorStock(editingProduct) && "editingProduct.colorStock",
    ].filter(Boolean) as string[];
    if (errors.length > 0) {
      showRequiredErrors(errors, "نام، قیمت جدید، دسته‌بندی و موجودی رنگ‌ها الزامی است.");
      return;
    }
    setRequiredErrors([]);
    const nextProducts = products.map((item) => item.id === editingProduct.id ? editingProduct : item);
    setProducts(nextProducts);
    setIsEditOpen(false);
    setEditingProduct(null);
    await persistProducts(nextProducts);
  };

  const deleteEditingProduct = async () => {
    if (saving || !editingProduct) return;
    const editingKey = getProductKey(editingProduct);
    const nextProducts = products.filter((item) => item.id !== editingProduct.id && getProductKey(item) !== editingKey);
    setProducts(nextProducts);
    setIsEditOpen(false);
    setEditingProduct(null);
    await persistProducts(nextProducts);
  };

  const updateProductAssignment = async (
    product: ProductForm,
    patch: Pick<Partial<ProductForm>, "brand" | "categoryId" | "showcaseId" | "categoryIds" | "showcaseIds">
  ) => {
    const nextProducts = products.map((item) => item.id === product.id ? { ...item, ...patch } : item);
    const nextProduct = nextProducts.find((item) => item.id === product.id) ?? null;
    setProducts(nextProducts);
    setRelationProduct((current) => current?.id === product.id ? nextProduct : current);
    await persistProducts(nextProducts, sortedShowcases, sortedBanners, sortedCategories, sortedBrands, false);
  };

  const toggleRelationCategory = (categoryId: string) => {
    setRelationCategoryIds((current) => {
      if (current.includes(categoryId)) {
        return current.length <= 1 ? current : current.filter((id) => id !== categoryId);
      }
      return [...current, categoryId];
    });
  };

  const toggleRelationShowcase = (showcaseId: string) => {
    setRelationShowcaseIds((current) =>
      current.includes(showcaseId)
        ? current.filter((id) => id !== showcaseId)
        : [...current, showcaseId]
    );
  };

  const submitRelationSelection = async () => {
    if (!relationProduct) return;
    if (relationMode === "category") {
      const normalized = relationCategoryIds.length > 0 ? relationCategoryIds : [sortedCategories[0]?.id ?? "general"];
      await updateProductAssignment(relationProduct, { categoryId: normalized[0], categoryIds: normalized });
    } else {
      await updateProductAssignment(relationProduct, { showcaseId: relationShowcaseIds[0] ?? "", showcaseIds: relationShowcaseIds });
    }
    setRelationProduct(null);
  };

  const updateBannerPlacement = (banner: BannerForm, sortOrder: number) => {
    setBanners((current) =>
      current.map((item) => {
        if (item.id !== banner.id) return item;
        if (storefrontLayoutTab === "categories") return { ...item, categorySortOrder: sortOrder };
        if (storefrontLayoutTab === "products") return { ...item, productSortOrder: sortOrder };
        return { ...item, homeSortOrder: sortOrder, sortOrder };
      })
    );
  };

  const updateShowcasePlacement = (showcase: ShowcaseForm, sortOrder: number) => {
    setShowcases((current) => current.map((item) => (item.id === showcase.id ? { ...item, sortOrder } : item)));
  };

  const updateCategoryGroupPlacement = (groupId: string, sortOrder: number) => {
    setCategoryGroups((current) => current.map((item) => (item.id === groupId ? { ...item, sortOrder } : item)));
  };

  const updateBrandGroupPlacement = (groupId: string, sortOrder: number) => {
    setBrandGroups((current) => current.map((item) => (item.id === groupId ? { ...item, sortOrder } : item)));
  };

  const saveStorefrontPlacement = () => persistProducts(products, sortedShowcases, sortedBanners, sortedCategories, sortedBrands);

  const reorderStorefrontSections = async (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;
    const ordered = displaySections.map((entry) => ({ type: entry.type, item: entry.item, key: storefrontKey(entry) }));
    const sourceIndex = ordered.findIndex((entry) => entry.key === sourceKey);
    const targetIndex = ordered.findIndex((entry) => entry.key === targetKey);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const nextOrder = new Map(ordered.map((entry, index) => [entry.key, index + 1]));
    const nextBanners = banners.map((banner) => ({
      ...banner,
      homeSortOrder: storefrontLayoutTab === "home" ? nextOrder.get(`banner:${banner.id}`) ?? banner.homeSortOrder : banner.homeSortOrder,
      categorySortOrder: storefrontLayoutTab === "categories" ? nextOrder.get(`banner:${banner.id}`) ?? banner.categorySortOrder : banner.categorySortOrder,
      productSortOrder: storefrontLayoutTab === "products" ? nextOrder.get(`banner:${banner.id}`) ?? banner.productSortOrder : banner.productSortOrder,
      sortOrder: storefrontLayoutTab === "home" ? nextOrder.get(`banner:${banner.id}`) ?? banner.sortOrder : banner.sortOrder,
    }));
    const nextShowcases = showcases.map((showcase) => ({
      ...showcase,
      sortOrder: storefrontLayoutTab === "products" ? nextOrder.get(`showcase:${showcase.id}`) ?? showcase.sortOrder : showcase.sortOrder,
    }));
    const nextCategories = categories.map((category) => ({ ...category }));
    const nextBrands = brands.map((brand) => ({ ...brand }));
    const nextCategoryGroups = categoryGroups.map((group) => ({
      ...group,
      sortOrder: storefrontLayoutTab === "categories" ? nextOrder.get(`categoryGroup:${group.id}`) ?? group.sortOrder : group.sortOrder,
    }));
    const nextBrandGroups = brandGroups.map((group) => ({
      ...group,
      sortOrder: storefrontLayoutTab === "home" ? nextOrder.get(`brandGroup:${group.id}`) ?? group.sortOrder : group.sortOrder,
    }));

    setBanners(nextBanners);
    setShowcases(nextShowcases);
    setCategories(nextCategories);
    setBrands(nextBrands);
    setCategoryGroups(nextCategoryGroups);
    setBrandGroups(nextBrandGroups);
    await persistProducts(products, nextShowcases, nextBanners, nextCategories, nextBrands, false, nextCategoryGroups, nextBrandGroups);
    setStatus("چیدمان فروشگاه ذخیره شد.");
  };

  return {
    products,
    sortedProducts,
    sortedShowcases,
    sortedCategories,
    sortedCategoryGroups,
    sortedBrands,
    sortedBrandGroups,
    sortedBanners,
    displaySections,
    loading,
    saving,
    status,
    draftProduct,
    draftShowcase,
    draftCategory,
    draftCategoryGroup,
    draftBrand,
    draftBrandGroup,
    draftBanner,
    editingShowcase,
    editingCategory,
    editingBrand,
    editingCategoryGroup,
    editingBrandGroup,
    editingBanner,
    editingProduct,
    isCreateOpen,
    isShowcaseOpen,
    isEditShowcaseOpen,
    isCategoryOpen,
    isBrandOpen,
    isCategoryGroupOpen,
    isBrandGroupOpen,
    isEditCategoryGroupOpen,
    isEditBrandGroupOpen,
    isEditCategoryOpen,
    isEditBrandOpen,
    isBannerOpen,
    isEditBannerOpen,
    isEditOpen,
    previewImage,
    relationProduct,
    relationMode,
    relationCategoryIds,
    relationShowcaseIds,
    draggingProductId,
    draggingStorefrontKey,
    storefrontLayoutTab,
    draftBannerImageUrl,
    editingBannerImageUrl,
    categoryGroupLinkIds,
    brandGroupLinkIds,
    setIsCreateOpen,
    setIsShowcaseOpen,
    setIsEditShowcaseOpen,
    setIsCategoryOpen,
    setIsBrandOpen,
    setIsCategoryGroupOpen,
    setIsBrandGroupOpen,
    setIsEditCategoryGroupOpen,
    setIsEditBrandGroupOpen,
    setIsEditCategoryOpen,
    setIsEditBrandOpen,
    setIsBannerOpen,
    setIsEditBannerOpen,
    setIsEditOpen,
    setEditingShowcase,
    setEditingCategory,
    setEditingBrand,
    setEditingCategoryGroup,
    setEditingBrandGroup,
    setEditingBanner,
    setEditingProduct,
    setPreviewImage,
    setRelationProduct,
    setStorefrontLayoutTab,
    setDraftBannerImageUrl,
    setEditingBannerImageUrl,
    setCategoryGroupLinkIds,
    setBrandGroupLinkIds,
    setDraftCategoryGroup,
    setDraftBrandGroup,
    setDraggingProductId,
    setDraggingStorefrontKey,
    hasRequiredError,
    openProductRelations,
    openImagePreview,
    openCreateModal,
    openShowcaseModal,
    openCategoryModal,
    openBrandModal,
    openCategoryGroupModal,
    openBrandGroupModal,
    openEditCategoryGroupModal,
    openEditBrandGroupModal,
    openBannerModal,
    openEditShowcaseModal,
    openEditCategoryModal,
    openEditBrandModal,
    openEditBannerModal,
    openEditModal,
    updateDraftProduct,
    updateDraftShowcase,
    updateDraftCategory,
    updateDraftBrand,
    updateDraftBanner,
    updateEditingShowcase,
    updateEditingCategory,
    updateEditingBrand,
    updateEditingBanner,
    updateEditingProduct,
    updateDraftPricing,
    updateEditingPricing,
    handleImageUpload,
    handleEditImageUpload,
    handleCategoryImageUpload,
    handleBrandImageUpload,
    handleBannerImagesUpload,
    addBannerImageUrl,
    removeBannerImage,
    submitDraftProduct,
    submitDraftShowcase,
    submitDraftCategory,
    submitDraftCategoryGroup,
    submitEditingCategoryGroup,
    submitDraftBrand,
    submitDraftBrandGroup,
    submitEditingBrandGroup,
    submitDraftBanner,
    submitEditingShowcase,
    submitEditingCategory,
    submitEditingBrand,
    submitEditingBanner,
    deleteEditingBanner,
    deleteEditingShowcase,
    deleteEditingCategory,
    deleteEditingBrand,
    deleteShowcase,
    submitEditingProduct,
    deleteEditingProduct,
    toggleRelationCategory,
    toggleRelationShowcase,
    submitRelationSelection,
    updateBannerPlacement,
    updateShowcasePlacement,
    updateCategoryGroupPlacement,
    updateBrandGroupPlacement,
    saveStorefrontPlacement,
    reorderProducts,
    reorderShowcaseProducts,
    reorderStorefrontSections,
    formatPrice,
    storefrontKey,
  };
}

function updatePricingPatch(product: ProductForm, patch: Partial<ProductForm>) {
  const next = { ...product, ...patch };

  if (patch.originalPrice !== undefined || patch.discountPrice !== undefined) {
    const discountPercent = calculateDiscountPercent(next.originalPrice, next.discountPrice);
    return {
      ...next,
      discountPercent,
      price: next.discountPrice,
    };
  }

  return next;
}

function updateProductPatch(product: ProductForm, patch: Partial<ProductForm>) {
  const next = { ...product, ...patch };

  if (patch.slug !== undefined) {
    return { ...next, slug: slugifyValue(String(patch.slug ?? "")) };
  }

  if (patch.title !== undefined) {
    const previousAutoSlug = slugifyValue(product.title);
    const shouldSyncSlug = !product.slug.trim() || product.slug === previousAutoSlug;
    if (shouldSyncSlug) return { ...next, slug: slugifyValue(String(patch.title ?? "")) };
  }

  return next;
}

export type AdminProductsPanelState = ReturnType<typeof useAdminProductsPanel>;
