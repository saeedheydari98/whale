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
import {
  colorSelectionTotal,
  normalizeCartColorStock,
  normalizeColorSelection,
  parseSerializedColorSelection,
  serializeColorSelection,
  type CartColorSelection,
} from "@/lib/cart-color-selection";

export { normalizeCartColorStock };
export type { CartColorSelection };

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
  selectedColors?: CartColorSelection;
  isAvailable?: boolean;
  stockQuantity?: number | string;
  colorStock?: unknown;
  quantity: number;
};

export type CartSnapshot = {
  items: CartItemRecord[];
  profile: UserProfile | null;
};

let pendingCartLoad: Promise<CartSnapshot> | null = null;
let pendingCartLoadKey = "";
let cartMutationVersion = 0;
let cartApiMutationQueue: Promise<void> = Promise.resolve();
const pendingLocalCartKeys = new Set<string>();

function clearPendingCartLoad() {
  pendingCartLoad = null;
  pendingCartLoadKey = "";
}

function beginCartMutation(user: AuthClientUser | null | undefined = readCachedAuthUser()) {
  cartMutationVersion += 1;
  pendingLocalCartKeys.add(getCartStorageKey(user));
  clearPendingCartLoad();
  return cartMutationVersion;
}

function markCartSynchronized(user: AuthClientUser | null | undefined) {
  pendingLocalCartKeys.delete(getCartStorageKey(user));
}

