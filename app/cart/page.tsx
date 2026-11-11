"use client";

import { CustomActionButton } from "@/app/design-system/components/ui/action";
import { collectionCardClasses } from "@/app/design-system/variants/collection-card.variant";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { IoBagHandleOutline, IoCardOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../design-system/components/ui/button";
import { CustomTabs } from "../design-system/components/ui/tabs";
import { CustomEmptyState } from "../design-system/components/ui/empty-state";
import { CustomInput } from "../design-system/components/ui/input";
import { EmailOtpAuthForm } from "../design-system/components/ui/email-otp-auth-form";
import { ImagePreview } from "../design-system/components/ui/image-preview";
import { AppImage } from "../design-system/components/ui/app-image";
import { AppHeading } from "../design-system/components/ui/text";
import { CustomModal } from "../design-system/components/ui/modal";
import Loading, { DynamicLoadingCollection, startRouteLoading, useStructureRouteLoading } from "../design-system/components/loading/loading";
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
import { getProductDetail, type ProductRecord } from "@/lib/products-client";
import { normalizeStockEntries } from "../design-system/components/ui/color-stock-dots";
import { ColorQuantityPicker } from "../design-system/components/ui/color-quantity-picker";
import { colorSelectionTotal } from "@/lib/cart-color-selection";

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
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [failedProducts, setFailedProducts] = useState<string[]>([]);
  const onProductError = useCallback((id: string) => setFailedProducts((current) => current.includes(id) ? current : [...current, id]), []);
  const [cartReady, setCartReady] = useState(false);
  useStructureRouteLoading(!cartReady);
  const onProductLoaded = useCallback((product: ProductRecord) => {
    setProducts((current) => {
      const previous = current.find((entry) => String(entry.id) === String(product.id));
      return previous === product ? current : [...current.filter((entry) => String(entry.id) !== String(product.id)), product];
    });
  }, []);

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
    })().catch((error) => { if (!cancelled) setCheckoutMessage(error instanceof Error ? error.message : "دریافت سبد خرید انجام نشد."); }).finally(() => { if (!cancelled) setCartReady(true); });

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
    if (colorSelectionTotal(Object.fromEntries(selectedEntries)) !== item.quantity) return true;
    return selectedEntries.some(([color, count]) => (colorEntries.find((entry) => entry.color === color)?.count ?? 0) < count);
  }), [items, products]);

  const removeItem = async (target: CartItemRecord) => {
    const nextItems = await removeCartItem(target);
    setItems(nextItems);
  };

  const updateQuantity = async (target: CartItemRecord, nextQuantity: number) => {
    const nextItems = await updateCartQuantity(target, nextQuantity);
    setItems(nextItems);
  };

  const changeItemColorCount = async (target: CartItemRecord, color: string, count: number) => {
    setItems(await updateCartColorQuantity(target, color, count));
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
      await persistCart(checkoutItems, savedProfile, { notify: false, throwOnError: true });
      const nextItems = await checkoutCart(savedProfile, { shippingMethod, discountCode });
      purchasedItems.forEach((item) => {
        if (item.productId) {
          localStorage.setItem(`purchased:${item.productId}`, "1");
        }
      });
      setItems(nextItems);
      setIsCheckoutModalOpen(false);
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
      await persistCart(checkoutItems, savedProfile, { notify: false, throwOnError: true });
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
      startRouteLoading();
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
      startRouteLoading();
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
      startRouteLoading();
      router.push("/panel/user?returnTo=cart");
      return;
    }

    setProfile(checkoutProfile);
    await prepareCheckout(accountCart.items, checkoutProfile);
  };

  const renderCartItem = (item: CartItemRecord, index: number, probe = false) => {
              const product = products.find((entry) => String(entry.id) === String(item.productId ?? item.id));
              const stockValue = product?.stockQuantity ?? item.stockQuantity;
              const stockLimit = Number(stockValue);
              const hasStockLimit = Number.isFinite(stockLimit);
              const normalizedStockLimit = hasStockLimit ? Math.max(0, Math.round(stockLimit)) : Number.POSITIVE_INFINITY;
              const productColorStock = product?.colorStock ?? item.colorStock;
              const colorEntries = normalizeStockEntries(productColorStock);
              const hasColorStock = colorEntries.length > 0;
              const colorSelection = getCartItemColorSelection({ ...item, colorStock: productColorStock });
              const isAvailable = (product?.isAvailable ?? item.isAvailable) !== false
                && normalizedStockLimit > 0;
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
                && item.quantity < normalizedStockLimit;
              return (
                <>
                {!probe && (item.productId ?? item.id) ? <CartProductLoader productId={String(item.productId ?? item.id)} onLoaded={onProductLoaded} onError={onProductError} /> : null}
                <article
                  data-card-family="cartLine"
                  key={String(item.productId ?? item.id ?? `${item.title}-${index}`)}
                  className={collectionCardClasses("cartLine", "flex max-w-xl justify-self-center items-center gap-2 rounded-md border border-primary-border bg-primary-card p-2 lg:max-w-none")}
                >
                  <CustomActionButton
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media"
                    onClick={() => openImagePreview(item.imageUrl || undefined)}
                    disabled={!item.imageUrl}
                    aria-label="باز کردن تصویر محصول"
                  >
                    {item.imageUrl ? (
                      <AppImage src={item.imageUrl} alt={item.title} width={128} height={128} className="h-full w-full object-cover" />
                    ) : (
                      <IoBagHandleOutline className="text-2xl text-primary" aria-hidden="true" />
                    )}
                  </CustomActionButton>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <AppHeading level={2} className="shrink-0 truncate text-sm font-bold">{item.title}</AppHeading>
                    {hasColorStock ? (
                      <ColorQuantityPicker colorStock={productColorStock} selection={colorSelection} stockQuantity={normalizedStockLimit}
                        disabled={isCheckoutLoading} onChange={(color, count) => { void changeItemColorCount(syncedItem, color, count); }} />
                    ) : null}
                    <div className="shrink-0 truncate text-xs font-semibold text-primary">
                      {item.originalPrice && getDiscountPercent(item) > 0 && (
                        <span className="mr-2 text-danger-text-nomode line-through">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                      {formatPrice(getFinalPrice(item))} × {item.quantity}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-1">
                    {!hasColorStock ? <div className="flex items-center gap-1">
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
                        disabled={isCheckoutLoading}
                        onClick={() => updateQuantity(syncedItem, item.quantity - 1)}
                      >
                        -
                      </CustomButton>
                    </div> : <span className="text-center text-xs font-bold">{item.quantity}</span>}
                    <CustomActionButton
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-danger-border-nomode bg-danger-base text-danger-text-nomode"
                      disabled={isCheckoutLoading}
                      onClick={() => removeItem(item)}
                      aria-label="حذف محصول"
                    >
                      <IoTrashOutline className="text-sm" aria-hidden="true" />
                    </CustomActionButton>
                  </div>
                </article>
                </>
              );
  };

  return (
    <main className="min-h-full bg-primary-base text-primary-text">
      <section className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3 border-b border-primary-border pb-4">
          <div>
            <AppHeading level={1} className="text-3xl font-bold">سبد خرید</AppHeading>
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
          <DynamicLoadingCollection items={items} totalCount={items.length} isLoading={false} lazy
            className="grid w-full max-w-5xl self-center grid-cols-1 gap-3 lg:grid-cols-2" getKey={(item, index) => String(item.productId ?? item.id ?? index)}
            renderItem={(item, index) => <Loading loading="skeleton-structure" isLoading={!failedProducts.includes(String(item.productId ?? item.id)) && !products.some((product) => String(product.id) === String(item.productId ?? item.id))}>{renderCartItem(item, index)}</Loading>}
            renderSkeleton={() => <Loading loading="skeleton-structure" isLoading>{renderCartItem(items[0], 0, true)}</Loading>} />
        )}

        <ImagePreview imageUrl={previewImage} onClose={() => setPreviewImage("")} />

        <CustomModal
          open={isAuthModalOpen && !authUser}
          onClose={() => setIsAuthModalOpen(false)}
          title="ورود یا ساخت حساب"
          rounded="lg"
          shadow="lg"
          closeOnBackdrop={false}
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
          closeOnBackdrop={false}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-bold text-primary-text"><span>روش تحویل</span></div>
              <CustomTabs<CheckoutOptions["shippingMethod"]>
                variant="tertiary" ariaLabel="روش تحویل" disabled={isCheckoutLoading}
                items={[{ id: "pickup", label: "تحویل حضوری" }, { id: "post", label: `ارسال با پست (${formatPrice(30000)})` }]}
                value={shippingMethod}
                onChange={(method) => {
                  setShippingMethod(method);
                  void requestCheckoutQuote(method, discountCode);
                }}
              />
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

function CartProductLoader({ productId, onLoaded, onError }: { productId: string; onLoaded: (product: ProductRecord) => void; onError: (id: string) => void }) {
  const query = useQuery({ queryKey: ["catalog", "product", productId], queryFn: () => getProductDetail(productId) });
  useEffect(() => { if (query.data?.product) onLoaded(query.data.product); }, [onLoaded, query.data]);
  useEffect(() => { if (query.isError || (query.isSuccess && !query.data?.product)) onError(productId); }, [onError, productId, query.data, query.isError, query.isSuccess]);
  useTransientAppMessage(query.error?.message ?? "");
  return null;
}
