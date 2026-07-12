"use client";

import {
  isUserProfileComplete,
  normalizeUserProfile,
  readUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import { NOTIFICATION_SILENT_HEADER, notifyApp } from "@/lib/app-notifications";
import type { ProductRecord } from "@/lib/products-client";
import {
  fetchCurrentUser,
  readCachedAuthUser,
  type AuthClientUser,
} from "@/lib/auth-client";

export const CART_STORAGE_KEY = "product-cart";
export const CART_UPDATED_EVENT = "product-cart-updated";

const SILENT_NOTIFICATION_HEADERS = { [NOTIFICATION_SILENT_HEADER]: "true" };
const GUEST_CART_STORAGE_KEY = `${CART_STORAGE_KEY}:guest`;

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

function readCartProfileFromApiData(data: any) {
  const profileData = data?.data?.user?.profile ?? data?.data?.profile ?? null;
  if (!profileData || typeof profileData !== "object") return null;
  const profile = normalizeUserProfile(profileData as Partial<UserProfile>);
  return isUserProfileComplete(profile) ? profile : null;
}

function canSyncCartToApi(profile: UserProfile | null | undefined): profile is UserProfile {
  return Boolean(profile && isUserProfileComplete(profile));
}

function canUseAccountCart(user: AuthClientUser | null | undefined) {
  return Boolean(user?.id ?? user?.username ?? user?.email);
}

function canUseApiCart(profile: UserProfile | null | undefined, user: AuthClientUser | null | undefined) {
  return canUseAccountCart(user) || canSyncCartToApi(profile);
}

function getCartStorageKey(user: AuthClientUser | null | undefined = readCachedAuthUser()) {
  const userId = user?.id == null ? "" : String(user.id).trim();
  if (userId) return `${CART_STORAGE_KEY}:user:${userId}`;

  const username = String(user?.username ?? "").trim().toLowerCase();
  if (username) return `${CART_STORAGE_KEY}:username:${username}`;

  const email = String(user?.email ?? "").trim().toLowerCase();
  if (email) return `${CART_STORAGE_KEY}:email:${email}`;

  return GUEST_CART_STORAGE_KEY;
}

function migrateLegacyGuestCart(targetKey: string) {
  if (typeof window === "undefined" || targetKey !== GUEST_CART_STORAGE_KEY) return;
  if (localStorage.getItem(targetKey) !== null) return;

  const legacyCart = localStorage.getItem(CART_STORAGE_KEY);
  if (legacyCart === null) return;

  localStorage.setItem(targetKey, legacyCart);
  localStorage.removeItem(CART_STORAGE_KEY);
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

export function readLocalCart(user: AuthClientUser | null | undefined = readCachedAuthUser()): CartItemRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const storageKey = getCartStorageKey(user);
    migrateLegacyGuestCart(storageKey);
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return dedupeCartItems(parsed.map(normalizeCartItem));
  } catch {
    return [];
  }
}

export function hasLocalCartSnapshot(user: AuthClientUser | null | undefined = readCachedAuthUser()) {
  if (typeof window === "undefined") return false;
  const storageKey = getCartStorageKey(user);
  migrateLegacyGuestCart(storageKey);
  return localStorage.getItem(storageKey) !== null;
}

export function writeLocalCart(items: CartItemRecord[], user: AuthClientUser | null | undefined = readCachedAuthUser()) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getCartStorageKey(user), JSON.stringify(dedupeCartItems(items)));
  localStorage.removeItem(CART_STORAGE_KEY);
  emitCartUpdated();
}

export function clearLocalCartSnapshot(user: AuthClientUser | null | undefined = readCachedAuthUser()) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getCartStorageKey(user));
  localStorage.removeItem(CART_STORAGE_KEY);
  emitCartUpdated();
}

async function loadCartFromApi(options?: { silent?: boolean }) {
  const res = await fetch("/api/cart", {
    cache: "no-store",
    headers: {
      ...(options?.silent ? SILENT_NOTIFICATION_HEADERS : {}),
    },
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Cart load failed");
  }
  const apiItems = readCartItemsFromApiData(data);
  return {
    items: Array.isArray(apiItems) ? apiItems.map(normalizeCartItem) : [],
    profile: readCartProfileFromApiData(data),
  };
}

async function saveCartToApi(items: CartItemRecord[], profile?: UserProfile | null, options?: { silent?: boolean }) {
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.silent ? SILENT_NOTIFICATION_HEADERS : {}),
    },
    body: JSON.stringify(canSyncCartToApi(profile) ? { profile, items } : { items }),
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
  const user = await fetchCurrentUser({ force: true }).catch(() => readCachedAuthUser());
  const profile = readUserProfile();

  if (canUseAccountCart(user)) {
    try {
      const apiCart = await loadCartFromApi({ silent: true });
      writeLocalCart(apiCart.items, user);
      return { items: apiCart.items, profile: apiCart.profile ?? profile };
    } catch {
      console.warn("Cart API load failed; using account local cart.");
      return { items: readLocalCart(), profile };
    }
  }

  return { items: readLocalCart(), profile };
}

export async function persistCart(items: CartItemRecord[], profile = readUserProfile()) {
  const user = readCachedAuthUser();
  const nextItems = dedupeCartItems(items);
  writeLocalCart(nextItems, user);

  if (nextItems.length === 0) {
    if (canUseApiCart(profile, user)) {
      await clearCartFromApi(profile, { silent: true }).catch(() => undefined);
    }
    return nextItems;
  }

  if (!canUseApiCart(profile, user)) {
    return nextItems;
  }

  try {
    const savedItems = await saveCartToApi(nextItems, profile, { silent: true });
    writeLocalCart(savedItems, user);
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
