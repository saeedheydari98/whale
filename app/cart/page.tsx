"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { IoBagHandleOutline, IoCardOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../design-system/components/ui/button";
import { CustomInput } from "../design-system/components/ui/input";
import { CustomModal } from "../design-system/components/ui/modal";
import { RequiredLabel } from "../design-system/components/ui/required-label";
import {
  CART_UPDATED_EVENT,
  clearCart as clearCartData,
  checkoutCart,
  getCart,
  persistCart,
  readLocalCart,
  removeCartItem,
  updateCartQuantity,
  type CartItemRecord,
} from "@/lib/cart-client";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import {
  EMPTY_USER_PROFILE,
  fetchUserProfile,
  isUserProfileComplete,
  readUserProfile,
  saveUserProfile,
  writeUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import { fetchCurrentUser } from "@/lib/auth-client";
import { getProductDetail } from "@/lib/products-client";
import { isValidPastPersianDate, normalizePersianDate } from "@/lib/persian-date";
import ColorStockDots from "../design-system/components/ui/color-stock-dots";

function getFinalPrice(item: CartItemRecord) {
  return item.discountPrice || item.price;
}

function formatPrice(value?: string | number) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || !normalized) {
    return String(value || "");
  }

  return `$${parsed.toLocaleString("en-US")}`;
}

function readPriceNumber(value?: string) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDiscountPercent(item: CartItemRecord) {
  const percent = Number(item.discountPercent);
  return Number.isFinite(percent) && percent > 0 ? Math.round(percent) : 0;
}

