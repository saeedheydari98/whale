"use client";

import { useEffect, useRef, useState } from "react";
import { IoSaveOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { persistCart, readLocalCart } from "@/lib/cart-client";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import {
  EMPTY_USER_PROFILE,
  normalizeUserProfile,
  readUserProfile,
  saveUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  type UserProfile,
} from "@/lib/user-profile";
import { fetchCurrentUser } from "@/lib/auth-client";
import { isLocalAccountEmail } from "@/lib/auth-constants";
import {
  EMAIL_PATTERN,
  PERSIAN_NAME_MAX_LENGTH,
  PERSIAN_NAME_PATTERN,
  PERSIAN_NAME_PATTERN_SOURCE,
  PHONE_PATTERN,
} from "@/lib/validation-patterns";

type PanelUser = {
  username?: string | null;
  email?: string | null;
  name?: string | null;
  profile?: unknown;
};

type ProfileFieldErrors = Partial<Record<"firstName" | "lastName" | "phone" | "email" | "address", string>>;

type UserProfilePanelProps = {
  onCompleted?: (profile: UserProfile) => void | Promise<void>;
};

function profileFromUser(user: PanelUser | null) {
  if (!user?.profile || typeof user.profile !== "object") return null;
  return normalizeUserProfile(user.profile as Partial<UserProfile>);
}

function identityProfile(user: PanelUser | null, profile?: UserProfile | null): UserProfile {
  const userPhone = String(user?.username ?? "").trim();
  const userEmail = String(user?.email ?? "").trim().toLowerCase();
  return {
    ...(profile ?? EMPTY_USER_PROFILE),
    phone: PHONE_PATTERN.test(userPhone)
      ? userPhone
      : String(profile?.phone ?? ""),
    email: EMAIL_PATTERN.test(userEmail) && !isLocalAccountEmail(userEmail)
      ? userEmail
      : String(profile?.email ?? ""),
  };
}

function getProfileFieldErrors(profile: UserProfile): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  if (!profile.firstName) errors.firstName = "نام را وارد کنید.";
  else if (!PERSIAN_NAME_PATTERN.test(profile.firstName)) {
    errors.firstName = "نام باید با حروف فارسی و بین ۲ تا ۱۵ حرف باشد.";
  }

  if (!profile.lastName) errors.lastName = "نام خانوادگی را وارد کنید.";
  else if (!PERSIAN_NAME_PATTERN.test(profile.lastName)) {
    errors.lastName = "نام خانوادگی باید با حروف فارسی و بین ۲ تا ۱۵ حرف باشد.";
  }

  if (!profile.phone) errors.phone = "شماره موبایل حساب در دسترس نیست؛ دوباره وارد حساب شوید.";
  else if (!PHONE_PATTERN.test(profile.phone)) {
    errors.phone = "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.";
  }

  if (!profile.email) errors.email = "ایمیل حساب در دسترس نیست؛ دوباره وارد حساب شوید.";
  else if (!EMAIL_PATTERN.test(profile.email)) errors.email = "نشانی ایمیل معتبر نیست.";

  if (!profile.address) errors.address = "آدرس کامل را وارد کنید.";
  else if (profile.address.length < 5) errors.address = "آدرس باید حداقل ۵ حرف باشد.";
  else if (profile.address.length > 200) errors.address = "آدرس نباید بیشتر از ۲۰۰ حرف باشد.";

  return errors;
}

