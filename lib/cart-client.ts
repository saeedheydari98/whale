"use client";

import {
  isUserProfileComplete,
  readUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import type { ProductRecord } from "@/lib/products-client";

export const CART_STORAGE_KEY = "product-cart";
export const CART_UPDATED_EVENT = "product-cart-updated";

export type CartItemRecord = {
  id?: number | string;
  productId?: number | string | null;
  title: string;
  description: string;
  price: string;
  originalPrice?: string | null;
  discountPrice?: string | null;
  discountPercent?: number | string | null;
  imageUrl?: string | null;
  selectedColor?: string | null;
  quantity: number;
};

export type CartSnapshot = {
  items: CartItemRecord[];
  profile: UserProfile | null;
};

function readCartItemsFromApiData(data: any) {
  return data?.data?.cart?.items ?? data?.data?.items ?? [];
}

function emitCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function getItemKey(item: Partial<CartItemRecord>) {
  const base = String(
    item.productId ??
      item.id ??
      `${item.title ?? ""}-${item.description ?? ""}-${item.price ?? ""}`
  );
  return `${base}|${item.selectedColor ?? ""}`;
}

function normalizeCartItem(item: Partial<CartItemRecord>, index: number): CartItemRecord {
  return {
    id: item.id,
    productId: item.productId ?? item.id ?? null,
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    price: String(item.price ?? ""),
    originalPrice: item.originalPrice ? String(item.originalPrice) : "",
    discountPrice: item.discountPrice ? String(item.discountPrice) : "",
    discountPercent: item.discountPercent ?? "",
    imageUrl: item.imageUrl ? String(item.imageUrl) : "",
    selectedColor: item.selectedColor ? String(item.selectedColor) : "",
    quantity: Math.max(1, Math.round(Number(item.quantity ?? index + 1))),
  };
}

function dedupeCartItems(items: CartItemRecord[]) {
  const byKey = new Map<string, CartItemRecord>();

  for (const item of items) {
    const key = getItemKey(item);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      });
      continue;
    }
    byKey.set(key, item);
  }

  return Array.from(byKey.values());
}

export function readLocalCart(): CartItemRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return dedupeCartItems(parsed.map(normalizeCartItem));
  } catch {
    return [];
  }
}

export function writeLocalCart(items: CartItemRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(dedupeCartItems(items)));
  emitCartUpdated();
}

function getProfileQuery(profile: UserProfile) {
  const params = new URLSearchParams({
    nationalId: profile.nationalId.trim(),
    phone: profile.phone.trim(),
  });
  return params.toString();
}

async function saveCartToApi(items: CartItemRecord[], profile: UserProfile) {
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, items }),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Cart save failed");
  }
  const apiItems = readCartItemsFromApiData(data);
  return Array.isArray(apiItems)
    ? apiItems.map(normalizeCartItem)
    : items;
}

export async function getCart(): Promise<CartSnapshot> {
  const profile = readUserProfile();
  const localItems = readLocalCart();

  if (!profile || !isUserProfileComplete(profile)) {
    return { items: localItems, profile: null };
  }

  try {
    const res = await fetch(`/api/cart?${getProfileQuery(profile)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.message || data?.error || "Cart load failed");
    }

    const items = readCartItemsFromApiData(data);
    const apiItems = Array.isArray(items)
      ? items.map(normalizeCartItem)
      : [];

    if (apiItems.length === 0 && localItems.length > 0) {
      const savedItems = await saveCartToApi(localItems, profile);
      writeLocalCart(savedItems);
      return { items: savedItems, profile };
    }

    writeLocalCart(apiItems);
    return { items: apiItems, profile };
  } catch (error) {
    console.error("Cart API load error:", error);
    return { items: localItems, profile };
  }
}

export async function persistCart(items: CartItemRecord[], profile = readUserProfile()) {
  const nextItems = dedupeCartItems(items);
  writeLocalCart(nextItems);

  if (!profile || !isUserProfileComplete(profile)) {
    return nextItems;
  }

  try {
    const savedItems = await saveCartToApi(nextItems, profile);
    writeLocalCart(savedItems);
    return savedItems;
  } catch (error) {
    console.error("Cart API save error:", error);
    return nextItems;
  }
}

export async function addProductToCart(product: ProductRecord, quantity = 1, selectedColor = "") {
  const productId = product.id ?? null;
  const key = `${String(productId ?? `${product.title}-${product.description}-${product.price}`)}|${selectedColor}`;
  const currentCart = readLocalCart();
  const existing = currentCart.find((item) => getItemKey(item) === key);
  const nextCart = existing
    ? currentCart.map((item) =>
        getItemKey(item) === key
          ? { ...item, quantity: item.quantity + quantity }
          : item
      )
    : [
        ...currentCart,
        normalizeCartItem(
          {
            ...product,
            productId,
            selectedColor,
            quantity,
          },
          currentCart.length
        ),
      ];

  return persistCart(nextCart);
}

export async function updateCartQuantity(target: CartItemRecord, quantity: number) {
  const key = getItemKey(target);
  const currentCart = readLocalCart();
  const nextCart =
    quantity <= 0
      ? currentCart.filter((item) => getItemKey(item) !== key)
      : currentCart.map((item) =>
          getItemKey(item) === key ? { ...item, quantity } : item
        );

  return persistCart(nextCart);
}

export async function removeCartItem(target: CartItemRecord) {
  return updateCartQuantity(target, 0);
}

export async function clearCart() {
  return persistCart([]);
}

export async function checkoutCart(profile = readUserProfile()) {
  if (!profile || !isUserProfileComplete(profile)) {
    throw new Error("Complete profile is required.");
  }

  const res = await fetch("/api/cart", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Checkout failed");
  }

  writeLocalCart([]);
  return [];
}

export function getCartCount(items = readLocalCart()) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