const NAME_PATTERN = /^[\p{L}][\p{L}\s'-]{1,49}$/u;
const NATIONAL_ID_PATTERN = /^\d{10}$/;
const PHONE_PATTERN = /^09\d{9}$/;

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
  const [authUser, setAuthUser] = useState<any>(null);
  const profileFormRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
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
      const snapshot = await getCart();
      const savedProfile = await fetchUserProfile().catch(() => snapshot.profile);
      const user = await fetchCurrentUser();
      if (cancelled) return;
      setItems(snapshot.items);
      setProfile(savedProfile);
      setProfileDraft(savedProfile ?? snapshot.profile ?? EMPTY_USER_PROFILE);
      setAuthUser(user);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncLocalCart = () => setItems(readLocalCart());
    window.addEventListener(CART_UPDATED_EVENT, syncLocalCart);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncLocalCart);
    };
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  const cartTotal = useMemo(
    () => items.reduce((sum, item) => sum + readPriceNumber(getFinalPrice(item)) * item.quantity, 0),
    [items]
  );

  const removeItem = async (target: CartItemRecord) => {
    const nextItems = await removeCartItem(target);
    setItems(nextItems);
  };

  const updateQuantity = async (target: CartItemRecord, nextQuantity: number) => {
    const nextItems = await updateCartQuantity(target, nextQuantity);
    setItems(nextItems);
  };

  const updateItemColor = async (targetIndex: number, nextColor: string) => {
    const nextItems = items.map((item, index) =>
      index === targetIndex ? { ...item, selectedColor: nextColor } : item
    );
    setItems(nextItems);
    const savedItems = await persistCart(nextItems, readUserProfile());
    setItems(savedItems);
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
    NATIONAL_ID_PATTERN.test(profileDraft.nationalId.trim()) &&
    PHONE_PATTERN.test(profileDraft.phone.trim()) &&
    profileDraft.address.trim().length >= 5 &&
    profileDraft.address.trim().length <= 200 &&
    isValidPastPersianDate(profileDraft.birthDate)
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
      nationalId: profileDraft.nationalId.trim(),
      birthDate: normalizePersianDate(profileDraft.birthDate),
      phone: profileDraft.phone.trim(),
      address: profileDraft.address.trim(),
      themeMode: profileDraft.themeMode,
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

    const savedProfile = readUserProfile();

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
        setCheckoutMessage("پرداخت با موفقیت انجام شد و موجودی به‌روزرسانی شد.");
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
    <main className="min-h-screen bg-primary-base text-primary-text">
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
                onClick={continueCheckout}
              >
                پرداخت
              </CustomButton>
              <CustomButton variant="danger" size="sm" disabled={isCheckoutLoading} onClick={clearCart}>
                خالی کردن سبد
              </CustomButton>
            </div>
          )}
        </div>

        {checkoutMessage ? (
          <div className="rounded-md border border-primary-border bg-primary-card px-4 py-2 text-sm font-semibold text-primary">
            {checkoutMessage}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-lg border border-primary-border bg-primary-card p-6 text-sm text-secondary-text">
            سبد خرید شما خالی است.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item, index) => {
              const product = products.find((entry) => String(entry.id) === String(item.productId ?? item.id));
              const stockValue = product?.stockQuantity ?? item.stockQuantity;
              const stockLimit = Number(stockValue);
              const hasStockLimit = Number.isFinite(stockLimit);
              const isAvailable = (product?.isAvailable ?? item.isAvailable) !== false
                && (!hasStockLimit || stockLimit > 0);
              const syncedItem = {
                ...item,
                isAvailable,
                stockQuantity: hasStockLimit ? stockLimit : item.stockQuantity,
              };
              const canIncrease = !isCheckoutLoading
                && isAvailable
                && (!hasStockLimit || item.quantity < stockLimit);
              return (
                <article
                  key={String(item.id ?? `${item.title}-${index}-${item.selectedColor ?? ""}`)}
                  className="grid gap-4 rounded-lg border border-primary-border bg-primary-card p-4 sm:grid-cols-[120px_1fr_auto]"
                >
                  <button
                    type="button"
                    className="flex h-28 items-center justify-center overflow-hidden rounded-md bg-primary-media"
                    onClick={() => openImagePreview(item.imageUrl || undefined)}
                    disabled={!item.imageUrl}
                    aria-label="باز کردن تصویر محصول"
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <IoBagHandleOutline className="text-4xl text-primary" aria-hidden="true" />
                    )}
                  </button>
                  <div className="grid gap-2">
                    <div className="text-lg font-bold">{item.title}</div>
                    <div className="text-sm text-secondary-text">{item.description}</div>
                    {item.selectedColor ? (
                      <span className="text-xs font-semibold text-secondary-text">
                        رنگ: {item.selectedColor}
                      </span>
                    ) : null}
                    {product?.colorStock ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-secondary-text">انتخاب رنگ</span>
                        <ColorStockDots
                          value={product.colorStock}
                          selectedColor={item.selectedColor ?? ""}
                          onSelect={(color) => void updateItemColor(index, color)}
                          disabledUnavailable
                          size="sm"
                        />
                      </div>
                    ) : null}
                    <div className="text-sm font-semibold text-primary">
                      {item.originalPrice && getDiscountPercent(item) > 0 && (
                        <span className="mr-2 text-danger-text-nomode line-through">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                      {formatPrice(getFinalPrice(item))} × {item.quantity}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <CustomButton
                        variant="neutral"
                        size="sm"
                        disabled={!canIncrease}
                        onClick={() => updateQuantity(syncedItem, item.quantity + 1)}
                      >
                        +
                      </CustomButton>
                      <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <CustomButton
                        variant="neutral"
                        size="sm"
                        disabled={isCheckoutLoading}
                        onClick={() => updateQuantity(syncedItem, item.quantity - 1)}
                      >
                        -
                      </CustomButton>
                    </div>
                    <CustomButton
                      variant="danger"
                      size="sm"
                      icon={<IoTrashOutline />}
                      disabled={isCheckoutLoading}
                      onClick={() => removeItem(item)}
                    >
                      حذف
                    </CustomButton>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <CustomModal
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage("")}
          title="تصویر محصول"
          rounded="lg"
          shadow="lg"
        >
          <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-md bg-primary-base">
            {previewImage && (
              <img
                src={previewImage}
                alt="پیش‌نمایش تصویر محصول"
                className="max-h-[75vh] w-full object-contain"
              />
            )}
          </div>
        </CustomModal>

        <CustomModal
          open={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title="اطلاعات تحویل سفارش"
          rounded="lg"
          shadow="lg"
        >
          <div className="flex flex-col gap-3">
            <div className="text-sm text-secondary-text">
              برای تکمیل خرید، اطلاعات ضروری حساب و ارسال سفارش را وارد کنید.
            </div>
            <div ref={profileFormRef} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <RequiredLabel required className="text-primary-text">نام</RequiredLabel>
                <CustomInput
                  value={profileDraft.firstName}
                  pattern="[\p{L}][\p{L}\s'-]{1,49}"
                  placeholder="نام"
                  required
                  invalid={showProfileRequiredErrors && !NAME_PATTERN.test(profileDraft.firstName.trim())}
                  showLabel={false}
                  aria-label="نام"
                  onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <RequiredLabel required className="text-primary-text">نام خانوادگی</RequiredLabel>
                <CustomInput
                  value={profileDraft.lastName}
                  pattern="[\p{L}][\p{L}\s'-]{1,49}"
                  placeholder="نام خانوادگی"
                  required
                  invalid={showProfileRequiredErrors && !NAME_PATTERN.test(profileDraft.lastName.trim())}
                  showLabel={false}
                  aria-label="نام خانوادگی"
                  onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <RequiredLabel required className="text-primary-text">کد ملی</RequiredLabel>
                <CustomInput
                  value={profileDraft.nationalId}
                  pattern="\d{10}"
                  maxLength={10}
                  placeholder="کد ملی"
                  required
                  invalid={showProfileRequiredErrors && !NATIONAL_ID_PATTERN.test(profileDraft.nationalId.trim())}
                  showLabel={false}
                  inputMode="numeric"
                  aria-label="کد ملی"
                  onChange={(event) => updateProfileDraft({ nationalId: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <RequiredLabel required className="text-primary-text">تاریخ تولد</RequiredLabel>
                <CustomInput
                  value={profileDraft.birthDate}
                  placeholder="1370/01/01"
                  pattern="(13|14)[0-9]{2}/[0-9]{2}/[0-9]{2}"
                  inputMode="numeric"
                  required
                  invalid={showProfileRequiredErrors && !isValidPastPersianDate(profileDraft.birthDate)}
                  showLabel={false}
                  aria-label="تاریخ تولد"
                  onChange={(event) => updateProfileDraft({ birthDate: normalizePersianDate(event.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <RequiredLabel required className="text-primary-text">شماره تماس</RequiredLabel>
                <CustomInput
                  value={profileDraft.phone}
                  pattern="09\d{9}"
                  maxLength={11}
                  placeholder="شماره تماس"
                  required
                  invalid={showProfileRequiredErrors && !PHONE_PATTERN.test(profileDraft.phone.trim())}
                  showLabel={false}
                  inputMode="tel"
                  aria-label="شماره تماس"
                  onChange={(event) => updateProfileDraft({ phone: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <RequiredLabel required className="text-primary-text">آدرس</RequiredLabel>
                <CustomInput
                  value={profileDraft.address}
                  placeholder="آدرس کامل"
                  minLength={5}
                  maxLength={200}
                  required
                  invalid={showProfileRequiredErrors && (profileDraft.address.trim().length < 5 || profileDraft.address.trim().length > 200)}
                  showLabel={false}
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
              محصولات به سوابق خرید شما اضافه شدند و موجودی فروشگاه به‌روزرسانی شد.
            </div>
          </div>
        </CustomModal>

      </section>
    </main>
  );
}
