"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IoAdd, IoCloudUploadOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../../design-system/components/ui/button";
import { CustomInput } from "../../design-system/components/ui/input";
import { CustomModal } from "../../design-system/components/ui/modal";
import { CustomSwitch } from "../../design-system/components/ui/switch";
import { FloatButton } from "@/app/design-system/components/ui/float-button";
import { clearProductsCache, getProducts } from "@/lib/products-client";
import { AdminBannerList } from "./products-panel/admin-banner-list";
import { AdminShowcaseList } from "./products-panel/admin-showcase-list";
import type { BannerForm, ProductForm, ShowcaseForm } from "./products-panel/types";

// No default showcase id

const createShowcase = (): ShowcaseForm => ({
  id: `showcase-${Date.now()}`,
  title: "",
  active: true,
  sortOrder: 1,
});

const createBanner = (): BannerForm => ({
  id: `banner-${Date.now()}`,
  title: "",
  imageUrls: [],
  active: true,
  sortOrder: 1,
});

const createProduct = (): ProductForm => ({
  id: `local-${Date.now()}`,
  showcaseId: "",
  title: "",
  description: "",
  price: "",
  originalPrice: "",
  discountPrice: "",
  discountPercent: "",
  imageUrl: "",
  badge: "",
  ctaLabel: "View product",
  ctaHref: "#",
  active: true,
  sortOrder: 1,
});


