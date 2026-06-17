"use client";

import { useEffect, useMemo, useState } from "react";
import { IoBagHandleOutline, IoCardOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../design-system/components/ui/button";
import { CustomInput } from "../design-system/components/ui/input";
import { CustomModal } from "../design-system/components/ui/modal";
import {
  clearCart as clearCartData,
  getCart,
  persistCart,
  removeCartItem,
  updateCartQuantity,
  type CartItemRecord,
} from "@/lib/cart-client";
import {
  EMPTY_USER_PROFILE,
  fetchUserProfile,
  isUserProfileComplete,
  readUserProfile,
  saveUserProfile,
  writeUserProfile,
  type UserProfile,
} from "@/lib/user-profile";

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

export default function CartPage() {
  const [items, setItems] = useState<CartItemRecord[]>([]);
  const [previewImage, setPreviewImage] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const snapshot = await getCart();
      const savedProfile = await fetchUserProfile().catch(() => snapshot.profile);
      if (cancelled) return;
      setItems(snapshot.items);
      setProfile(savedProfile);
      setProfileDraft(savedProfile ?? snapshot.profile ?? EMPTY_USER_PROFILE);
    })();

    return () => {
      cancelled = true;
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

  const clearCart = async () => {
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

  const saveProfileDraft = () => {
    if (!isUserProfileComplete(profileDraft)) {
      setProfileError("All profile fields are required.");
      return;
    }

    const nextProfile = {
      firstName: profileDraft.firstName.trim(),
      lastName: profileDraft.lastName.trim(),
      nationalId: profileDraft.nationalId.trim(),
      phone: profileDraft.phone.trim(),
    };

    void saveUserProfile(nextProfile)
      .then((savedProfile) => {
        writeUserProfile(savedProfile);
        void persistCart(items, savedProfile).then(setItems);
        setProfile(savedProfile);
        setProfileDraft(savedProfile);
        setIsProfileModalOpen(false);
        setCheckoutMessage("Profile saved. Your cart is synced.");
      })
      .catch(() => setProfileError("Profile database save failed."));
  };

  const continueCheckout = () => {
    const savedProfile = readUserProfile();

    if (!savedProfile) {
      setProfileDraft(profile ?? EMPTY_USER_PROFILE);
      setProfileError("");
      setIsProfileModalOpen(true);
      return;
    }

    setProfile(savedProfile);
    void persistCart(items, savedProfile).then(setItems);
    setCheckoutMessage("Profile found. Your cart is synced.");
  };

  return (
    <main className="min-h-screen bg-bg-base text-primary-text">
      <section className="mx-auto flex w-full flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3 border-b border-primary-border pb-4">
          <div>
            <div className="text-3xl font-bold">Cart</div>
            <div className="text-sm text-secondary-text">{totalItems} item(s) in cart</div>
            {items.length > 0 && (
              <div className="mt-1 text-base font-bold text-primary">
                Total: {formatPrice(cartTotal)}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <CustomButton
                border="base"
                size="sm"
                icon={<IoCardOutline />}
                onClick={continueCheckout}
              >
                Continue checkout
              </CustomButton>
              <CustomButton variant="danger" border="base" size="sm" onClick={clearCart}>
                Clear cart
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
            Your cart is empty.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item, index) => (
              <article
                key={String(item.id ?? `${item.title}-${index}`)}
                className="grid gap-4 rounded-lg border border-primary-border bg-primary-card p-4 sm:grid-cols-[120px_1fr_auto]"
              >
                <button
                  type="button"
                  className="flex h-28 items-center justify-center overflow-hidden rounded-md bg-primary-media"
                  onClick={() => openImagePreview(item.imageUrl || undefined)}
                  disabled={!item.imageUrl}
                  aria-label="Open product image"
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
                  <div className="text-sm font-semibold text-primary">
                    {item.originalPrice && getDiscountPercent(item) > 0 && (
                      <span className="mr-2 text-danger-text-nomode line-through">
                        {formatPrice(item.originalPrice)}
                      </span>
                    )}
                    {formatPrice(getFinalPrice(item))} x {item.quantity}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CustomButton
                      variant="neutral"
                      border="base"
                      size="sm"
                      onClick={() => updateQuantity(item, item.quantity - 1)}
                    >
                      -
                    </CustomButton>
                    <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <CustomButton
                      variant="neutral"
                      border="base"
                      size="sm"
                      onClick={() => updateQuantity(item, item.quantity + 1)}
                    >
                      +
                    </CustomButton>
                  </div>
                  <CustomButton
                    variant="danger"
                    border="base"
                    size="sm"
                    icon={<IoTrashOutline />}
                    onClick={() => removeItem(item)}
                  >
                    Remove
                  </CustomButton>
                </div>
              </article>
            ))}
          </div>
        )}

        <CustomModal
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage("")}
          title="Product image"
          closeText="Close"
          rounded="lg"
          border="base"
          shadow="lg"
        >
          <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-md bg-bg-base">
            {previewImage && (
              <img
                src={previewImage}
                alt="Product image preview"
                className="max-h-[75vh] w-full object-contain"
              />
            )}
          </div>
        </CustomModal>

        <CustomModal
          open={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title="Checkout profile"
          closeText="Close"
          rounded="lg"
          border="base"
          shadow="lg"
        >
          <div className="flex flex-col gap-3">
            <div className="text-sm text-secondary-text">
              Please register your required profile information before checkout.
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-primary-text">First name</div>
              <CustomInput
                value={profileDraft.firstName}
                placeholder="نام"
                required
                aria-label="First name"
                onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-primary-text">Last name</div>
              <CustomInput
                value={profileDraft.lastName}
                placeholder="نام خانوادگی"
                required
                aria-label="Last name"
                onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-primary-text">National ID</div>
              <CustomInput
                value={profileDraft.nationalId}
                placeholder="کد ملی"
                required
                inputMode="numeric"
                aria-label="National ID"
                onChange={(event) => updateProfileDraft({ nationalId: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-primary-text">Phone</div>
              <CustomInput
                value={profileDraft.phone}
                placeholder="شماره تماس"
                required
                inputMode="tel"
                aria-label="Phone"
                onChange={(event) => updateProfileDraft({ phone: event.target.value })}
              />
            </div>
            {profileError ? (
              <div className="rounded-md border border-danger-border-nomode bg-bg-base px-3 py-2 text-sm font-semibold text-danger-text-nomode">
                {profileError}
              </div>
            ) : null}
            <CustomButton border="base" fullWidth icon={<IoCardOutline />} onClick={saveProfileDraft}>
              Save and continue
            </CustomButton>
          </div>
        </CustomModal>
      </section>
    </main>
  );
}
