"use client";

import { useEffect, useMemo, useState } from "react";
import { IoAdd, IoCloudUploadOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../../design-system/components/ui/button";
import { FloatButton } from "../../design-system/components/ui/float-button";
import { CustomInput } from "../../design-system/components/ui/input";
import { CustomModal } from "../../design-system/components/ui/modal";
import { CustomSwitch } from "../../design-system/components/ui/switch";

type ProductForm = {
  id: number | string;
  title: string;
  description: string;
  price: string;
  originalPrice: string;
  discountPrice: string;
  discountPercent: string;
  imageUrl: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
  active: boolean;
  sortOrder: number;
};

const PRODUCTS_STORAGE_KEY = "admin-products";

const createProduct = (): ProductForm => ({
  id: `local-${Date.now()}`,
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

function readLocalProducts(): ProductForm[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalProducts(products: ProductForm[]) {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
}

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

export function AdminProductsPanel() {
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [draftProduct, setDraftProduct] = useState<ProductForm>(createProduct);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/api/products?all=1", { cache: "no-store" });
        const data = await res.json();
        const apiProducts = Array.isArray(data?.data) ? dedupeProducts(data.data.map(normalizeProduct)) : [];
        const localProducts = dedupeProducts(readLocalProducts().map(normalizeProduct));
        const nextProducts = apiProducts.length > 0 ? apiProducts : localProducts;
        setProducts(nextProducts);
        if (apiProducts.length > 0) {
          writeLocalProducts(apiProducts);
        }
      } catch {
        setProducts(readLocalProducts().map(normalizeProduct));
      }
    };

    loadProducts();
  }, []);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products]
  );

  const persistProducts = async (nextProducts: ProductForm[]) => {
    const validProducts = dedupeProducts(
      nextProducts.filter((item) => item.title.trim() && item.description.trim() && item.price.trim())
    );

    setSaving(true);
    setStatus("");

    try {
      writeLocalProducts(validProducts);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: validProducts }),
      });
      const data = await res.json();
      const savedProducts = Array.isArray(data?.data) ? dedupeProducts(data.data.map(normalizeProduct)) : validProducts;
      setProducts(savedProducts);
      writeLocalProducts(savedProducts);
      setStatus("Products saved.");
    } catch {
      writeLocalProducts(validProducts);
      setStatus("Saved locally. API was not available.");
    } finally {
      setSaving(false);
    }
  };

  const saveProducts = () => persistProducts(sortedProducts);

  const openCreateModal = () => {
    setDraftProduct({ ...createProduct(), sortOrder: products.length + 1 });
    setIsCreateOpen(true);
  };

  const updateDraftProduct = (patch: Partial<ProductForm>) => {
    setDraftProduct((current) => ({ ...current, ...patch }));
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
    <section className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-ui-primary/30 bg-bg-surface p-4">
      <div className="grid gap-4">
        {sortedProducts.map((product, index) => (
          <CustomButton
            key={product.id}
            fullWidth
            border="base"
            rounded="md"
            variant={product.active ? "primary" : "neutral"}
            onClick={() => openEditModal(product)}
          >
            {product.title || `Product ${index + 1}`}
          </CustomButton>
        ))}
      </div>

      <FloatButton
        label="New product"
        icon={<IoAdd />}
        position="bottom-right"
        border="base"
        shadow="lg"
        onClick={openCreateModal}
      />

      <CustomModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register product"
        closeText="Close"
        rounded="lg"
        border="base"
        shadow="lg"
      >
        <div className="grid max-h-[80vh] gap-3 overflow-y-auto pr-1">
          <div className="grid gap-3 md:grid-cols-2">
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

          <div className="rounded-md border border-ui-primary/20 bg-bg-base p-3 text-xs text-text-secondary">
            Discount formula: ((price before discount - discounted price) / price before discount) x 100
          </div>

          <textarea
            value={draftProduct.description}
            placeholder="Description"
            onChange={(event) => updateDraftProduct({ description: event.target.value })}
            className="min-h-24 rounded-md border border-ui-primary/30 bg-bg-base p-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ui-primary/30"
          />

          <div className="grid gap-3 rounded-lg border border-ui-primary/20 p-3">
            <div className="text-sm font-bold">Product image</div>
            <CustomInput
              value={draftProduct.imageUrl}
              placeholder="Image URL or uploaded image data"
              onChange={(event) => updateDraftProduct({ imageUrl: event.target.value })}
            />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-ui-primary/40 bg-bg-base p-4 text-sm font-semibold text-text-secondary transition hover:bg-ui-primary/10">
              <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleImageUpload(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-ui-primary/20 bg-bg-base">
              {draftProduct.imageUrl ? (
                <img
                  src={draftProduct.imageUrl}
                  alt="Product preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm text-text-secondary">Image preview</span>
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
          <div className="grid max-h-[80vh] gap-3 overflow-y-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2">
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

            <div className="rounded-md border border-ui-primary/20 bg-bg-base p-3 text-xs text-text-secondary">
              Discount formula: ((price before discount - discounted price) / price before discount) x 100
            </div>

            <textarea
              value={editingProduct.description}
              placeholder="Description"
              onChange={(event) => updateEditingProduct({ description: event.target.value })}
              className="min-h-24 rounded-md border border-ui-primary/30 bg-bg-base p-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ui-primary/30"
            />

            <div className="grid gap-3 rounded-lg border border-ui-primary/20 p-3">
              <div className="text-sm font-bold">Product image</div>
              <CustomInput
                value={editingProduct.imageUrl}
                placeholder="Image URL or uploaded image data"
                onChange={(event) => updateEditingProduct({ imageUrl: event.target.value })}
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-ui-primary/40 bg-bg-base p-4 text-sm font-semibold text-text-secondary transition hover:bg-ui-primary/10">
                <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleEditImageUpload(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-ui-primary/20 bg-bg-base">
                {editingProduct.imageUrl ? (
                  <img
                    src={editingProduct.imageUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm text-text-secondary">Image preview</span>
                )}
              </div>
            </div>

            <CustomSwitch
              checked={editingProduct.active}
              onChange={(active) => updateEditingProduct({ active })}
              label={editingProduct.active ? "Active" : "Hidden"}
              size="sm"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <CustomButton
                variant="danger"
                border="base"
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
                icon={<IoSaveOutline />}
                onClick={submitEditingProduct}
              >
                Save changes
              </CustomButton>
            </div>
          </div>
        )}
      </CustomModal>
    </section>
  );
}
