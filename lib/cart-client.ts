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
  updateColorSelection,
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
const GUEST_CART_OWNER_KEY = `${GUEST_CART_STORAGE_KEY}:merge-owner`;

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
const pendingGuestClaims = new Map<string, Promise<CartItemRecord[] | null>>();

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

class CartApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

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
      // Keep draft quantities instead of silently losing units without a chosen color.
      const hasDraftQuantity = Object.keys(getCartItemColorSelection(existing)).length === 0
        || Object.keys(getCartItemColorSelection(item)).length === 0;

      byKey.set(key, {
        ...existing,
        ...item,
        selectedColors: hasDraftQuantity ? {} : mergedSelection,
        selectedColor: hasDraftQuantity ? "" : serializeColorSelection(mergedSelection),
        quantity: hasDraftQuantity ? existing.quantity + item.quantity : selectionTotal,
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

type PendingGuestClaim = { guestSnapshot: string; items: CartItemRecord[] };

function hasGuestCartToClaim(user: AuthClientUser | null | undefined) {
  if (typeof window === "undefined" || !user?.id) return false;
  const userKey = getCartStorageKey(user);
  return pendingGuestClaims.has(userKey)
    || localStorage.getItem(GUEST_CART_STORAGE_KEY) !== null
    || localStorage.getItem(CART_STORAGE_KEY) !== null
    || localStorage.getItem(`${userKey}:guest-merge`) !== null;
}

function consumeClaimedGuestCart(snapshot: string) {
  if (localStorage.getItem(GUEST_CART_STORAGE_KEY) === snapshot) {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    return;
  }
  const claimed = new Map(dedupeCartItems(JSON.parse(snapshot).map(normalizeCartItem)).map((item) => [getItemKey(item), item]));
  const remaining = readLocalCart(null).flatMap((item) => {
    const previous = claimed.get(getItemKey(item));
    if (!previous) return [item];
    const selection = getCartItemColorSelection(item);
    const oldSelection = getCartItemColorSelection(previous);
    const selectedColors = Object.fromEntries(Object.entries(selection)
      .map(([color, count]) => [color, Math.max(0, count - (oldSelection[color] ?? 0))])
      .filter(([, count]) => Number(count) > 0)) as CartColorSelection;
    const quantity = Object.keys(selection).length > 0
      ? colorSelectionTotal(selectedColors)
      : Math.max(0, item.quantity - previous.quantity);
    return quantity > 0 ? [{ ...item, quantity, selectedColors, selectedColor: serializeColorSelection(selectedColors) }] : [];
  });
  if (remaining.length) localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(remaining));
  else localStorage.removeItem(GUEST_CART_STORAGE_KEY);
}

export async function claimGuestCartForUser(user: AuthClientUser | null | undefined): Promise<CartItemRecord[] | null> {
  if (typeof window === "undefined" || !user?.id) return null;
  const userKey = getCartStorageKey(user);
  const pending = pendingGuestClaims.get(userKey);
  if (pending) return pending;
  migrateLegacyGuestCart(GUEST_CART_STORAGE_KEY);
  const transferKey = `${userKey}:guest-merge`;
  if (!localStorage.getItem(GUEST_CART_STORAGE_KEY) && !localStorage.getItem(transferKey)) return null;

  const merge = async () => {
    if (getCartStorageKey(readCachedAuthUser()) !== userKey) throw new Error("حساب کاربری تغییر کرده است؛ سبد مهمان حفظ شد.");
    const owner = localStorage.getItem(GUEST_CART_OWNER_KEY);
    if (owner && owner !== userKey) return null;
    let transfer: PendingGuestClaim | null = null;
    const storedTransfer = localStorage.getItem(transferKey);
    if (storedTransfer) {
      try {
        const parsed = JSON.parse(storedTransfer) as PendingGuestClaim;
        if (typeof parsed.guestSnapshot === "string" && Array.isArray(parsed.items)) transfer = parsed;
      } catch { /* Keep the guest cart if a saved transfer is unreadable. */ }
    }
    if (!transfer) {
      const guestSnapshot = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      const guestItems = readLocalCart(null);
      if (!guestSnapshot || guestItems.length === 0) return null;
      const accountCart = await loadCartFromApi({ silent: true });
      if (getCartStorageKey(readCachedAuthUser()) !== userKey) throw new Error("حساب کاربری تغییر کرده است؛ سبد مهمان حفظ شد.");
      transfer = { guestSnapshot, items: dedupeCartItems([...accountCart.items, ...guestItems]) };
      // Persist the exact replacement before sending it. A lost response/reload must
      // retry the same quantities, never add the guest quantities a second time.
      localStorage.setItem(transferKey, JSON.stringify(transfer));
      localStorage.setItem(GUEST_CART_OWNER_KEY, userKey);
    }
    const mutationVersion = beginCartMutation(user);
    try {
      const savedItems = await saveCartToApi(transfer.items, null, { silent: true, guestMergeUserId: Number(user.id) });
      consumeClaimedGuestCart(transfer.guestSnapshot);
      localStorage.removeItem(transferKey);
      localStorage.removeItem(GUEST_CART_OWNER_KEY);
      if (mutationVersion === cartMutationVersion) {
        markCartSynchronized(user);
        writeLocalCart(savedItems, user);
      }
      return savedItems;
    } catch (error) {
      // A confirmed rejection did not write the snapshot. Re-read the server on retry.
      if (error instanceof CartApiError && error.status >= 400 && error.status < 500) {
        localStorage.removeItem(transferKey);
        localStorage.removeItem(GUEST_CART_OWNER_KEY);
      }
      markCartSynchronized(user);
      throw error;
    }
  };
  const request = enqueueCartApiMutation(async () => {
    // Web Locks serialize claims across tabs; the promise map covers callers in this tab.
    return typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("whale:guest-cart-merge", merge)
      : merge();
  }).finally(() => { pendingGuestClaims.delete(userKey); });
  pendingGuestClaims.set(userKey, request);
  return request;
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
    throw new Error(data?.showMessage || "بارگذاری سبد خرید ناموفق بود.");
  }
  const apiItems = readCartItemsFromApiData(data);
  return {
    items: Array.isArray(apiItems) ? apiItems.map(normalizeCartItem) : [],
    profile: readCartProfileFromApiData(data),
  };
}

