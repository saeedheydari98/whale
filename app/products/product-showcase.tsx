"use client";

import { useEffect, useMemo, useState } from "react";
import { IoBagAddOutline, IoBagHandleOutline, IoOpenOutline } from "react-icons/io5";
import { CustomButton } from "../design-system/components/ui/button";
import { CustomTag } from "../design-system/components/ui/tag";

type Product = {
  id?: number | string;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  discountPrice?: string;
  discountPercent?: number | string;
  imageUrl?: string;
  badge?: string;
  ctaLabel?: string;
  ctaHref?: string;
  active: boolean;
  sortOrder: number;
};

const PRODUCTS_STORAGE_KEY = "admin-products";
const CART_STORAGE_KEY = "product-cart";
const CART_UPDATED_EVENT = "product-cart-updated";

type CartItem = Product & {
  quantity: number;
};

function getFinalPrice(product: Product) {
  return product.discountPrice || product.price;
}

function formatPrice(value?: string) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || !normalized) {
    return value || "";
  }

  return parsed.toLocaleString("en-US");
}

function getDiscountPercent(product: Product) {
  const percent = Number(product.discountPercent);
  return Number.isFinite(percent) && percent > 0 ? Math.round(percent) : 0;
}

function readLocalProducts(): Product[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function getProductKey(product: Partial<Product>) {
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

function dedupeProducts(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = getProductKey(product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ProductShowcase() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = await res.json();
        const apiProducts = Array.isArray(data?.data) ? dedupeProducts(data.data) : [];
        const localProducts = dedupeProducts(readLocalProducts().filter((item) => item.active));
        setProducts(apiProducts.length > 0 ? apiProducts : localProducts);
      } catch {
        setProducts(readLocalProducts().filter((item) => item.active));
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const sortedProducts = useMemo(
    () => products.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [products]
  );

  const addToCart = (product: Product) => {
    const key = String(product.id ?? `${product.title}-${product.description}-${product.price}`);
    const currentCart = readCart();
    const existing = currentCart.find((item) => String(item.id ?? `${item.title}-${item.description}-${item.price}`) === key);
    const nextCart = existing
      ? currentCart.map((item) =>
          String(item.id ?? `${item.title}-${item.description}-${item.price}`) === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...currentCart, { ...product, quantity: 1 }];

    writeCart(nextCart);
    setCartMessage(`${product.title} added to cart.`);
    window.setTimeout(() => setCartMessage(""), 1800);
  };

  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 border-b border-ui-primary/30 pb-4">
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="max-w-2xl text-sm text-text-secondary">
            A dynamic product showcase managed from the admin panel.
          </p>
        </div>

        {loading && <div className="text-sm text-text-secondary">Loading products...</div>}

        {!loading && sortedProducts.length === 0 && (
          <div className="rounded-lg border border-ui-primary/30 bg-bg-surface p-6 text-sm text-text-secondary">
            No active products are available.
          </div>
        )}

        {cartMessage && (
          <div className="rounded-md border border-ui-primary/30 bg-bg-surface px-4 py-2 text-sm font-semibold text-ui-primary">
            {cartMessage}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedProducts.map((product, index) => (
            <article
              key={product.id ?? `${product.title}-${index}`}
              className="overflow-hidden rounded-lg border border-ui-primary/30 bg-bg-surface shadow-sm"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-ui-primary/10">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <IoBagHandleOutline className="text-6xl text-ui-primary" aria-hidden="true" />
                )}
                {product.badge && (
                  <div className="absolute left-3 top-3">
                    <CustomTag size="sm" rounded="full" border="base">
                      {product.badge}
                    </CustomTag>
                  </div>
                )}
              </div>

              <div className="flex min-h-56 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold">{product.title}</h2>
                  <div className="shrink-0 text-right">
                    {product.originalPrice && getDiscountPercent(product) > 0 && (
                      <div className="text-xs text-text-secondary line-through">
                        {formatPrice(product.originalPrice)}
                      </div>
                    )}
                    <div className="font-semibold text-ui-primary">{formatPrice(getFinalPrice(product))}</div>
                  </div>
                </div>
                {getDiscountPercent(product) > 0 && (
                  <CustomTag size="sm" rounded="full" border="base">
                    {getDiscountPercent(product)}% off
                  </CustomTag>
                )}
                <p className="flex-1 text-sm leading-6 text-text-secondary">{product.description}</p>
                <div className="flex flex-wrap gap-2">
                  <CustomButton
                    type="button"
                    variant="success"
                    border="base"
                    rounded="md"
                    size="sm"
                    icon={<IoBagAddOutline />}
                    onClick={() => addToCart(product)}
                  >
                    Add to cart
                  </CustomButton>
                  <a href={product.ctaHref || "#"} className="inline-flex">
                    <CustomButton
                      type="button"
                      variant="primary"
                      border="base"
                      rounded="md"
                      size="sm"
                      iconAfter={<IoOpenOutline />}
                    >
                      {product.ctaLabel || "View product"}
                    </CustomButton>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
