"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IoBagHandleOutline, IoCardOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "../design-system/components/ui/button";
import { CustomInput } from "../design-system/components/ui/input";
import { CustomModal } from "../design-system/components/ui/modal";
import { RequiredLabel } from "../design-system/components/ui/required-label";
import {
  clearCart as clearCartData,
  checkoutCart,
  getCart,
  persistCart,
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
  const [showProfileRequiredErrors, setShowProfileRequiredErrors] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [authUser, setAuthUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState("");
  const profileFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const snapshot = await getCart();
      const savedProfile = await fetchUserProfile().catch(() => snapshot.profile);
      const me = await fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => res.ok ? res.json() : null)
        .catch(() => null);
      if (cancelled) return;
      setItems(snapshot.items);
      setProfile(savedProfile);
      setProfileDraft(savedProfile ?? snapshot.profile ?? EMPTY_USER_PROFILE);
      setAuthUser(me?.data?.user ?? null);
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
      setShowProfileRequiredErrors(true);
      setProfileError("All profile fields are required.");
      window.setTimeout(() => scrollToFirstInvalidField(profileFormRef.current), 0);
      return;
    }

    const nextProfile = {
      firstName: profileDraft.firstName.trim(),
      lastName: profileDraft.lastName.trim(),
      nationalId: profileDraft.nationalId.trim(),
      phone: profileDraft.phone.trim(),
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
        setCheckoutMessage("Profile saved. Your cart is synced.");
      })
      .catch(() => setProfileError("Profile database save failed."));
  };

  const continueCheckout = () => {
    if (!authUser) {
      setAuthModalOpen(true);
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
    void persistCart(items, savedProfile)
      .then(() => checkoutCart(savedProfile))
      .then((nextItems) => {
        setItems(nextItems);
        setCheckoutMessage("Checkout completed. Inventory was updated.");
      })
      .catch((error) => {
        setCheckoutMessage(error instanceof Error ? error.message : "Checkout failed.");
      });
  };

  const submitAuth = async () => {
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthStatus("Username and password are required.");
      return;
    }

    setAuthLoading(true);
    setAuthStatus("");
    try {
      const res = await fetch(`/api/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          authMode === "register"
            ? { username: authUsername.trim().toLowerCase(), password: authPassword, name: authName.trim() || undefined }
            : { username: authUsername.trim().toLowerCase(), password: authPassword }
        ),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || "Account request failed.");
      setAuthUser(data?.data?.user ?? null);
      setAuthModalOpen(false);
      setAuthPassword("");
      const snapshot = await getCart();
      setItems(snapshot.items.length > 0 ? snapshot.items : await persistCart(items, profile ?? undefined));
      setCheckoutMessage("Account ready. Continue to payment.");
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Account request failed.");
    } finally {
      setAuthLoading(false);
    }
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
                {authUser ? "Pay" : "Continue checkout"}
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
                  {item.selectedColor ? (
                    <span className="text-xs font-semibold text-secondary-text">
                      Color: {item.selectedColor}
                    </span>
                  ) : null}
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
            <div ref={profileFormRef} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <RequiredLabel required className="text-primary-text">First name</RequiredLabel>
              <CustomInput
                value={profileDraft.firstName}
                placeholder="نام"
                required
                invalid={showProfileRequiredErrors && !profileDraft.firstName.trim()}
                aria-label="First name"
                onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <RequiredLabel required className="text-primary-text">Last name</RequiredLabel>
              <CustomInput
                value={profileDraft.lastName}
                placeholder="نام خانوادگی"
                required
                invalid={showProfileRequiredErrors && !profileDraft.lastName.trim()}
                aria-label="Last name"
                onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <RequiredLabel required className="text-primary-text">National ID</RequiredLabel>
              <CustomInput
                value={profileDraft.nationalId}
                placeholder="کد ملی"
                required
                invalid={showProfileRequiredErrors && !profileDraft.nationalId.trim()}
                inputMode="numeric"
                aria-label="National ID"
                onChange={(event) => updateProfileDraft({ nationalId: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <RequiredLabel required className="text-primary-text">Phone</RequiredLabel>
              <CustomInput
                value={profileDraft.phone}
                placeholder="شماره تماس"
                required
                invalid={showProfileRequiredErrors && !profileDraft.phone.trim()}
                inputMode="tel"
                aria-label="Phone"
                onChange={(event) => updateProfileDraft({ phone: event.target.value })}
              />
            </div>
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

        <CustomModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title={authMode === "register" ? "Create account" : "Sign in"}
          closeText="Close"
          rounded="lg"
          border="base"
          shadow="lg"
        >
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <CustomButton size="sm" variant={authMode === "login" ? "primary" : "neutral"} border="base" onClick={() => setAuthMode("login")}>
                Sign in
              </CustomButton>
              <CustomButton size="sm" variant={authMode === "register" ? "primary" : "neutral"} border="base" onClick={() => setAuthMode("register")}>
                Sign up
              </CustomButton>
            </div>
            {authMode === "register" ? (
              <CustomInput value={authName} placeholder="Name" aria-label="Name" onChange={(event) => setAuthName(event.target.value)} />
            ) : null}
            <CustomInput value={authUsername} placeholder="Username" aria-label="Username" onChange={(event) => setAuthUsername(event.target.value)} />
            <CustomInput
              value={authPassword}
              type="password"
              placeholder="Password"
              aria-label="Password"
              onChange={(event) => setAuthPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitAuth();
              }}
            />
            {authStatus ? (
              <div className="rounded-md border border-primary-border bg-bg-base px-3 py-2 text-sm font-semibold text-primary-text">
                {authStatus}
              </div>
            ) : null}
            <CustomButton border="base" fullWidth isLoading={authLoading} icon={<IoCardOutline />} onClick={submitAuth}>
              {authMode === "register" ? "Create account" : "Sign in"}
            </CustomButton>
          </div>
        </CustomModal>
      </section>
    </main>
  );
}
