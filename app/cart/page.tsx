"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { IoBagHandleOutline, IoCardOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../design-system/components/ui/button";
import { CustomEmptyState } from "../design-system/components/ui/empty-state";
import { CustomInput } from "../design-system/components/ui/input";
import { EmailOtpAuthForm } from "../design-system/components/ui/email-otp-auth-form";
import { ImagePreview } from "../design-system/components/ui/image-preview";
import { CustomModal } from "../design-system/components/ui/modal";
import {
  CART_UPDATED_EVENT,
  clearCart as clearCartData,
  checkoutCart,
  getCheckoutQuote,
  getCartItemColorSelection,
  getCart,
  persistCart,
  readLocalCart,
  removeCartItem,
  selectCartItemColor,
  updateCartColorQuantity,
  updateCartQuantity,
  type CartItemRecord,
  type CheckoutOptions,
  type CheckoutQuote,
} from "@/lib/cart-client";
import {
  fetchUserProfile,
  isUserProfileComplete,
  readUserProfile,
  writeUserProfile,
  type UserProfile,
} from "@/lib/user-profile";
import { useAppUser } from "@/lib/app-user-context";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { readCachedAuthUser, setCachedAuthUser, type AuthClientUser } from "@/lib/auth-client";
import {
  formatAmount as formatPrice,
  getDiscountPercentValue as getDiscountPercent,
  getFinalPriceValue as getFinalPrice,
  readFormattedPriceNumber as readPriceNumber,
} from "@/lib/price-format";
import { getProductDetail } from "@/lib/products-client";
import { ColorStockDots, normalizeStockEntries } from "../design-system/components/ui/color-stock-dots";