function getProductKey(product: Partial<ProductForm>) {
  return [
    product.title,
    product.description,
    product.price,
    product.originalPrice,
    product.discountPrice,
    product.imageUrl,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function dedupeProducts(products: ProductForm[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = getProductKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeProduct(item: Partial<ProductForm>, index: number): ProductForm {
  const finalPrice = String(item.discountPrice ?? item.price ?? "");

  return {
    id: item.id ?? `local-${Date.now()}-${index}`,
    showcaseId: String(item.showcaseId ?? ""),
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    price: finalPrice,
    originalPrice: String(item.originalPrice ?? ""),
    discountPrice: finalPrice,
    discountPercent: String(item.discountPercent ?? ""),
    imageUrl: String(item.imageUrl ?? ""),
    badge: String(item.badge ?? ""),
    ctaLabel: String(item.ctaLabel ?? "View product"),
    ctaHref: String(item.ctaHref ?? "#"),
    active: Boolean(item.active),
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function normalizeShowcase(item: Partial<ShowcaseForm>, index: number): ShowcaseForm {
  return {
    id: String(item.id ?? `showcase-${Date.now()}-${index}`),
    title: String(item.title ?? `Showcase ${index + 1}`),
    active: item.active !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function normalizeBanner(item: Partial<BannerForm> & { bannerUrl?: string; images?: unknown }, index: number): BannerForm {
  const legacyImage = typeof item.bannerUrl === "string" && item.bannerUrl ? [item.bannerUrl] : [];
  const dbImages = Array.isArray(item.images) ? item.images.map((value) => String(value)).filter(Boolean) : [];
  const imageUrls = Array.isArray(item.imageUrls)
    ? item.imageUrls.map((value) => String(value)).filter(Boolean)
    : dbImages.length > 0
      ? dbImages
      : legacyImage;

  return {
    id: String(item.id ?? `banner-${Date.now()}-${index}`),
    title: String(item.title ?? `Banner ${index + 1}`),
    imageUrls,
    active: item.active !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function ensureShowcases(products: ProductForm[], savedShowcases: ShowcaseForm[]) {
  const normalized = savedShowcases.map(normalizeShowcase);
  const byId = new Map(normalized.map((showcase) => [showcase.id, showcase]));

  for (const product of products) {
    const showcaseId = product.showcaseId ?? "";
    if (!showcaseId) continue;
    if (!byId.has(showcaseId)) {
      byId.set(showcaseId, {
        id: showcaseId,
        title: "Untitled showcase",
        active: true,
        sortOrder: byId.size + 1,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function readPriceNumber(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function calculateDiscountPercent(originalPrice: string, discountPrice: string) {
  const original = readPriceNumber(originalPrice);
  const discounted = readPriceNumber(discountPrice);

  if (original <= 0 || discounted <= 0 || discounted >= original) {
    return "";
  }

  return String(Math.round(((original - discounted) / original) * 100));
}

function formatPrice(value?: string) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || !normalized) {
    return value || "";
  }

  return `$${parsed.toLocaleString("en-US")}`;
}

export function AdminProductsPanel() {
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseForm[]>([]);
  const [banners, setBanners] = useState<BannerForm[]>([]);
  const [draftProduct, setDraftProduct] = useState<ProductForm>(createProduct);
  const [draftShowcase, setDraftShowcase] = useState<ShowcaseForm>(createShowcase);
  const [draftBanner, setDraftBanner] = useState<BannerForm>(createBanner);
  const [editingShowcase, setEditingShowcase] = useState<ShowcaseForm | null>(null);
  const [editingBanner, setEditingBanner] = useState<BannerForm | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isEditShowcaseOpen, setIsEditShowcaseOpen] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [draftBannerImageUrl, setDraftBannerImageUrl] = useState("");
  const [editingBannerImageUrl, setEditingBannerImageUrl] = useState("");
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const catalog = await getProducts({ all: true });
        if (cancelled) return;

        const apiProducts = dedupeProducts(
          catalog.products.map((item, index) =>
            normalizeProduct(item as Partial<ProductForm>, index)
          )
        );
        const nextShowcases = ensureShowcases(
          apiProducts,
          catalog.showcases.map((item, index) => ({
            id: String(item.id),
            title: String(item.title ?? `Showcase ${index + 1}`),
            active: item.active !== false,
            sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
          }))
        );
        const nextBanners = catalog.banners.map((item, index) => normalizeBanner(item, index));
        setProducts(apiProducts);
        setShowcases(nextShowcases);
        setBanners(nextBanners);
      } catch {
        if (cancelled) return;
        setProducts([]);
        setShowcases([]);
        setBanners([]);
        setStatus("Catalog API was not available.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products]
  );

  const sortedShowcases = useMemo(
    () => ensureShowcases(products, showcases),
    [products, showcases]
  );

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => a.sortOrder - b.sortOrder),
    [banners]
  );

  const nextDisplayOrder = useMemo(() => {
    const orders = [...sortedShowcases, ...sortedBanners].map((item) => item.sortOrder);
    return (Math.max(0, ...orders) || 0) + 1;
  }, [sortedBanners, sortedShowcases]);

  const displaySections = useMemo(() => {
    const bannerSections = sortedBanners.map((banner) => ({
      type: "banner" as const,
      item: banner,
      sortOrder: banner.sortOrder,
    }));

    const showcaseSections = sortedShowcases.map((showcase) => ({
      type: "showcase" as const,
      item: showcase,
      sortOrder: showcase.sortOrder,
    }));

    return [...bannerSections, ...showcaseSections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sortedBanners, sortedShowcases]);

  const persistProducts = async (
    nextProducts: ProductForm[],
    nextShowcases = sortedShowcases,
    nextBanners = sortedBanners,
    showSavedStatus = true
  ) => {
    const validProducts = dedupeProducts(
      nextProducts.filter((item) => item.title.trim() && item.description.trim() && item.price.trim())
    );

    setSaving(true);
    setStatus("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: validProducts,
          showcases: nextShowcases.map((showcase) => ({
            id: showcase.id,
            title: showcase.title,
            active: showcase.active,
            sortOrder: showcase.sortOrder,
          })),
          banners: nextBanners.map((banner) => ({
            id: banner.id,
            title: banner.title,
            imageUrls: banner.imageUrls,
            active: banner.active,
            sortOrder: banner.sortOrder,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "API save failed");
      }
      const savedProducts = Array.isArray(data?.data?.products)
        ? dedupeProducts(data.data.products.map(normalizeProduct))
        : validProducts;
      const savedShowcases = Array.isArray(data?.data?.showcases)
        ? ensureShowcases(savedProducts, data.data.showcases.map(normalizeShowcase))
        : nextShowcases;
      const savedBanners = Array.isArray(data?.data?.banners)
        ? data.data.banners.map(normalizeBanner)
        : nextBanners;
      setProducts(savedProducts);
      setShowcases(savedShowcases);
      setBanners(savedBanners);
      clearProductsCache();
      if (showSavedStatus) setStatus("Catalog saved to database.");
    } catch (error) {
      console.error("Catalog save error:", error);
      setStatus("Database save failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveProducts = () => persistProducts(sortedProducts);

  const startProductRailDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, label")) {
      return;
    }

    dragRef.current = {
      active: true,
      startX: event.pageX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
  };

  const moveProductRailDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    event.preventDefault();
    const dragDistance = event.pageX - dragRef.current.startX;
    event.currentTarget.scrollLeft = dragRef.current.scrollLeft - dragDistance;
  };

  const stopProductRailDrag = () => {
    dragRef.current.active = false;
  };

  const openImagePreview = (imageUrl?: string) => {
    if (!imageUrl) return;
    setPreviewImage(imageUrl);
  };

  const openCreateModal = () => {
    const firstShowcase = sortedShowcases[0]?.id ?? "";
    setDraftProduct({ ...createProduct(), showcaseId: firstShowcase, sortOrder: products.length + 1 });
    setIsCreateOpen(true);
  };

  const openShowcaseModal = () => {
    setDraftShowcase({ ...createShowcase(), sortOrder: nextDisplayOrder });
    setIsShowcaseOpen(true);
  };

  const openBannerModal = () => {
    setDraftBanner({ ...createBanner(), sortOrder: nextDisplayOrder });
    setDraftBannerImageUrl("");
    setIsBannerOpen(true);
  };

  const openEditShowcaseModal = (showcase: ShowcaseForm) => {
    setEditingShowcase(showcase);
    setIsEditShowcaseOpen(true);
  };

  const openEditBannerModal = (banner: BannerForm) => {
    setEditingBanner(banner);
    setEditingBannerImageUrl("");
    setIsEditBannerOpen(true);
  };

  const updateDraftProduct = (patch: Partial<ProductForm>) => {
    setDraftProduct((current) => ({ ...current, ...patch }));
  };

  const updateDraftShowcase = (patch: Partial<ShowcaseForm>) => {
    setDraftShowcase((current) => ({ ...current, ...patch }));
  };

  const updateEditingShowcase = (patch: Partial<ShowcaseForm>) => {
    setEditingShowcase((current) => (current ? { ...current, ...patch } : current));
  };

  const updateDraftBanner = (patch: Partial<BannerForm>) => {
    setDraftBanner((current) => ({ ...current, ...patch }));
  };

  const updateEditingBanner = (patch: Partial<BannerForm>) => {
    setEditingBanner((current) => (current ? { ...current, ...patch } : current));
  };

  const updateEditingProduct = (patch: Partial<ProductForm>) => {
    setEditingProduct((current) => (current ? { ...current, ...patch } : current));
  };

  const updateDraftPricing = (patch: Partial<ProductForm>) => {
    setDraftProduct((current) => {
      const next = { ...current, ...patch };

      if (patch.originalPrice !== undefined || patch.discountPrice !== undefined) {
        const discountPercent = calculateDiscountPercent(next.originalPrice, next.discountPrice);
        return {
          ...next,
          discountPercent,
          price: next.discountPrice,
        };
      }

      return next;
    });
  };

  const updateEditingPricing = (patch: Partial<ProductForm>) => {
    setEditingProduct((current) => {
      if (!current) return current;

      const next = { ...current, ...patch };

      if (patch.originalPrice !== undefined || patch.discountPrice !== undefined) {
        const discountPercent = calculateDiscountPercent(next.originalPrice, next.discountPrice);
        return {
          ...next,
          discountPercent,
          price: next.discountPrice,
        };
      }

      return next;
    });
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateDraftProduct({ imageUrl: String(reader.result ?? "") });
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateEditingProduct({ imageUrl: String(reader.result ?? "") });
    };
    reader.readAsDataURL(file);
  };

  const appendBannerImages = (imageUrls: string[], mode: "draft" | "edit") => {
    if (imageUrls.length === 0) return;

    if (mode === "draft") {
      updateDraftBanner({ imageUrls: [...draftBanner.imageUrls, ...imageUrls] });
      return;
    }

    if (editingBanner) {
      updateEditingBanner({ imageUrls: [...editingBanner.imageUrls, ...imageUrls] });
    }
  };

  const handleBannerImagesUpload = (files: FileList | null, mode: "draft" | "edit") => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          })
      )
    ).then((imageUrls) => appendBannerImages(imageUrls.filter(Boolean), mode));
  };

  const addBannerImageUrl = (mode: "draft" | "edit") => {
    const imageUrl = mode === "draft" ? draftBannerImageUrl.trim() : editingBannerImageUrl.trim();
    if (!imageUrl) return;

    appendBannerImages([imageUrl], mode);
    if (mode === "draft") {
      setDraftBannerImageUrl("");
      return;
    }
    setEditingBannerImageUrl("");
  };

  const removeBannerImage = (imageUrl: string, mode: "draft" | "edit") => {
    if (mode === "draft") {
      updateDraftBanner({ imageUrls: draftBanner.imageUrls.filter((item) => item !== imageUrl) });
      return;
    }

    if (editingBanner) {
      updateEditingBanner({ imageUrls: editingBanner.imageUrls.filter((item) => item !== imageUrl) });
    }
  };

  const openEditModal = (product: ProductForm) => {
    setEditingProduct(product);
    setIsEditOpen(true);
  };

  const submitDraftProduct = async () => {
    if (saving) return;

    if (!draftProduct.title.trim() || !draftProduct.description.trim() || !draftProduct.discountPrice.trim()) {
      setStatus("Title, description, and new price are required.");
      return;
    }

    const nextProducts = [...products, draftProduct];
    setProducts(nextProducts);
    setIsCreateOpen(false);
    await persistProducts(nextProducts);
  };

  const submitDraftShowcase = async () => {
    if (!draftShowcase.title.trim()) {
      setStatus("Showcase title is required.");
      return;
    }

    const nextShowcases = [...sortedShowcases, draftShowcase];
    setShowcases(nextShowcases);
    setIsShowcaseOpen(false);
    await persistProducts(products, nextShowcases, sortedBanners);
  };

  const submitDraftBanner = async () => {
    if (draftBanner.imageUrls.length === 0) {
      setStatus("Banner needs at least one image.");
      return;
    }

    const nextBanners = [...sortedBanners, draftBanner];
    setBanners(nextBanners);
    setIsBannerOpen(false);
    await persistProducts(products, sortedShowcases, nextBanners);
  };

  const submitEditingShowcase = async () => {
    if (!editingShowcase) return;

    if (!editingShowcase.title.trim()) {
      setStatus("Showcase title is required.");
      return;
    }

    const nextShowcases = sortedShowcases.map((showcase) =>
      showcase.id === editingShowcase.id ? editingShowcase : showcase
    );
    setShowcases(nextShowcases);
    setIsEditShowcaseOpen(false);
    setEditingShowcase(null);
    await persistProducts(products, nextShowcases, sortedBanners);
  };

  const submitEditingBanner = async () => {
    if (!editingBanner) return;

    if (editingBanner.imageUrls.length === 0) {
      setStatus("Banner needs at least one image.");
      return;
    }

    const nextBanners = sortedBanners.map((banner) =>
      banner.id === editingBanner.id ? editingBanner : banner
    );
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

  const deleteEditingShowcase = async () => {
    if (!editingShowcase) return;

    await deleteShowcase(editingShowcase);
  };

  const deleteShowcase = async (showcaseToDelete: ShowcaseForm) => {
    // Remove the showcase and its products
    const nextShowcases = sortedShowcases.filter((showcase) => showcase.id !== showcaseToDelete.id);
    const nextProducts = products.filter((product) => product.showcaseId !== showcaseToDelete.id);

    setShowcases(nextShowcases);
    setIsEditShowcaseOpen(false);
    setEditingShowcase(null);
    await persistProducts(nextProducts);
    setStatus("Showcase deleted.");
  };

  const submitEditingProduct = async () => {
    if (saving) return;
    if (!editingProduct) return;

    if (!editingProduct.title.trim() || !editingProduct.description.trim() || !editingProduct.discountPrice.trim()) {
      setStatus("Title, description, and new price are required.");
      return;
    }

    const nextProducts = products.map((item) =>
      item.id === editingProduct.id ? editingProduct : item
    );
    setProducts(nextProducts);
    setIsEditOpen(false);
    setEditingProduct(null);
    await persistProducts(nextProducts);
  };

  const deleteEditingProduct = async () => {
    if (saving) return;
    if (!editingProduct) return;

    const editingKey = getProductKey(editingProduct);
    const nextProducts = products.filter(
      (item) => item.id !== editingProduct.id && getProductKey(item) !== editingKey
    );
    setProducts(nextProducts);
    setIsEditOpen(false);
    setEditingProduct(null);
    await persistProducts(nextProducts);
  };

  return (
    <section className="flex w-full max-w-none flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-bold text-primary-text">products display</div>
        <span className="text-xs font-semibold text-primary-text">{sortedProducts.length} products</span>
      </div>

      <div className="flex flex-col gap-5">
        {displaySections.map((section) =>
          section.type === "banner" ? (
            <AdminBannerList
              key={`banner-${section.item.id}`}
              banner={section.item}
              onEdit={openEditBannerModal}
              onPreview={openImagePreview}
              isLoading={loading}
            />
          ) : (
            <AdminShowcaseList
              key={`showcase-${section.item.id}`}
              products={sortedProducts}
              showcases={[section.item]}
              onEditShowcase={openEditShowcaseModal}
              onDeleteShowcase={deleteShowcase}
              onEditProduct={openEditModal}
              onPreview={openImagePreview}
              onDragStart={startProductRailDrag}
              onDragMove={moveProductRailDrag}
              onDragStop={stopProductRailDrag}
              formatPrice={formatPrice}
              isLoading={loading}
            />
          )
        )}
      </div>

      <FloatButton
        label="New product"
        icon={<IoAdd />}
        position="bottom-right"
        className="bottom-30"
        border="base"
        shadow="lg"
        onClick={openCreateModal}
      />

      <FloatButton
        label="New showcase"
        icon={<IoAdd />}
        position="bottom-right"
        border="base"
        shadow="lg"
        onClick={openShowcaseModal}
      />

      <FloatButton
        label="New banner"
        icon={<IoAdd />}
        position="bottom-right"
        className="bottom-18"
        border="base"
        shadow="lg"
        onClick={openBannerModal}
      />

      <CustomModal
        open={isBannerOpen}
        onClose={() => setIsBannerOpen(false)}
        title="Register banner"
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-lg border border-primary-border bg-primary-card p-3">
          <CustomInput
            value={draftBanner.title}
            placeholder="Banner title"
            onChange={(event) => updateDraftBanner({ title: event.target.value })}
          />
          <CustomInput
            type="number"
            value={draftBanner.sortOrder}
            placeholder="Sort order"
            onChange={(event) => updateDraftBanner({ sortOrder: Number(event.target.value) })}
          />
          <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3">
            <div className="text-sm font-bold text-primary-text">Banner images</div>
            <div className="flex gap-2">
              <CustomInput
                value={draftBannerImageUrl}
                placeholder="Image URL"
                onChange={(event) => setDraftBannerImageUrl(event.target.value)}
              />
              <CustomButton border="base" icon={<IoAdd />} onClick={() => addBannerImageUrl("draft")}>
                Add 
              </CustomButton>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">Upload images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => handleBannerImagesUpload(event.target.files, "draft")}
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {draftBanner.imageUrls.length === 0 && (
                <span className="text-sm text-secondary-text">Banner preview</span>
              )}
              {draftBanner.imageUrls.map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="flex min-w-40 flex-col gap-2">
                  <button
                    type="button"
                    className="h-24 overflow-hidden rounded-md border border-primary-border bg-primary-media"
                    onClick={() => openImagePreview(imageUrl)}
                    aria-label="Open banner image"
                  >
                    <img src={imageUrl} alt={`Banner image ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                  <CustomButton
                    variant="danger"
                    size="sm"
                    border="base"
                    icon={<IoTrashOutline />}
                    onClick={() => removeBannerImage(imageUrl, "draft")}
                  >
                    Remove
                  </CustomButton>
                </div>
              ))}
            </div>
          </div>
          <CustomSwitch
            checked={draftBanner.active}
            onChange={(active) => updateDraftBanner({ active })}
            label={draftBanner.active ? "Active" : "Hidden"}
            size="sm"
          />
          <CustomButton
            border="base"
            fullWidth
            icon={<IoSaveOutline />}
            onClick={submitDraftBanner}
          >
            Register banner
          </CustomButton>
        </div>
      </CustomModal>

      <CustomModal
        open={isEditBannerOpen}
        onClose={() => {
          setIsEditBannerOpen(false);
          setEditingBanner(null);
        }}
        title={editingBanner?.title || "Edit banner"}
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {editingBanner && (
          <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-lg border border-primary-border bg-primary-card p-3">
            <CustomInput
              value={editingBanner.title}
              placeholder="Banner title"
              onChange={(event) => updateEditingBanner({ title: event.target.value })}
            />
            <CustomInput
              type="number"
              value={editingBanner.sortOrder}
              placeholder="Sort order"
              onChange={(event) => updateEditingBanner({ sortOrder: Number(event.target.value) })}
            />
            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-3">
              <div className="text-sm font-bold">Banner images</div>
              <div className="flex gap-2">
                <CustomInput
                  value={editingBannerImageUrl}
                  placeholder="Image URL"
                  onChange={(event) => setEditingBannerImageUrl(event.target.value)}
                />
                <CustomButton border="base" icon={<IoAdd />} onClick={() => addBannerImageUrl("edit")}>
                  Add
                </CustomButton>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
                <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
                <span className="text-sm font-semibold">Upload images</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleBannerImagesUpload(event.target.files, "edit")}
                />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {editingBanner.imageUrls.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="flex min-w-40 flex-col gap-2">
                    <button
                      type="button"
                      className="h-24 overflow-hidden rounded-md border border-primary-border bg-primary-media"
                      onClick={() => openImagePreview(imageUrl)}
                      aria-label="Open banner image"
                    >
                      <img src={imageUrl} alt={`Banner image ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                    <CustomButton
                      variant="danger"
                      size="sm"
                      border="base"
                      icon={<IoTrashOutline />}
                      onClick={() => removeBannerImage(imageUrl, "edit")}
                    >
                      Remove
                    </CustomButton>
                  </div>
                ))}
              </div>
            </div>
            <CustomSwitch
              checked={editingBanner.active}
              onChange={(active) => updateEditingBanner({ active })}
              label={editingBanner.active ? "Active" : "Hidden"}
              size="sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <CustomButton
                variant="danger"
                border="base"
                fullWidth
                icon={<IoTrashOutline />}
                onClick={deleteEditingBanner}
              >
                Delete
              </CustomButton>
              <CustomButton
                border="base"
                fullWidth
                icon={<IoSaveOutline />}
                onClick={submitEditingBanner}
              >
                Save banner
              </CustomButton>
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        open={isShowcaseOpen}
        onClose={() => setIsShowcaseOpen(false)}
        title="Register showcase"
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
          <CustomInput
            value={draftShowcase.title}
            placeholder="Showcase title"
            onChange={(event) => updateDraftShowcase({ title: event.target.value })}
          />
          <CustomInput
            type="number"
            value={draftShowcase.sortOrder}
            placeholder="Sort order"
            onChange={(event) => updateDraftShowcase({ sortOrder: Number(event.target.value) })}
          />
          <CustomSwitch
            checked={draftShowcase.active}
            onChange={(active) => updateDraftShowcase({ active })}
            label={draftShowcase.active ? "Active" : "Hidden"}
            size="sm"
          />
          <CustomButton
            border="base"
            fullWidth
            icon={<IoSaveOutline />}
            onClick={submitDraftShowcase}
          >
            Register showcase
          </CustomButton>
        </div>
      </CustomModal>

      <CustomModal
        open={isEditShowcaseOpen}
        onClose={() => {
          setIsEditShowcaseOpen(false);
          setEditingShowcase(null);
        }}
        title={editingShowcase?.title || "Edit showcase"}
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {editingShowcase && (
          <div className="flex flex-col gap-3">
            <CustomInput
              value={editingShowcase.title}
              placeholder="Showcase title"
              onChange={(event) => updateEditingShowcase({ title: event.target.value })}
            />
            <CustomInput
              type="number"
              value={editingShowcase.sortOrder}
              placeholder="Sort order"
              onChange={(event) => updateEditingShowcase({ sortOrder: Number(event.target.value) })}
            />
            <CustomSwitch
              checked={editingShowcase.active}
              onChange={(active) => updateEditingShowcase({ active })}
              label={editingShowcase.active ? "Active" : "Hidden"}
              size="sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <CustomButton
                variant="danger"
                border="base"
                fullWidth
                icon={<IoTrashOutline />}
                onClick={deleteEditingShowcase}
              >
                Delete
              </CustomButton>
              <CustomButton
                border="base"
                fullWidth
                icon={<IoSaveOutline />}
                onClick={submitEditingShowcase}
              >
                Save showcase
              </CustomButton>
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register product"
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-bold">Showcase</div>
              <div className="flex flex-wrap gap-2">
                {sortedShowcases.map((showcase) => (
                  <CustomButton
                    key={showcase.id}
                    variant={draftProduct.showcaseId === showcase.id ? "primary" : "neutral"}
                    rounded="full"
                    size="sm"
                    border="base"
                    onClick={() => updateDraftProduct({ showcaseId: showcase.id })}
                  >
                    {showcase.title || "Untitled"}
                  </CustomButton>
                ))}
              </div>
            </div>
            <CustomInput
              value={draftProduct.title}
              placeholder="Title"
              onChange={(event) => updateDraftProduct({ title: event.target.value })}
            />
            <CustomInput
              value={draftProduct.originalPrice}
              placeholder="Price before discount"
              onChange={(event) => updateDraftPricing({ originalPrice: event.target.value })}
            />
            <CustomInput
              value={draftProduct.discountPrice}
              placeholder="Discounted price"
              onChange={(event) => updateDraftPricing({ discountPrice: event.target.value })}
            />
            <CustomInput
              value={draftProduct.badge}
              placeholder="Badge"
              onChange={(event) => updateDraftProduct({ badge: event.target.value })}
            />
            <CustomInput
              type="number"
              value={draftProduct.sortOrder}
              placeholder="Sort order"
              onChange={(event) => updateDraftProduct({ sortOrder: Number(event.target.value) })}
            />
            <CustomInput
              value={draftProduct.ctaLabel}
              placeholder="CTA label"
              onChange={(event) => updateDraftProduct({ ctaLabel: event.target.value })}
            />
            <CustomInput
              value={draftProduct.ctaHref}
              placeholder="CTA href"
              onChange={(event) => updateDraftProduct({ ctaHref: event.target.value })}
            />
          </div>

          <div className="flex min-h-10 items-center rounded-md border border-primary-border bg-primary-card">
            <span className="text-xs text-secondary-text">
              Discount formula: ((price before discount - discounted price) / price before discount) x 100
            </span>
          </div>

          <textarea
            value={draftProduct.description}
            placeholder="Description"
            onChange={(event) => updateDraftProduct({ description: event.target.value })}
            className="min-h-24 rounded-md border border-primary-border bg-primary-card p-3 text-sm text-primary-text outline-none focus:ring-2 focus:ring-primary-border"
          />

          <div className="flex flex-col gap-3 rounded-lg border border-primary-border">
            <div className="text-sm font-bold">Product image</div>
            <CustomInput
              value={draftProduct.imageUrl}
              placeholder="Image URL or uploaded image data"
              onChange={(event) => updateDraftProduct({ imageUrl: event.target.value })}
            />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              <span className="text-sm font-semibold">Upload image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleImageUpload(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-primary-border bg-primary-media">
              {draftProduct.imageUrl ? (
                <button
                  type="button"
                  className="h-full w-full"
                  onClick={() => openImagePreview(draftProduct.imageUrl)}
                  aria-label="Open product image"
                >
                  <img
                    src={draftProduct.imageUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <span className="text-sm text-secondary-text">Image preview</span>
              )}
            </div>
          </div>

          <CustomSwitch
            checked={draftProduct.active}
            onChange={(active) => updateDraftProduct({ active })}
            label={draftProduct.active ? "Active" : "Hidden"}
            size="sm"
          />

          <CustomButton
            border="base"
            fullWidth
            isLoading={saving}
            loading="dots"
            loadingText="Saving..."
            icon={<IoSaveOutline />}
            onClick={submitDraftProduct}
          >
            Register product
          </CustomButton>
        </div>
      </CustomModal>

      <CustomModal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct?.title || "Edit product"}
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        {editingProduct && (
          <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-bold">Showcase</div>
                <div className="flex flex-wrap gap-2">
                  {sortedShowcases.map((showcase) => (
                    <CustomButton
                      key={showcase.id}
                      variant={editingProduct.showcaseId === showcase.id ? "primary" : "neutral"}
                      rounded="full"
                      size="sm"
                      border="base"
                      onClick={() => updateEditingProduct({ showcaseId: showcase.id })}
                    >
                      {showcase.title || "Untitled"}
                    </CustomButton>
                  ))}
                </div>
              </div>
              <CustomInput
                value={editingProduct.title}
                placeholder="Title"
                onChange={(event) => updateEditingProduct({ title: event.target.value })}
              />
              <CustomInput
                value={editingProduct.originalPrice}
                placeholder="Price before discount"
                onChange={(event) => updateEditingPricing({ originalPrice: event.target.value })}
              />
              <CustomInput
                value={editingProduct.discountPrice}
                placeholder="Discounted price"
                onChange={(event) => updateEditingPricing({ discountPrice: event.target.value })}
              />
              <CustomInput
                value={editingProduct.badge}
                placeholder="Badge"
                onChange={(event) => updateEditingProduct({ badge: event.target.value })}
              />
              <CustomInput
                type="number"
                value={editingProduct.sortOrder}
                placeholder="Sort order"
                onChange={(event) => updateEditingProduct({ sortOrder: Number(event.target.value) })}
              />
              <CustomInput
                value={editingProduct.ctaLabel}
                placeholder="CTA label"
                onChange={(event) => updateEditingProduct({ ctaLabel: event.target.value })}
              />
              <CustomInput
                value={editingProduct.ctaHref}
                placeholder="CTA href"
                onChange={(event) => updateEditingProduct({ ctaHref: event.target.value })}
              />
            </div>

            <div className="flex min-h-10 items-center rounded-md border border-primary-border bg-primary-card">
              <span className="text-xs text-secondary-text">
                Discount formula: ((price before discount - discounted price) / price before discount) x 100
              </span>
            </div>

            <textarea
              value={editingProduct.description}
              placeholder="Description"
              onChange={(event) => updateEditingProduct({ description: event.target.value })}
              className="min-h-24 rounded-md border border-primary-border bg-primary-card p-3 text-sm text-primary-text outline-none focus:ring-2 focus:ring-primary-border"
            />

            <div className="flex flex-col gap-3 rounded-lg border border-primary-border">
              <div className="text-sm font-bold">Product image</div>
              <CustomInput
                value={editingProduct.imageUrl}
                placeholder="Image URL or uploaded image data"
                onChange={(event) => updateEditingProduct({ imageUrl: event.target.value })}
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition hover:bg-primary-bg">
                <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
                <span className="text-sm font-semibold">Upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleEditImageUpload(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-primary-border bg-primary-media">
                {editingProduct.imageUrl ? (
                  <button
                    type="button"
                    className="h-full w-full"
                    onClick={() => openImagePreview(editingProduct.imageUrl)}
                    aria-label="Open product image"
                  >
                    <img
                      src={editingProduct.imageUrl}
                      alt="Product preview"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <span className="text-sm text-secondary-text">Image preview</span>
                )}
              </div>
            </div>

            <CustomSwitch
              checked={editingProduct.active}
              onChange={(active) => updateEditingProduct({ active })}
              label={editingProduct.active ? "Active" : "Hidden"}
              size="sm"
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <CustomButton
                variant="danger"
                border="base"
                fullWidth
                icon={<IoTrashOutline />}
                onClick={deleteEditingProduct}
              >
                Delete
              </CustomButton>
              <CustomButton
                border="base"
                isLoading={saving}
                loading="dots"
                loadingText="Saving..."
                fullWidth
                icon={<IoSaveOutline />}
                onClick={submitEditingProduct}
              >
                Save changes
              </CustomButton>
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage("")}
        title="Product image"
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-md bg-bg-base">
          {previewImage && (
            <img
              src={previewImage}
              alt="Product image preview"
              className="max-h-[75vh] w-full object-contain"
            />
          )}
        </div>
      </CustomModal>
    </section>
  );
}
