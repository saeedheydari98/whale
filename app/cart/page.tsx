"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { IoBagHandleOutline, IoCardOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../design-system/components/ui/button";
import { CustomEmptyState } from "../design-system/components/ui/empty-state";
import { CustomInput } from "../design-system/components/ui/input";
import { ImagePreview } from "../design-system/components/ui/image-preview";
import { CustomModal } from "../design-system/components/ui/modal";
import {
  CART_UPDATED_EVENT,
  clearCart as clearCartData,
  checkoutCart,
  getCartItemColorSelection,
  getCart,
  persistCart,
  readLocalCart,
  removeCartItem,
  selectCartItemColor,
  updateCartColorQuantity,
  updateCartQuantity,
  type CartItemRecord,
} from "@/lib/cart-client";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import {
  EMPTY_USER_PROFILE,
  isUserProfileComplete,
  readUserProfile,
  saveUserProfile,
  writeUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import { useAppUser } from "@/lib/app-user-context";
import { readCachedAuthUser, type AuthClientUser } from "@/lib/auth-client";
import {
  formatCurrencyWithCommas as formatPrice,
  getDiscountPercentValue as getDiscountPercent,
  getFinalPriceValue as getFinalPrice,
  readFormattedPriceNumber as readPriceNumber,
} from "@/lib/price-format";
import { getProductDetail } from "@/lib/products-client";
import { ColorStockDots, normalizeStockEntries } from "../design-system/components/ui/color-stock-dots";

const NAME_PATTERN = /^[\p{L}][\p{L}\s'-]{1,49}$/u;
const PHONE_PATTERN = /^09\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CartPage() {
  const [items, setItems] = useState<CartItemRecord[]>([]);
  const [previewImage, setPreviewImage] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showProfileRequiredErrors, setShowProfileRequiredErrors] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isCheckoutSuccessOpen, setIsCheckoutSuccessOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthClientUser | null>(null);
  const profileFormRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: appUserData } = useAppUser();
  const appUser = appUserData?.user ?? null;
  const appUserKey = useMemo(
    () => [
      appUser?.id ?? "",
      appUser?.username ?? "",
      appUser?.role ?? "",
    ].join("|"),
    [appUser?.id, appUser?.role, appUser?.username]
  );
  const productQueries = useQueries({
    queries: items.map((item) => {
      const productId = item.productId ?? item.id;
      return {
        queryKey: ["catalog", "product", productId],
        queryFn: () => getProductDetail(productId ?? ""),
        enabled: Boolean(productId),
      };
    }),
  });
  const products = useMemo(
    () => productQueries
      .map((query) => query.data?.product)
      .filter((product): product is NonNullable<typeof product> => Boolean(product)),
    [productQueries]
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const user = appUser ?? readCachedAuthUser();
      const localProfile = readUserProfile();
      setAuthUser(user);
      setItems(readLocalCart(user));
      const snapshot = await getCart(user);
      const savedProfile = localProfile ?? snapshot.profile;
      if (cancelled) return;
      if (snapshot.profile) writeUserProfile(snapshot.profile, { emit: false });
      setItems(snapshot.items);
      setProfile(savedProfile);
      setProfileDraft(savedProfile ?? snapshot.profile ?? EMPTY_USER_PROFILE);
      setAuthUser(user);
    })();

    return () => {
      cancelled = true;
    };
  }, [appUserKey]);

  useEffect(() => {
    const syncLocalCart = () => setItems(readLocalCart(authUser));
    window.addEventListener(CART_UPDATED_EVENT, syncLocalCart);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncLocalCart);
    };
  }, [authUser]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  const cartTotal = useMemo(
    () => items.reduce((sum, item) => sum + readPriceNumber(getFinalPrice(item)) * item.quantity, 0),
    [items]
  );
  const hasIncompleteColorSelection = useMemo(() => items.some((item) => {
    const product = products.find((entry) => String(entry.id) === String(item.productId ?? item.id));
    const colorEntries = normalizeStockEntries(product?.colorStock ?? item.colorStock);
    if (colorEntries.length === 0) return false;

    const selectedEntries = Object.entries(getCartItemColorSelection(item))
      .filter(([, count]) => count > 0);
    if (selectedEntries.length !== 1) return true;

    const [selectedColor, selectedCount] = selectedEntries[0];
    const availableCount = colorEntries.find((entry) => entry.color === selectedColor)?.count ?? 0;
    return selectedCount !== item.quantity || availableCount < item.quantity;
  }), [items, products]);

  const removeItem = async (target: CartItemRecord) => {
    const nextItems = await removeCartItem(target);
    setItems(nextItems);
  };

  const updateQuantity = async (target: CartItemRecord, nextQuantity: number) => {
    const colorEntries = Object.entries(getCartItemColorSelection(target))
      .filter(([, count]) => count > 0);
    const hasColorStock = normalizeStockEntries(target.colorStock).length > 0;
    const activeColor = colorEntries.length === 1 && colorEntries[0][1] === target.quantity
      ? colorEntries[0][0]
      : "";
    if (hasColorStock && !activeColor) return;

    const nextItems = hasColorStock
      ? await updateCartColorQuantity(target, activeColor, nextQuantity)
      : await updateCartQuantity(target, nextQuantity);
    setItems(nextItems);
  };

  const selectItemColor = (target: CartItemRecord, color: string) => {
    setItems(selectCartItemColor(target, color, { items, user: authUser }));
  };

  const clearCart = async () => {
    if (isCheckoutLoading) return;
    const nextItems = await clearCartData();
    setItems(nextItems);
  };

  const openImagePreview = (imageUrl?: string) => {
    if (!imageUrl) return;
    setPreviewImage(imageUrl);
  };

  const updateProfileDraft = (patch: Partial<UserProfile>) => {
    setProfileDraft((current) => ({ ...current, ...patch }));
    setProfileError("");
  };

  const isProfileDraftValid = () => (
    isUserProfileComplete(profileDraft) &&
    NAME_PATTERN.test(profileDraft.firstName.trim()) &&
    NAME_PATTERN.test(profileDraft.lastName.trim()) &&
    PHONE_PATTERN.test(profileDraft.phone.trim()) &&
    (!profileDraft.email.trim() || EMAIL_PATTERN.test(profileDraft.email.trim())) &&
    profileDraft.address.trim().length >= 5 &&
    profileDraft.address.trim().length <= 200
  );

  const saveProfileDraft = () => {
    if (!isProfileDraftValid()) {
      setShowProfileRequiredErrors(true);
      setProfileError("لطفا اطلاعات پروفایل را به‌درستی وارد کنید.");
      window.setTimeout(() => scrollToFirstInvalidField(profileFormRef.current), 0);
      return;
    }

    const nextProfile = {
      firstName: profileDraft.firstName.trim(),
      lastName: profileDraft.lastName.trim(),
      phone: profileDraft.phone.trim(),
      email: profileDraft.email.trim().toLowerCase(),
      address: profileDraft.address.trim(),
      isAdminUnlocked: profileDraft.isAdminUnlocked,
    };

    void saveUserProfile(nextProfile)
      .then((savedProfile) => {
        writeUserProfile(savedProfile);
        void persistCart(items, savedProfile).then(setItems);
        setProfile(savedProfile);
        setProfileDraft(savedProfile);
        setShowProfileRequiredErrors(false);
        setIsProfileModalOpen(false);
        setCheckoutMessage("اطلاعات شما ذخیره شد و سبد خرید همگام‌سازی شد.");
      })
      .catch(() => setProfileError("ذخیره اطلاعات پروفایل ناموفق بود."));
  };

  const continueCheckout = () => {
    if (isCheckoutLoading) return;
    if (!authUser) {
      router.push("/panel/user?auth=register");
      return;
    }

    const savedProfile = readUserProfile() ?? profile;

    if (!savedProfile) {
      setProfileDraft(profile ?? EMPTY_USER_PROFILE);
      setProfileError("");
      setIsProfileModalOpen(true);
      return;
    }

    setProfile(savedProfile);
    const purchasedItems = [...items];
    setIsCheckoutLoading(true);
    setCheckoutMessage("");
    void persistCart(items, savedProfile)
      .then(() => checkoutCart(savedProfile))
      .then((nextItems) => {
        purchasedItems.forEach((item) => {
          if (item.productId) {
            localStorage.setItem(`purchased:${item.productId}`, "1");
          }
        });
        setItems(nextItems);
        setCheckoutMessage("پرداخت با موفقیت انجام شد.");
        setIsCheckoutSuccessOpen(true);
      })
      .catch((error) => {
        setCheckoutMessage(error instanceof Error ? error.message : "پرداخت ناموفق بود.");
      })
      .finally(() => {
        setIsCheckoutLoading(false);
      });
  };

  return (
    <main className="min-h-full bg-primary-base text-primary-text">
      <section className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3 border-b border-primary-border pb-4">
          <div>
            <div className="text-3xl font-bold">سبد خرید</div>
            <div className="text-sm text-secondary-text">{totalItems} کالا در سبد خرید</div>
            {items.length > 0 && (
              <div className="mt-1 text-base font-bold text-primary">
                مجموع: {formatPrice(cartTotal)}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <CustomButton
                size="sm"
                variant="info"
                icon={<IoCardOutline />}
                isLoading={isCheckoutLoading}
                loadingText="در حال پرداخت"
                disabled={isCheckoutLoading || hasIncompleteColorSelection}
                onClick={continueCheckout}
              >
                پرداخت
              </CustomButton>
              <CustomButton variant="danger" size="sm" disabled={isCheckoutLoading} onClick={clearCart}>
                خالی کردن سبد
              </CustomButton>
              {hasIncompleteColorSelection ? (
                <span className="text-xs font-semibold text-danger-text-nomode">
                  برای پرداخت، رنگ هر محصول را انتخاب کنید.
                </span>
              ) : null}
            </div>
          )}
        </div>

        {checkoutMessage ? (
          <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
            {checkoutMessage}
          </div>
        ) : null}

        {items.length === 0 ? (
          <CustomEmptyState description="سبد خرید شما خالی است." />
        ) : (
          <div className="grid w-full max-w-5xl self-center grid-cols-1 gap-3 lg:grid-cols-2">
            {items.map((item, index) => {
              const product = products.find((entry) => String(entry.id) === String(item.productId ?? item.id));
              const stockValue = product?.stockQuantity ?? item.stockQuantity;
              const stockLimit = Number(stockValue);
              const hasStockLimit = Number.isFinite(stockLimit);
              const normalizedStockLimit = hasStockLimit ? Math.max(0, Math.round(stockLimit)) : Number.POSITIVE_INFINITY;
              const productColorStock = product?.colorStock ?? item.colorStock;
              const colorEntries = normalizeStockEntries(productColorStock);
              const hasColorStock = colorEntries.length > 0;
              const colorSelection = getCartItemColorSelection({ ...item, colorStock: productColorStock });
              const selectedColorEntries = Object.entries(colorSelection).filter(([, count]) => count > 0);
              const activeColor = selectedColorEntries.length === 1
                && selectedColorEntries[0][1] === item.quantity
                ? selectedColorEntries[0][0]
                : "";
              const isAvailable = (product?.isAvailable ?? item.isAvailable) !== false
                && normalizedStockLimit > 0;
              const activeColorStock = colorEntries.find((entry) => entry.color === activeColor)?.count ?? 0;
              const syncedItem = {
                ...item,
                selectedColors: colorSelection,
                selectedColor: item.selectedColor,
                colorStock: productColorStock,
                isAvailable,
                stockQuantity: hasStockLimit ? normalizedStockLimit : item.stockQuantity,
              };
              const canIncrease = !isCheckoutLoading
                && isAvailable
                && item.quantity < normalizedStockLimit
                && (!hasColorStock || (Boolean(activeColor) && item.quantity < activeColorStock));
              return (
                <article
                  key={String(item.id ?? `${item.title}-${index}-${item.selectedColor ?? ""}`)}
                  className="flex w-full max-w-xl justify-self-center items-center gap-3 rounded-md border border-primary-border bg-primary-card p-2 lg:max-w-none"
                >
                  <button
                    type="button"
                    className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
                    onClick={() => openImagePreview(item.imageUrl || undefined)}
                    disabled={!item.imageUrl}
                    aria-label="باز کردن تصویر محصول"
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <IoBagHandleOutline className="text-2xl text-primary" aria-hidden="true" />
                    )}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="truncate text-sm font-bold">{item.title}</div>
                    {hasColorStock ? (
                      <div className="flex items-center gap-1.5">
                        <ColorStockDots
                          value={productColorStock}
                          selectedColor={activeColor}
                          onSelect={(color) => selectItemColor(syncedItem, color)}
                          disabledUnavailable
                          minimumCount={item.quantity}
                          showCount={false}
                          size="sm"
                        />
                      </div>
                    ) : null}
                    <div className="truncate text-xs font-semibold text-primary">
                      {item.originalPrice && getDiscountPercent(item) > 0 && (
                        <span className="mr-2 text-danger-text-nomode line-through">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                      {formatPrice(getFinalPrice(item))} × {item.quantity}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-1">
                    <div className="flex items-center gap-1">
                      <CustomButton
                        variant="neutral"
                        size="sm"
                        className="h-8 min-w-8 p-0"
                        disabled={!canIncrease}
                        onClick={() => updateQuantity(syncedItem, item.quantity + 1)}
                      >
                        +
                      </CustomButton>
                      <span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <CustomButton
                        variant="neutral"
                        size="sm"
                        className="h-8 min-w-8 p-0"
                        disabled={isCheckoutLoading || (hasColorStock && !activeColor)}
                        onClick={() => updateQuantity(syncedItem, item.quantity - 1)}
                      >
                        -
                      </CustomButton>
                    </div>
                    <CustomButton
                      variant="danger"
                      size="sm"
                      icon={<IoTrashOutline />}
                      className="h-8"
                      fullWidth
                      disabled={isCheckoutLoading}
                      onClick={() => removeItem(item)}
                      aria-label="حذف محصول"
                    >
                      حذف
                    </CustomButton>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />

        <CustomModal
          open={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title="اطلاعات تحویل سفارش"
          rounded="lg"
          shadow="lg"
        >
          <div className="flex flex-col gap-3">
            <div className="text-sm text-secondary-text">
              اطلاعات تحویل سفارش را وارد کنید.
            </div>
            <div ref={profileFormRef} className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <CustomInput
                  value={profileDraft.firstName}
                  pattern="[\p{L}][\p{L}\s'-]{1,49}"
                  placeholder="نام"
                  required
                  invalid={showProfileRequiredErrors && !NAME_PATTERN.test(profileDraft.firstName.trim())}
                  aria-label="نام"
                  onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <CustomInput
                  value={profileDraft.lastName}
                  pattern="[\p{L}][\p{L}\s'-]{1,49}"
                  placeholder="نام خانوادگی"
                  required
                  invalid={showProfileRequiredErrors && !NAME_PATTERN.test(profileDraft.lastName.trim())}
                  aria-label="نام خانوادگی"
                  onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <CustomInput
                  value={profileDraft.phone}
                  pattern="09\d{9}"
                  maxLength={11}
                  placeholder="شماره تماس"
                  required
                  invalid={showProfileRequiredErrors && !PHONE_PATTERN.test(profileDraft.phone.trim())}
                  inputMode="tel"
                  aria-label="شماره تماس"
                  onChange={(event) => updateProfileDraft({ phone: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <CustomInput
                  value={profileDraft.email}
                  type="email"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                  placeholder="ایمیل اختیاری"
                  invalid={showProfileRequiredErrors && Boolean(profileDraft.email.trim()) && !EMAIL_PATTERN.test(profileDraft.email.trim())}
                  aria-label="ایمیل"
                  onChange={(event) => updateProfileDraft({ email: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <CustomInput
                  value={profileDraft.address}
                  placeholder="آدرس کامل"
                  minLength={5}
                  maxLength={200}
                  required
                  invalid={showProfileRequiredErrors && (profileDraft.address.trim().length < 5 || profileDraft.address.trim().length > 200)}
                  aria-label="آدرس"
                  onChange={(event) => updateProfileDraft({ address: event.target.value })}
                />
              </div>
            </div>
            {profileError ? (
              <div className="rounded-md border border-danger-border-nomode bg-primary-base px-3 py-2 text-sm font-semibold text-danger-text-nomode">
                {profileError}
              </div>
            ) : null}
            <CustomButton fullWidth icon={<IoCardOutline />} onClick={saveProfileDraft}>
              ذخیره و ادامه
            </CustomButton>
          </div>
        </CustomModal>

        <CustomModal
          open={isCheckoutSuccessOpen}
          onClose={() => setIsCheckoutSuccessOpen(false)}
          title="خرید تکمیل شد"
          rounded="lg"
          shadow="lg"
        >
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-primary-text">
              خرید شما با موفقیت ثبت شد.
            </div>
            <div className="text-sm text-secondary-text">
              سوابق خریدتان به‌روزرسانی شد.
            </div>
          </div>
        </CustomModal>

      </section>
    </main>
  );
}