export default function CartPage() {
  const [items, setItems] = useState<CartItemRecord[]>([]);
  const [previewImage, setPreviewImage] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  useTransientAppMessage(checkoutMessage);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<CheckoutOptions["shippingMethod"]>("pickup");
  const [discountCode, setDiscountCode] = useState("");
  const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuote | null>(null);
  const [authUser, setAuthUser] = useState<AuthClientUser | null>(null);
  const router = useRouter();
  const { data: appUserData, refresh: refreshAppUser } = useAppUser();
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

  const completeCheckout = async (checkoutItems: CartItemRecord[], savedProfile: UserProfile) => {
    setProfile(savedProfile);
    const purchasedItems = [...checkoutItems];
    setIsCheckoutLoading(true);
    setCheckoutMessage("");
    try {
      await persistCart(checkoutItems, savedProfile);
      const nextItems = await checkoutCart(savedProfile, { shippingMethod, discountCode });
      purchasedItems.forEach((item) => {
        if (item.productId) {
          localStorage.setItem(`purchased:${item.productId}`, "1");
        }
      });
      setItems(nextItems);
      setIsCheckoutModalOpen(false);
      setCheckoutMessage("پرداخت با موفقیت انجام شد.");
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : "پرداخت ناموفق بود.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const requestCheckoutQuote = async (
    nextShippingMethod = shippingMethod,
    nextDiscountCode = discountCode
  ) => {
    setIsCheckoutLoading(true);
    setCheckoutMessage("");
    try {
      const quote = await getCheckoutQuote({
        shippingMethod: nextShippingMethod,
        discountCode: nextDiscountCode,
      });
      setCheckoutQuote(quote);
    } catch (error) {
      setCheckoutQuote(null);
      setCheckoutMessage(error instanceof Error ? error.message : "استعلام مبلغ پرداخت انجام نشد.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const prepareCheckout = async (checkoutItems: CartItemRecord[], savedProfile: UserProfile) => {
    setProfile(savedProfile);
    setIsCheckoutLoading(true);
    setCheckoutMessage("");
    try {
      await persistCart(checkoutItems, savedProfile);
      const quote = await getCheckoutQuote({ shippingMethod: "pickup", discountCode: "" });
      setShippingMethod("pickup");
      setDiscountCode("");
      setCheckoutQuote(quote);
      setIsCheckoutModalOpen(true);
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : "آماده‌سازی پرداخت انجام نشد.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const continueCheckout = async () => {
    if (isCheckoutLoading) return;
    if (!authUser) {
      setIsAuthModalOpen(true);
      return;
    }

    let savedProfile = readUserProfile() ?? profile;
    if (!isUserProfileComplete(savedProfile)) {
      setIsCheckoutLoading(true);
      savedProfile = await fetchUserProfile({ force: true }).catch(() => null);
      setIsCheckoutLoading(false);
    }

    if (!savedProfile || !isUserProfileComplete(savedProfile)) {
      router.push("/panel/user?returnTo=cart");
      return;
    }

    await prepareCheckout(items, savedProfile);
  };

  const handleAuthSuccess = async ({
    user,
    profileComplete,
  }: {
    user: AuthClientUser;
    profileComplete: boolean;
  }) => {
    setCachedAuthUser(user, { emit: false });
    setAuthUser(user);
    setIsAuthModalOpen(false);

    const nextUserData = await refreshAppUser({ force: true });
    const verifiedUser = nextUserData.user ?? user;
    setAuthUser(verifiedUser);

    if (!profileComplete) {
      router.push("/panel/user?returnTo=cart");
      return;
    }

    const [savedProfile, accountCart] = await Promise.all([
      fetchUserProfile({ force: true }).catch(() => null),
      getCart(verifiedUser),
    ]);
    setItems(accountCart.items);
    const checkoutProfile = savedProfile ?? accountCart.profile;

    if (!checkoutProfile || !isUserProfileComplete(checkoutProfile)) {
      router.push("/panel/user?returnTo=cart");
      return;
    }

    setProfile(checkoutProfile);
    await prepareCheckout(accountCart.items, checkoutProfile);
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
                onClick={() => void continueCheckout()}
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
          open={isAuthModalOpen && !authUser}
          onClose={() => setIsAuthModalOpen(false)}
          title="ورود یا ساخت حساب"
          rounded="lg"
          shadow="lg"
        >
          <div className="flex flex-col gap-3">
            <EmailOtpAuthForm onSuccess={handleAuthSuccess} />
          </div>
        </CustomModal>

        <CustomModal
          open={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          title="تأیید و پرداخت"
          rounded="lg"
          shadow="lg"
          isLoading={isCheckoutLoading}
          closeOnBackdrop={!isCheckoutLoading}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-bold text-primary-text"><span>روش تحویل</span></div>
              <div className="flex gap-2">
                <CustomButton
                  fullWidth
                  variant={shippingMethod === "pickup" ? "primary" : "neutral"}
                  disabled={isCheckoutLoading}
                  onClick={() => {
                    setShippingMethod("pickup");
                    void requestCheckoutQuote("pickup", discountCode);
                  }}
                >
                  <span>تحویل حضوری</span>
                </CustomButton>
                <CustomButton
                  fullWidth
                  variant={shippingMethod === "post" ? "primary" : "neutral"}
                  disabled={isCheckoutLoading}
                  onClick={() => {
                    setShippingMethod("post");
                    void requestCheckoutQuote("post", discountCode);
                  }}
                >
                  <span>ارسال با پست ({formatPrice(30000)})</span>
                </CustomButton>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <CustomInput
                value={discountCode}
                inputMode="text"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                label="کد تخفیف ۶ کاراکتری"
                onChange={(event) => {
                  setDiscountCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                  setCheckoutQuote(null);
                  setCheckoutMessage("");
                }}
              />
              <CustomButton
                variant="neutral"
                disabled={isCheckoutLoading || (discountCode.length > 0 && discountCode.length !== 6)}
                onClick={() => void requestCheckoutQuote()}
              >
                <span>استعلام</span>
              </CustomButton>
            </div>


            {checkoutQuote ? (
              <div className="flex flex-col gap-2 border-t border-primary-border pt-3">
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-secondary-text">مبلغ کالاها</span><span className="text-sm font-bold">{formatPrice(checkoutQuote.subtotal)}</span></div>
                {checkoutQuote.discountAmount > 0 ? <div className="flex items-center justify-between gap-3"><span className="text-sm text-secondary-text">تخفیف کد</span><span className="text-sm font-bold text-success-text">− {formatPrice(checkoutQuote.discountAmount)}</span></div> : null}
                {checkoutQuote.discountType === "free_shipping" ? <div className="flex items-center justify-between gap-3"><span className="text-sm text-secondary-text">کد ارسال رایگان</span><span className="text-sm font-bold text-success-text">اعمال شد</span></div> : null}
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-secondary-text">هزینه ارسال</span><span className="text-sm font-bold">{checkoutQuote.shippingAmount > 0 ? formatPrice(checkoutQuote.shippingAmount) : "رایگان"}</span></div>
                {checkoutQuote.walletAmount > 0 ? <div className="flex items-center justify-between gap-3"><span className="text-sm text-secondary-text">کسر از کیف پول</span><span className="text-sm font-bold text-success-text">− {formatPrice(checkoutQuote.walletAmount)}</span></div> : null}
                <div className="flex items-center justify-between gap-3 border-t border-primary-border pt-2"><span className="text-base font-bold">مبلغ نهایی</span><span className="text-lg font-bold text-primary">{formatPrice(checkoutQuote.total)}</span></div>
                {checkoutQuote.cashbackEarned > 0 ? <span className="text-xs font-semibold text-success-text">پس از این خرید {formatPrice(checkoutQuote.cashbackEarned)} به کیف پول شما برمی‌گردد.</span> : null}
              </div>
            ) : null}

            <CustomButton
              fullWidth
              variant="success"
              icon={<IoCardOutline />}
              isLoading={isCheckoutLoading}
              disabled={!checkoutQuote || isCheckoutLoading}
              onClick={() => profile ? void completeCheckout(items, profile) : undefined}
            >
              <span>پرداخت مبلغ نهایی</span>
            </CustomButton>
          </div>
        </CustomModal>

      </section>
    </main>
  );
}