async function saveCartToApi(items: CartItemRecord[], profile?: UserProfile | null, options?: { silent?: boolean; guestMergeUserId?: number }) {
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.silent ? SILENT_NOTIFICATION_HEADERS : {}),
    },
    body: JSON.stringify({
      ...(canSyncCartToApi(profile) ? { profile } : {}), items,
      ...(options?.guestMergeUserId ? { guestMergeUserId: options.guestMergeUserId } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new CartApiError(data?.showMessage || "ذخیره سبد خرید ناموفق بود.", res.status);
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
    throw new CartApiError(data?.showMessage || "پاک کردن سبد خرید ناموفق بود.", res.status);
  }
  return [];
}

export async function getCart(user: AuthClientUser | null | undefined = readCachedAuthUser()): Promise<CartSnapshot> {
  const profile = readUserProfile();

  if (canUseAccountCart(user)) {
    try {
      const mergedItems = await claimGuestCartForUser(user);
      if (mergedItems) return { items: mergedItems, profile };
    } catch {
      notifyCartError("ادغام سبد خرید انجام نشد؛ کالاهای مهمان محفوظ هستند. دوباره تلاش کنید.");
    }
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

export async function persistCart(
  items: CartItemRecord[],
  profile = readUserProfile(),
  options?: { notify?: boolean; throwOnError?: boolean }
) {
  const user = readCachedAuthUser();
  const previousItems = readLocalCart(user);
  const wasPending = pendingLocalCartKeys.has(getCartStorageKey(user));
  const mutationVersion = beginCartMutation(user);
  const nextItems = dedupeCartItems(items);
  writeLocalCart(nextItems, user);
  const silent = options?.notify === false;

  if (!canUseApiCart(profile, user)) {
    return nextItems;
  }

  try {
    const savedItems = await enqueueCartApiMutation(() => nextItems.length === 0
      ? clearCartFromApi(profile, { silent })
      : saveCartToApi(nextItems, profile, { silent }));
    if (mutationVersion !== cartMutationVersion) return readLocalCart(user);
    markCartSynchronized(user);
    writeLocalCart(savedItems, user);
    return savedItems;
  } catch (error) {
    const failure = error instanceof CartApiError ? error : new Error("ذخیره سبد خرید انجام نشد؛ لطفاً دوباره تلاش کنید.");
    // A rejected mutation must not leave an item that the server refused in the cart.
    // Keep network failures pending for the existing local/offline recovery flow.
    if (error instanceof CartApiError && error.status >= 400 && error.status < 500
      && mutationVersion === cartMutationVersion) {
      writeLocalCart(previousItems, user);
      if (!wasPending) markCartSynchronized(user);
    }
    if (!silent) notifyCartError(failure.message);
    if (options?.throwOnError) throw failure;
    return readLocalCart(user);
  }
}

export async function addProductToCart(product: ProductRecord, quantity = 1, selectedColor: string | CartColorSelection = "") {
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
  const cartColor = typeof selectedColor === "string"
    ? selectedColor.trim() || Object.entries(colorStock).find(([, count]) => count > 0)?.[0] || ""
    : "";
  const requestedColors = typeof selectedColor === "string"
    ? cartColor ? { [cartColor]: Math.max(1, Math.round(Number(quantity) || 1)) } : {}
    : normalizeColorSelection(selectedColor);
  const requestedQuantity = colorSelectionTotal(requestedColors) || Math.max(1, Math.round(Number(quantity) || 1));

  if (hasColorStock && colorSelectionTotal(requestedColors) <= 0) {
    const message = "هیچ رنگ موجودی برای این محصول وجود ندارد.";
    notifyCartError(message);
    throw new Error(message);
  }

  const cartUser = readCachedAuthUser() ?? await fetchCurrentUser({ allowStaleOnError: true });
  await claimGuestCartForUser(cartUser);
  const currentCart = readLocalCart(cartUser);
  const existing = currentCart.find((item) => getItemKey(item) === key);
  const existingSelection = existing ? getCartItemColorSelection(existing) : {};
  const nextSelection = { ...existingSelection };

  for (const [color, count] of hasColorStock ? Object.entries(requestedColors) : []) {
    const nextColorQuantity = (nextSelection[color] ?? 0) + count;
    const colorLimit = colorStock[color] ?? 0;
    if (nextColorQuantity > colorLimit) {
      const message = `موجودی رنگ ${color} کافی نیست.`;
      notifyCartError(message);
      throw new Error(message);
    }
    nextSelection[color] = nextColorQuantity;
  }

  const nextQuantity = hasColorStock
    ? colorSelectionTotal(nextSelection) || clampCartQuantity(product, (existing?.quantity ?? 0) + requestedQuantity)
    : clampCartQuantity(product, (existing?.quantity ?? 0) + requestedQuantity);

  if (nextQuantity <= 0) {
    const message = "محصول ناموجود است.";
    notifyCartError(message);
    throw new Error(message);
  }

  if (nextQuantity > stockLimit || (!hasColorStock && (existing?.quantity ?? 0) + requestedQuantity > stockLimit)) {
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

  try {
    // One explicit result message for both guest and account carts, including network errors.
    const savedItems = await persistCart(nextCart, readUserProfile(), { notify: false, throwOnError: true });
    notifyCartSuccess(`${product.title} به سبد خرید اضافه شد.`);
    return savedItems;
  } catch (error) {
    notifyCartError(error instanceof Error ? error.message : "افزودن به سبد خرید ناموفق بود.");
    throw error;
  }
}

export async function updateCartQuantity(target: CartItemRecord, quantity: number, options?: { notify?: boolean }) {
  const user = readCachedAuthUser();
  if (hasGuestCartToClaim(user)) await claimGuestCartForUser(user);
  const key = getItemKey(target);
  const currentCart = readLocalCart();
  const nextQuantity = clampCartQuantity(target, quantity);
  const nextCart =
    quantity <= 0 || nextQuantity <= 0
      ? currentCart.filter((item) => getItemKey(item) !== key)
      : currentCart.map((item) =>
          getItemKey(item) === key ? { ...item, quantity: nextQuantity } : item
        );

  const apiNotifies = canUseApiCart(readUserProfile(), readCachedAuthUser());
  const savedItems = await persistCart(nextCart, readUserProfile(), { notify: options?.notify !== false });
  if (options?.notify !== false) {
    if (!apiNotifies) {
      notifyCartSuccess(quantity <= 0 || nextQuantity <= 0 ? "محصول از سبد خرید حذف شد." : "سبد خرید به‌روزرسانی شد.");
    }
  }
  return savedItems;
}

export async function updateCartColorQuantity(
  target: CartItemRecord,
  color: string,
  quantity: number,
  options?: { notify?: boolean }
) {
  const user = readCachedAuthUser();
  if (hasGuestCartToClaim(user)) await claimGuestCartForUser(user);
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
    const stockLimit = getStockLimit(target);
    const currentSelection = getCartItemColorSelection(item);
    const nextSelection = updateColorSelection(currentSelection, colorName, quantity, colorStock, stockLimit);

    const nextQuantity = colorSelectionTotal(nextSelection);
    if (nextQuantity <= 0) return [];

    return [{
      ...item,
      selectedColors: nextSelection,
      selectedColor: serializeColorSelection(nextSelection),
      quantity: nextQuantity,
    }];
  });

  const apiNotifies = canUseApiCart(readUserProfile(), readCachedAuthUser());
  const savedItems = await persistCart(nextCart, readUserProfile(), { notify: options?.notify !== false });
  if (options?.notify !== false) {
    if (!apiNotifies) notifyCartSuccess("سبد خرید به‌روزرسانی شد.");
  }
  return savedItems;
}

export async function removeCartItem(target: CartItemRecord) {
  return updateCartQuantity(target, 0);
}

export async function clearCart() {
  const user = readCachedAuthUser();
  if (hasGuestCartToClaim(user)) await claimGuestCartForUser(user);
  const apiNotifies = canUseApiCart(readUserProfile(), user);
  const savedItems = await persistCart([]);
  if (!apiNotifies) notifyCartSuccess("سبد خرید خالی شد.");
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
    throw new Error(data?.showMessage || "استعلام مبلغ پرداخت انجام نشد.");
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
    throw new Error(data?.showMessage || "ثبت سفارش ناموفق بود.");
  }

  markCartSynchronized(user);
  writeLocalCart([], user);
  return [];
}

export function getCartCount(items = readLocalCart()) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