export function UserProfilePanel({ onCompleted }: UserProfilePanelProps = {}) {
  const [profileDraft, setProfileDraft] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [authUser, setAuthUser] = useState<PanelUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [status, setStatus] = useState("");
  useTransientAppMessage(status);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const syncProfile = () => {
      if (cancelled) return;
      const storedProfile = readUserProfile();
      if (storedProfile) setProfileDraft(storedProfile);
    };

    void fetchCurrentUser({ force: true })
      .then((user) => {
        if (cancelled) return;
        setAuthUser(user);
        const profile = profileFromUser(user) ?? readUserProfile();
        setProfileDraft(identityProfile(user, profile));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUser(false);
      });
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
    return () => {
      cancelled = true;
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
    };
  }, []);

  const updateProfileDraft = (patch: Partial<UserProfile>) => {
    setProfileDraft((current) => ({ ...current, ...patch }));
    setStatus("");
  };

  const cleanProfile = () => {
    const profile = identityProfile(authUser, profileDraft);
    return {
      ...profile,
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      phone: profile.phone.trim(),
      email: profile.email.trim().toLowerCase(),
      address: profile.address.trim(),
    };
  };

  const fieldErrors = showRequiredErrors ? getProfileFieldErrors(cleanProfile()) : {};

  const validateProfile = () => {
    const profile = cleanProfile();
    const errors = getProfileFieldErrors(profile);
    const firstError = Object.values(errors)[0];
    if (!firstError) return true;
    setShowRequiredErrors(true);
    setStatus(firstError);
    window.setTimeout(() => scrollToFirstInvalidField(formRef.current), 0);
    return false;
  };

  const saveProfile = async () => {
    if (!validateProfile()) return;
    setIsSavingProfile(true);
    try {
      const savedProfile = await saveUserProfile(cleanProfile());
      setProfileDraft(savedProfile);
      setShowRequiredErrors(false);
      const localCart = readLocalCart();
      if (localCart.length > 0) void persistCart(localCart, savedProfile);
      setStatus("پروفایل تکمیل و ذخیره شد.");
      await onCompleted?.(savedProfile);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ذخیره پروفایل ناموفق بود.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!isLoadingUser && !authUser) return null;

  return (
    <Loading loading="skeleton-structure" isLoading={isLoadingUser}>
      <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-primary-text">تکمیل پروفایل</div>
        <div className="text-sm text-secondary-text">پس از ورود، اطلاعات موردنیاز ارسال سفارش را تکمیل کنید.</div>
      </div>
      <div ref={formRef} className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <CustomInput
            value={profileDraft.firstName}
            label="نام"
            placeholder="نام"
            pattern={PERSIAN_NAME_PATTERN_SOURCE}
            maxLength={PERSIAN_NAME_MAX_LENGTH}
            required
            invalid={Boolean(fieldErrors.firstName)}
            aria-describedby={fieldErrors.firstName ? "profile-first-name-error" : undefined}
            aria-label="نام"
            onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
          />
          {fieldErrors.firstName ? <span id="profile-first-name-error" className="text-xs text-danger-text-nomode">{fieldErrors.firstName}</span> : null}
        </div>
        <div className="flex flex-col gap-1">
          <CustomInput
            value={profileDraft.lastName}
            label="نام خانوادگی"
            placeholder="نام خانوادگی"
            pattern={PERSIAN_NAME_PATTERN_SOURCE}
            maxLength={PERSIAN_NAME_MAX_LENGTH}
            required
            invalid={Boolean(fieldErrors.lastName)}
            aria-describedby={fieldErrors.lastName ? "profile-last-name-error" : undefined}
            aria-label="نام خانوادگی"
            onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
          />
          {fieldErrors.lastName ? <span id="profile-last-name-error" className="text-xs text-danger-text-nomode">{fieldErrors.lastName}</span> : null}
        </div>
        <div className="flex flex-col gap-1">
          <CustomInput
            value={profileDraft.phone}
            label="شماره موبایل"
            placeholder="شماره موبایل"
            invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "profile-phone-error" : undefined}
            aria-label="شماره موبایل"
            disabled
          />
          {fieldErrors.phone ? <span id="profile-phone-error" className="text-xs text-danger-text-nomode">{fieldErrors.phone}</span> : null}
        </div>
        <div className="flex flex-col gap-1">
          <CustomInput
            value={profileDraft.email}
            type="email"
            label="ایمیل"
            placeholder="ایمیل"
            invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "profile-email-error" : undefined}
            aria-label="ایمیل"
            disabled
          />
          {fieldErrors.email ? <span id="profile-email-error" className="text-xs text-danger-text-nomode">{fieldErrors.email}</span> : null}
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <CustomInput
            value={profileDraft.address}
            label="آدرس کامل"
            placeholder="آدرس کامل"
            minLength={5}
            maxLength={200}
            required
            invalid={Boolean(fieldErrors.address)}
            aria-describedby={fieldErrors.address ? "profile-address-error" : undefined}
            aria-label="آدرس کامل"
            onChange={(event) => updateProfileDraft({ address: event.target.value })}
          />
          {fieldErrors.address ? <span id="profile-address-error" className="text-xs text-danger-text-nomode">{fieldErrors.address}</span> : null}
        </div>
      </div>
      <CustomButton fullWidth icon={<IoSaveOutline />} isLoading={isSavingProfile} onClick={() => void saveProfile()}>
        <span>ذخیره و تکمیل پروفایل</span>
      </CustomButton>
      </section>
    </Loading>
  );
}