function enqueueCartApiMutation<T>(mutation: () => Promise<T>) {
  const result = cartApiMutationQueue.then(mutation, mutation);
  cartApiMutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

type CartApiData = {
  data?: {
    cart?: { items?: unknown };
    items?: unknown;
    user?: { profile?: unknown };
    profile?: unknown;
  };
};

export type CheckoutOptions = {
  shippingMethod: "pickup" | "post";
  discountCode?: string;
};

export type CheckoutQuote = {
  subtotal: number;
  discountAmount: number;
  walletAmount: number;
  shippingAmount: number;
  total: number;
  cashbackEarned: number;
  cashbackPercent: number;
  walletBalance: number;
  shippingMethod: "pickup" | "post";
  discountCode: string | null;
  discountType: "percentage" | "free_shipping" | null;
  discountPercent: number | null;
};

function readCartItemsFromApiData(data: unknown) {
  const response = data as CartApiData | null;
  return response?.data?.cart?.items ?? response?.data?.items ?? [];
}

function readCartProfileFromApiData(data: unknown) {
  const response = data as CartApiData | null;
  const profileData = response?.data?.user?.profile ?? response?.data?.profile ?? null;
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

export function getCartItemColorSelection(item: Partial<CartItemRecord>): CartColorSelection {
  const quantity = Math.max(1, Math.round(Number(item.quantity ?? 1) || 1));
  const fromObject = normalizeColorSelection(item.selectedColors);
  if (Object.keys(fromObject).length > 0) return fromObject;
  return parseSerializedColorSelection(item.selectedColor, quantity);
}

function getItemKey(item: Partial<CartItemRecord>) {
  const base = String(
    item.productId ??
      item.id ??
      `${item.title ?? ""}-${item.description ?? ""}-${item.price ?? ""}`
  );
  return base;
}

function normalizeCartItem(item: Partial<CartItemRecord>, index: number): CartItemRecord {
  const stockQuantity = Number.isFinite(Number(item.stockQuantity))
    ? Math.max(0, Math.round(Number(item.stockQuantity)))
    : undefined;
  const requestedQuantity = Math.max(1, Math.round(Number(item.quantity ?? index + 1)));
  const selectedColors = getCartItemColorSelection({ ...item, quantity: requestedQuantity });
  const selectedColorText = serializeColorSelection(selectedColors);
  const selectedTotal = colorSelectionTotal(selectedColors);

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
    selectedColor: selectedColorText || (item.selectedColor ? String(item.selectedColor) : ""),
    selectedColors,
    isAvailable: item.isAvailable !== false,
    stockQuantity,
    colorStock: item.colorStock,
    quantity: selectedTotal > 0 ? selectedTotal : requestedQuantity,
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
      const mergedSelection = {
        ...getCartItemColorSelection(existing),
      };
      for (const [color, count] of Object.entries(getCartItemColorSelection(item))) {
        mergedSelection[color] = (mergedSelection[color] ?? 0) + count;
      }
      const selectionTotal = colorSelectionTotal(mergedSelection);

      byKey.set(key, {
        ...existing,
        ...item,
        selectedColors: mergedSelection,
        selectedColor: serializeColorSelection(mergedSelection) || existing.selectedColor || item.selectedColor || "",
        quantity: selectionTotal > 0 ? selectionTotal : existing.quantity + item.quantity,
      });
      continue;
    }
    const selectedColors = getCartItemColorSelection(item);
    byKey.set(key, {
      ...item,
      selectedColors,
      selectedColor: serializeColorSelection(selectedColors) || item.selectedColor || "",
    });
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

export function claimGuestCartForUser(user: AuthClientUser | null | undefined) {
  if (typeof window === "undefined" || !canUseAccountCart(user)) return null;
  if (localStorage.getItem(GUEST_CART_STORAGE_KEY) === null) return null;

  const guestItems = readLocalCart(null);
  localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  if (guestItems.length === 0) return null;

  const accountItems = readLocalCart(user);
  const mergedItems = dedupeCartItems([...accountItems, ...guestItems]);
  beginCartMutation(user);
  localStorage.setItem(getCartStorageKey(user), JSON.stringify(mergedItems));
  localStorage.removeItem(CART_STORAGE_KEY);
  return mergedItems;
}

export function clearLocalCartSnapshot(user: AuthClientUser | null | undefined = readCachedAuthUser()) {
  if (typeof window === "undefined") return;
  beginCartMutation(user);
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
    throw new Error(data?.message || data?.error || "بارگذاری سبد خرید ناموفق بود.");
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
    throw new Error(data?.message || data?.error || "ذخیره سبد خرید ناموفق بود.");
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
    throw new Error(data?.message || data?.error || "پاک کردن سبد خرید ناموفق بود.");
  }
  return [];
}

export async function getCart(user: AuthClientUser | null | undefined = readCachedAuthUser()): Promise<CartSnapshot> {
  const profile = readUserProfile();

  if (canUseAccountCart(user)) {
    const loadKey = getCartStorageKey(user);
    if (pendingLocalCartKeys.has(loadKey)) return { items: readLocalCart(user), profile };
    if (pendingCartLoad && pendingCartLoadKey === loadKey) return pendingCartLoad;

    const loadVersion = cartMutationVersion;
    pendingCartLoadKey = loadKey;
    const request: Promise<CartSnapshot> = loadCartFromApi({ silent: true })
      .then((apiCart) => {
        if (loadVersion !== cartMutationVersion) {
          return { items: readLocalCart(user), profile };
        }
        writeLocalCart(apiCart.items, user);
        return { items: apiCart.items, profile: apiCart.profile ?? profile };
      })
      .catch(() => {
        console.warn("Cart API load failed; using account local cart.");
        return { items: readLocalCart(user), profile };
      })
      .finally(() => {
        if (pendingCartLoad === request) clearPendingCartLoad();
      });
    pendingCartLoad = request;

    return request;
  }

  return { items: readLocalCart(user), profile };
}

export async function persistCart(items: CartItemRecord[], profile = readUserProfile()) {
  const user = readCachedAuthUser();
  const mutationVersion = beginCartMutation(user);
  const nextItems = dedupeCartItems(items);
  writeLocalCart(nextItems, user);

  if (nextItems.length === 0) {
    if (canUseApiCart(profile, user)) {
      const cleared = await enqueueCartApiMutation(() => clearCartFromApi(profile, { silent: true }))
        .then(() => true, () => false);
      if (cleared && mutationVersion === cartMutationVersion) markCartSynchronized(user);
    }
    return nextItems;
  }

  if (!canUseApiCart(profile, user)) {
    return nextItems;
  }

  try {
    const savedItems = await enqueueCartApiMutation(() => saveCartToApi(nextItems, profile, { silent: true }));
    if (mutationVersion !== cartMutationVersion) return readLocalCart(user);
    markCartSynchronized(user);
    writeLocalCart(savedItems, user);
    return savedItems;
  } catch {
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
  const key = String(productId ?? `${product.title}-${product.description}-${product.price}`);
  const colorStock = normalizeCartColorStock(product.colorStock);
  const hasColorStock = Object.keys(colorStock).length > 0;
  const cartColor = selectedColor.trim();
  const requestedQuantity = Math.max(1, Math.round(Number(quantity) || 1));

  const cartUser = readCachedAuthUser() ?? await fetchCurrentUser({ allowStaleOnError: true });
  claimGuestCartForUser(cartUser);
  const currentCart = readLocalCart(cartUser);
  const existing = currentCart.find((item) => getItemKey(item) === key);
  const existingSelection = existing ? getCartItemColorSelection(existing) : {};
  const nextSelection = hasColorStock && !cartColor ? {} : { ...existingSelection };

  if (hasColorStock && cartColor) {
    const nextColorQuantity = (nextSelection[cartColor] ?? 0) + requestedQuantity;
    const colorLimit = colorStock[cartColor] ?? 0;
    if (nextColorQuantity > colorLimit) {
      const message = `موجودی رنگ ${cartColor} کافی نیست.`;
      notifyCartError(message);
      throw new Error(message);
    }
    nextSelection[cartColor] = nextColorQuantity;
  }

  const nextQuantity = hasColorStock
    ? colorSelectionTotal(nextSelection) || clampCartQuantity(product, (existing?.quantity ?? 0) + requestedQuantity)
    : clampCartQuantity(product, (existing?.quantity ?? 0) + requestedQuantity);

  if (nextQuantity <= 0) {
    const message = "محصول ناموجود است.";
    notifyCartError(message);
    throw new Error(message);
  }

  if (nextQuantity > stockLimit) {
    const message = "موجودی محصول کافی نیست.";
    notifyCartError(message);
    throw new Error(message);
  }

  const nextCart = existing
    ? currentCart.map((item) =>
        getItemKey(item) === key
          ? {
              ...item,
              quantity: nextQuantity,
              selectedColor: serializeColorSelection(nextSelection) || item.selectedColor || "",
              selectedColors: nextSelection,
              colorStock: product.colorStock,
              stockQuantity: product.stockQuantity,
              isAvailable: product.isAvailable,
            }
          : item
      )
    : [
        ...currentCart,
        normalizeCartItem(
          {
            ...product,
            productId,
            selectedColor: serializeColorSelection(nextSelection) || cartColor,
            selectedColors: nextSelection,
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

export async function updateCartColorQuantity(
  target: CartItemRecord,
  color: string,
  quantity: number,
  options?: { notify?: boolean }
) {
  const key = getItemKey(target);
  const currentCart = readLocalCart();
  const colorName = String(color ?? "").trim();
  if (!colorName) return currentCart;

  const nextCart = currentCart.flatMap((item) => {
    if (getItemKey(item) !== key) return [item];

    const targetColorStock = normalizeCartColorStock(target.colorStock);
    const colorStock = Object.keys(targetColorStock).length > 0
      ? targetColorStock
      : normalizeCartColorStock(item.colorStock);
    const stockLimit = getStockLimit(item);
    const currentSelection = getCartItemColorSelection(item);
    const nextSelection = { ...currentSelection };
    const totalWithoutColor = colorSelectionTotal(currentSelection) - (currentSelection[colorName] ?? 0);
    const colorLimit = colorStock[colorName] ?? stockLimit;
    const totalLimit = Number.isFinite(stockLimit) ? Math.max(0, stockLimit - totalWithoutColor) : Number.POSITIVE_INFINITY;
    const nextColorQuantity = Math.max(0, Math.min(Math.round(Number(quantity) || 0), colorLimit, totalLimit));

    if (nextColorQuantity > 0) {
      nextSelection[colorName] = nextColorQuantity;
    } else {
      delete nextSelection[colorName];
    }

    const nextQuantity = colorSelectionTotal(nextSelection);
    if (nextQuantity <= 0) return [];

    return [{
      ...item,
      selectedColors: nextSelection,
      selectedColor: serializeColorSelection(nextSelection),
      quantity: nextQuantity,
    }];
  });

  const savedItems = await persistCart(nextCart);
  if (options?.notify !== false) {
    notifyCartSuccess("سبد خرید به‌روزرسانی شد.");
  }
  return savedItems;
}

export async function removeCartItem(target: CartItemRecord) {
  return updateCartQuantity(target, 0);
}

type SelectCartItemColorOptions = {
  items?: CartItemRecord[];
  user?: AuthClientUser | null;
};

export function selectCartItemColor(
  target: CartItemRecord,
  color: string,
  options?: SelectCartItemColorOptions
) {
  const user = options && "user" in options ? options.user : readCachedAuthUser();
  const key = getItemKey(target);
  const colorName = String(color ?? "").trim();
  const currentCart = options?.items ?? readLocalCart(user);
  if (!colorName) return currentCart;

  const nextCart = currentCart.map((item) => {
    if (getItemKey(item) !== key) return item;

    const targetColorStock = normalizeCartColorStock(target.colorStock);
    const colorStock = Object.keys(targetColorStock).length > 0
      ? targetColorStock
      : normalizeCartColorStock(item.colorStock);
    if ((colorStock[colorName] ?? 0) < item.quantity) return item;

    const selectedColors = { [colorName]: item.quantity };
    return {
      ...item,
      selectedColors,
      selectedColor: serializeColorSelection(selectedColors),
    };
  });

  beginCartMutation(user);
  writeLocalCart(nextCart, user);
  return nextCart;
}

export async function clearCart() {
  const savedItems = await persistCart([]);
  notifyCartSuccess("سبد خرید خالی شد.");
  return savedItems;
}

export async function getCheckoutQuote(options: CheckoutOptions): Promise<CheckoutQuote> {
  const res = await fetch("/api/cart/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false || !data?.data?.quote) {
    throw new Error(data?.message || data?.error || "استعلام مبلغ پرداخت انجام نشد.");
  }
  return data.data.quote as CheckoutQuote;
}

export async function checkoutCart(profile = readUserProfile(), options: CheckoutOptions = { shippingMethod: "pickup" }) {
  const user = readCachedAuthUser();
  beginCartMutation(user);
  if (!profile || !isUserProfileComplete(profile)) {
    const message = "برای این عملیات اطلاعات پروفایل باید کامل باشد.";
    notifyCartError(message);
    throw new Error(message);
  }

  const res = await fetch("/api/cart/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "ثبت سفارش ناموفق بود.");
  }

  markCartSynchronized(user);
  writeLocalCart([], user);
  return [];
}

export function getCartCount(items = readLocalCart()) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
