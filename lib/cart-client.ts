"use client";

import {
  isUserProfileComplete,
  readUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import { NOTIFICATION_SILENT_HEADER, notifyApp } from "@/lib/app-notifications";
import type { ProductRecord } from "@/lib/products-client";

export const CART_STORAGE_KEY = "product-cart";
export const CART_UPDATED_EVENT = "product-cart-updated";

const SILENT_NOTIFICATION_HEADERS = { [NOTIFICATION_SILENT_HEADER]: "true" };

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
  isAvailable?: boolean;
  stockQuantity?: number | string;
  colorStock?: unknown;
  quantity: number;
};

export type CartSnapshot = {
  items: CartItemRecord[];
  profile: UserProfile | null;
};

function readCartItemsFromApiData(data: any) {
  return data?.data?.cart?.items ?? data?.data?.items ?? [];
}

function canSyncCartToApi(profile: UserProfile | null | undefined): profile is UserProfile {
  return Boolean(profile && isUserProfileComplete(profile));
}

function emitCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function notifyCartSuccess(message: string) {
  notifyApp({ type: "success", message });
}

function notifyCartError(message: string) {
  notifyApp({ type: "error", message });
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
  const stockQuantity = Number.isFinite(Number(item.stockQuantity))
    ? Math.max(0, Math.round(Number(item.stockQuantity)))
    : undefined;
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
    isAvailable: item.isAvailable !== false,
    stockQuantity,
    colorStock: item.colorStock,
    quantity: Math.max(1, Math.round(Number(item.quantity ?? index + 1))),
  };
}

function getStockLimit(item: Partial<CartItemRecord> | Partial<ProductRecord>) {
  const stockQuantity = Number(item.stockQuantity);
  return Number.isFinite(stockQuantity)
    ? Math.max(0, Math.round(stockQuantity))
    : Number.POSITIVE_INFINITY;
}

function clampCartQuantity(item: Partial<CartItemRecord> | Partial<ProductRecord>, quantity: number) {
  const requested = Math.max(1, Math.round(Number(quantity) || 1));
  const stockLimit = getStockLimit(item);
  if (item.isAvailable === false || stockLimit <= 0) return 0;
  return Math.min(requested, stockLimit);
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

export function hasLocalCartSnapshot() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CART_STORAGE_KEY) !== null;
}

export function writeLocalCart(items: CartItemRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(dedupeCartItems(items)));
  emitCartUpdated();
}

async function saveCartToApi(items: CartItemRecord[], profile: UserProfile, options?: { silent?: boolean }) {
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.silent ? SILENT_NOTIFICATION_HEADERS : {}),
    },
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

async function clearCartFromApi(profile?: UserProfile | null, options?: { silent?: boolean }) {
  const res = await fetch("/api/cart", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(options?.silent ? SILENT_NOTIFICATION_HEADERS : {}),
    },
    body: JSON.stringify(canSyncCartToApi(profile) ? { profile } : {}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Cart clear failed");
  }
  return [];
}

export async function getCart(): Promise<CartSnapshot> {
  const profile = readUserProfile();
  const localItems = readLocalCart();

  if (localItems.length === 0) {
    writeLocalCart([]);
    await clearCartFromApi(profile, { silent: true }).catch(() => undefined);
    return { items: [], profile };
  }

  if (!canSyncCartToApi(profile)) {
    return { items: localItems, profile };
  }

  try {
    const savedItems = await saveCartToApi(localItems, profile, { silent: true });
    writeLocalCart(savedItems);
    return { items: savedItems, profile };
  } catch {
    console.warn("Cart API load sync failed; using local cart.");
    return { items: localItems, profile };
  }
}

export async function persistCart(items: CartItemRecord[], profile = readUserProfile()) {
  const nextItems = dedupeCartItems(items);
  writeLocalCart(nextItems);

  if (nextItems.length === 0) {
    await clearCartFromApi(profile, { silent: true }).catch(() => undefined);
    return nextItems;
  }

  if (!canSyncCartToApi(profile)) {
    return nextItems;
  }

  try {
    const savedItems = await saveCartToApi(nextItems, profile, { silent: true });
    writeLocalCart(savedItems);
    return savedItems;
  } catch (error) {
    console.warn("Cart API save failed; using local cart.");
    return nextItems;
  }
}

export async function addProductToCart(product: ProductRecord, quantity = 1, selectedColor = "") {
  const stockLimit = getStockLimit(product);
  if (product.isAvailable === false || stockLimit <= 0) {
    const message = "محصول ناموجود است.";
    notifyCartError(message);
    throw new Error(message);
  }

  const productId = product.id ?? null;
  const key = `${String(productId ?? `${product.title}-${product.description}-${product.price}`)}|${selectedColor}`;
  const currentCart = readLocalCart();
  const existing = currentCart.find((item) => getItemKey(item) === key);
  const nextQuantity = clampCartQuantity(product, (existing?.quantity ?? 0) + quantity);
  if (nextQuantity <= 0) {
    const message = "محصول ناموجود است.";
    notifyCartError(message);
    throw new Error(message);
  }
  const nextCart = existing
    ? currentCart.map((item) =>
        getItemKey(item) === key
          ? { ...item, quantity: nextQuantity, stockQuantity: product.stockQuantity, isAvailable: product.isAvailable }
          : item
      )
    : [
        ...currentCart,
        normalizeCartItem(
          {
            ...product,
            productId,
            selectedColor,
            quantity: nextQuantity,
          },
          currentCart.length
        ),
      ];

  const savedItems = await persistCart(nextCart);
  notifyCartSuccess(`${product.title} به سبد خرید اضافه شد.`);
  return savedItems;
}

export async function updateCartQuantity(target: CartItemRecord, quantity: number, options?: { notify?: boolean }) {
  const key = getItemKey(target);
  const currentCart = readLocalCart();
  const nextQuantity = clampCartQuantity(target, quantity);
  const nextCart =
    quantity <= 0 || nextQuantity <= 0
      ? currentCart.filter((item) => getItemKey(item) !== key)
      : currentCart.map((item) =>
          getItemKey(item) === key ? { ...item, quantity: nextQuantity } : item
        );

  const savedItems = await persistCart(nextCart);
  if (options?.notify !== false) {
    notifyCartSuccess(quantity <= 0 || nextQuantity <= 0 ? "محصول از سبد خرید حذف شد." : "سبد خرید به‌روزرسانی شد.");
  }
  return savedItems;
}

export async function removeCartItem(target: CartItemRecord) {
  return updateCartQuantity(target, 0);
}

export async function clearCart() {
  const savedItems = await persistCart([]);
  notifyCartSuccess("سبد خرید خالی شد.");
  return savedItems;
}

export async function checkoutCart(profile = readUserProfile()) {
  if (!profile || !isUserProfileComplete(profile)) {
    const message = "برای این عملیات اطلاعات پروفایل باید کامل باشد.";
    notifyCartError(message);
    throw new Error(message);
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
