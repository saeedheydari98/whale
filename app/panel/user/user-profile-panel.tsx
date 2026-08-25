"use client";

import { useEffect, useRef, useState } from "react";
import { IoSaveOutline } from "react-icons/io5";
import { EmailOtpAuthForm } from "@/app/design-system/components/ui/email-otp-auth-form";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { persistCart, readLocalCart } from "@/lib/cart-client";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import {
  EMPTY_USER_PROFILE,
  isUserProfileComplete,
  normalizeUserProfile,
  readUserProfile,
  saveUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  type UserProfile,
} from "@/lib/user-profile";
import { fetchCurrentUser, setCachedAuthUser } from "@/lib/auth-client";
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

function profileFromUser(user: PanelUser | null) {
  const profile = normalizeUserProfile(user?.profile as Partial<UserProfile> | null | undefined);
  return isUserProfileComplete(profile) ? profile : null;
}

function identityProfile(user: PanelUser | null, profile?: UserProfile | null): UserProfile {
  return {
    ...(profile ?? EMPTY_USER_PROFILE),
    phone: String(user?.username ?? profile?.phone ?? ""),
    email: user?.email && !isLocalAccountEmail(user.email)
      ? user.email
      : String(profile?.email ?? ""),
  };
}

export function UserProfilePanel() {
  const [profileDraft, setProfileDraft] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [authUser, setAuthUser] = useState<PanelUser | null>(null);
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

    void fetchCurrentUser().then((user) => {
      if (cancelled) return;
      setAuthUser(user);
      const profile = profileFromUser(user) ?? readUserProfile();
      setProfileDraft(identityProfile(user, profile));
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

  const cleanProfile = () => ({
    firstName: profileDraft.firstName.trim(),
    lastName: profileDraft.lastName.trim(),
    phone: String(authUser?.username ?? profileDraft.phone).trim(),
    email: String(authUser?.email ?? profileDraft.email).trim().toLowerCase(),
    address: profileDraft.address.trim(),
    isAdminUnlocked: profileDraft.isAdminUnlocked,
  });

  const validateProfile = () => {
    const profile = cleanProfile();
    if (
      PERSIAN_NAME_PATTERN.test(profile.firstName)
      && PERSIAN_NAME_PATTERN.test(profile.lastName)
      && PHONE_PATTERN.test(profile.phone)
      && EMAIL_PATTERN.test(profile.email)
      && profile.address.length >= 5
      && profile.address.length <= 200
    ) return true;
    setShowRequiredErrors(true);
    setStatus("لطفاً اطلاعات پروفایل را به‌درستی وارد کنید.");
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
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ذخیره پروفایل ناموفق بود.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!authUser) {
    return (
      <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold text-primary-text">ورود یا ساخت حساب</div>
          <div className="text-sm text-secondary-text">شماره موبایل و ایمیل را وارد کنید؛ کد ورود به ایمیل شما ارسال می‌شود.</div>
        </div>
        <EmailOtpAuthForm
          onSuccess={async ({ user }) => {
            setCachedAuthUser(user);
            const refreshedUser = await fetchCurrentUser({ force: true }).catch(() => user);
            setAuthUser(refreshedUser);
            setProfileDraft(identityProfile(refreshedUser, profileFromUser(refreshedUser) ?? readUserProfile()));
            setStatus("ورود انجام شد. اکنون اطلاعات پروفایل را تکمیل کنید.");
          }}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-primary-text">تکمیل پروفایل</div>
        <div className="text-sm text-secondary-text">پس از ورود، اطلاعات موردنیاز ارسال سفارش را تکمیل کنید.</div>
      </div>
      <div ref={formRef} className="grid gap-3 md:grid-cols-2">
        <CustomInput
          value={profileDraft.firstName}
          placeholder="نام"
          pattern={PERSIAN_NAME_PATTERN_SOURCE}
          maxLength={PERSIAN_NAME_MAX_LENGTH}
          required
          invalid={showRequiredErrors && !PERSIAN_NAME_PATTERN.test(profileDraft.firstName.trim())}
          aria-label="نام"
          onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
        />
        <CustomInput
          value={profileDraft.lastName}
          placeholder="نام خانوادگی"
          pattern={PERSIAN_NAME_PATTERN_SOURCE}
          maxLength={PERSIAN_NAME_MAX_LENGTH}
          required
          invalid={showRequiredErrors && !PERSIAN_NAME_PATTERN.test(profileDraft.lastName.trim())}
          aria-label="نام خانوادگی"
          onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
        />
        <CustomInput
          value={profileDraft.phone}
          placeholder="شماره تماس"
          aria-label="شماره تماس تأییدشده"
          disabled
        />
        <CustomInput
          value={profileDraft.email}
          type="email"
          placeholder="ایمیل"
          aria-label="ایمیل تأییدشده"
          disabled
        />
        <div className="flex flex-col gap-2 md:col-span-2">
          <CustomInput
            value={profileDraft.address}
            placeholder="آدرس کامل"
            minLength={5}
            maxLength={200}
            required
            invalid={showRequiredErrors && (profileDraft.address.trim().length < 5 || profileDraft.address.trim().length > 200)}
            aria-label="آدرس"
            onChange={(event) => updateProfileDraft({ address: event.target.value })}
          />
        </div>
      </div>
      <CustomButton fullWidth icon={<IoSaveOutline />} isLoading={isSavingProfile} onClick={() => void saveProfile()}>
        <span>ذخیره و تکمیل پروفایل</span>
      </CustomButton>
    </section>
  );
}
