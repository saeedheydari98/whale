"use client";

import { useEffect, useRef, useState } from "react";
import { IoKeyOutline, IoLogInOutline, IoSaveOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { persistCart, readLocalCart } from "@/lib/cart-client";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import {
  EMPTY_USER_PROFILE,
  fetchUserProfile,
  isUserProfileComplete,
  readUserProfile,
  saveUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  type UserProfile,
} from "@/lib/user-profile";
import { fetchCurrentUser, setCachedAuthUser } from "@/lib/auth-client";
import { isValidPastPersianDate, normalizePersianDate } from "@/lib/persian-date";

type PanelUser = {
  username?: string | null;
  email?: string | null;
  name?: string | null;
};

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const NAME_PATTERN = /^[\p{L}][\p{L}\s'-]{1,49}$/u;
const NATIONAL_ID_PATTERN = /^\d{10}$/;
const PHONE_PATTERN = /^09\d{9}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_REGISTER = {
  username: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

const EMPTY_PASSWORD = {
  currentPassword: "",
  password: "",
  passwordConfirm: "",
};

function isLocalEmail(email?: string | null) {
  return Boolean(email?.endsWith("@local.user"));
}

export function UserProfilePanel() {
  const [profileDraft, setProfileDraft] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [registerDraft, setRegisterDraft] = useState(EMPTY_REGISTER);
  const [passwordDraft, setPasswordDraft] = useState(EMPTY_PASSWORD);
  const [authUser, setAuthUser] = useState<PanelUser | null>(null);
  const [status, setStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncProfile = () => {
      setProfileDraft(readUserProfile() ?? EMPTY_USER_PROFILE);
    };

    syncProfile();
    void Promise.all([
      fetchUserProfile().catch(() => null),
      fetchCurrentUser(),
    ]).then(([profile, user]) => {
      if (profile) setProfileDraft(profile);
      setAuthUser(user);
    });
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);

    return () => {
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
    nationalId: profileDraft.nationalId.trim(),
    birthDate: normalizePersianDate(profileDraft.birthDate),
    phone: profileDraft.phone.trim(),
    address: profileDraft.address.trim(),
    themeMode: profileDraft.themeMode,
    isAdminUnlocked: profileDraft.isAdminUnlocked,
  });

  const validateProfile = () => {
    if (
      isUserProfileComplete(profileDraft) &&
      NAME_PATTERN.test(profileDraft.firstName.trim()) &&
      NAME_PATTERN.test(profileDraft.lastName.trim()) &&
      NATIONAL_ID_PATTERN.test(profileDraft.nationalId.trim()) &&
      PHONE_PATTERN.test(profileDraft.phone.trim()) &&
      profileDraft.address.trim().length >= 5 &&
      profileDraft.address.trim().length <= 200 &&
      isValidPastPersianDate(profileDraft.birthDate)
    ) return true;
    setShowRequiredErrors(true);
    setStatus("لطفا اطلاعات پروفایل را به‌درستی وارد کنید.");
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
      void persistCart(readLocalCart(), savedProfile);
      setStatus("پروفایل ذخیره شد.");
    } catch {
      setStatus("ذخیره پروفایل ناموفق بود.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const registerAndLogin = async () => {
    if (!validateProfile()) return;
    if (!registerDraft.username.trim() || !registerDraft.password || !registerDraft.passwordConfirm) {
      setStatus("نام کاربری و تکرار رمز عبور الزامی است.");
      return;
    }
    if (!USERNAME_PATTERN.test(registerDraft.username.trim().toLowerCase())) {
      setStatus("نام کاربری باید ۳ تا ۳۲ کاراکتر و شامل حروف کوچک انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد.");
      return;
    }
    if (registerDraft.email.trim() && !EMAIL_PATTERN.test(registerDraft.email.trim())) {
      setStatus("فرمت ایمیل معتبر نیست.");
      return;
    }
    if (!PASSWORD_PATTERN.test(registerDraft.password)) {
      setStatus("رمز عبور باید ۸ تا ۷۲ کاراکتر و شامل حداقل یک حرف و یک عدد باشد.");
      return;
    }
    if (registerDraft.password !== registerDraft.passwordConfirm) {
      setStatus("تکرار رمز عبور مطابقت ندارد.");
      return;
    }

    setIsRegistering(true);
    try {
      const pendingCart = readLocalCart(null);
      const profile = cleanProfile();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: registerDraft.username.trim().toLowerCase(),
          email: registerDraft.email.trim() || undefined,
          password: registerDraft.password,
          passwordConfirm: registerDraft.passwordConfirm,
          profile,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "ساخت حساب ناموفق بود.");
      const savedProfile = (await fetchUserProfile(profile.nationalId).catch(() => null)) ?? profile;
      const user = data?.data?.user ?? null;
      setCachedAuthUser(user);
      setAuthUser(user);
      setProfileDraft(savedProfile);
      setRegisterDraft(EMPTY_REGISTER);
      setShowRequiredErrors(false);
      setStatus("حساب کاربری ساخته شد و وارد شدید.");
      void persistCart(pendingCart, savedProfile);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ساخت حساب ناموفق بود.");
    } finally {
      setIsRegistering(false);
    }
  };

  const changePassword = async () => {
    if (!passwordDraft.currentPassword || !passwordDraft.password || !passwordDraft.passwordConfirm) {
      setPasswordStatus("همه فیلدهای رمز عبور الزامی هستند.");
      return;
    }
    if (!PASSWORD_PATTERN.test(passwordDraft.password)) {
      setPasswordStatus("رمز عبور جدید باید ۸ تا ۷۲ کاراکتر و شامل حداقل یک حرف و یک عدد باشد.");
      return;
    }
    if (passwordDraft.password !== passwordDraft.passwordConfirm) {
      setPasswordStatus("تکرار رمز عبور مطابقت ندارد.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordDraft.currentPassword,
          password: passwordDraft.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "تغییر رمز عبور ناموفق بود.");
      setPasswordDraft(EMPTY_PASSWORD);
      setShowPasswordForm(false);
      setPasswordStatus("رمز عبور تغییر کرد. در صورت نیاز دوباره وارد شوید.");
    } catch (error) {
      setPasswordStatus(error instanceof Error ? error.message : "تغییر رمز عبور ناموفق بود.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-primary-text">
          {authUser ? "اطلاعات پروفایل" : "ساخت حساب کاربری"}
        </div>
        <div className="text-sm text-primary-text">
          {authUser ? "اطلاعات موردنیاز برای ارسال و پرداخت سفارش را ویرایش کنید." : "برای ساخت حساب، اطلاعات ضروری مشتری را کامل کنید."}
        </div>
      </div>

      {authUser ? (
        <div className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-base p-3">
          <RequiredLabel className="text-primary-text">نام کاربری</RequiredLabel>
          <CustomInput
            value={authUser.username || ""}
            variant="primary"
            disabled
            showLabel={false}
            autoComplete="username"
            aria-label="نام کاربری"
          />
          {!isLocalEmail(authUser.email) && authUser.email ? (
            <span className="text-xs font-semibold text-primary-text">{authUser.email}</span>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-base p-3">
          <div className="flex flex-col gap-2">
            <RequiredLabel required className="text-primary-text">نام کاربری</RequiredLabel>
            <CustomInput
              value={registerDraft.username}
              variant="primary"
              placeholder="نام کاربری"
              pattern="[a-z0-9._-]{3,32}"
              title="۳ تا ۳۲ کاراکتر شامل حروف کوچک انگلیسی، عدد، نقطه، خط تیره یا زیرخط"
              autoComplete="username"
              required
              invalid={showRequiredErrors && !registerDraft.username.trim()}
              showLabel={false}
              aria-label="نام کاربری"
              onChange={(event) => {
                setRegisterDraft((current) => ({ ...current, username: event.target.value }));
                setStatus("");
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel className="text-primary-text">ایمیل</RequiredLabel>
            <CustomInput
              value={registerDraft.email}
              variant="primary"
              type="email"
              placeholder="ایمیل"
              autoComplete="email"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              showLabel={false}
              aria-label="ایمیل"
              onChange={(event) => setRegisterDraft((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel required className="text-primary-text">رمز عبور</RequiredLabel>
            <CustomInput
              value={registerDraft.password}
              variant="primary"
              type="password"
              placeholder="رمز عبور"
              autoComplete="new-password"
              pattern="(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}"
              title="۸ تا ۷۲ کاراکتر با حداقل یک حرف و یک عدد"
              required
              invalid={showRequiredErrors && !registerDraft.password}
              showLabel={false}
              aria-label="رمز عبور"
              onChange={(event) => {
                setRegisterDraft((current) => ({ ...current, password: event.target.value }));
                setStatus("");
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel required className="text-primary-text">تکرار رمز عبور</RequiredLabel>
            <CustomInput
              value={registerDraft.passwordConfirm}
              variant="primary"
              type="password"
              placeholder="تکرار رمز عبور"
              autoComplete="new-password"
              pattern="(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}"
              required
              invalid={showRequiredErrors && !registerDraft.passwordConfirm}
              showLabel={false}
              aria-label="تکرار رمز عبور"
              onChange={(event) => {
                setRegisterDraft((current) => ({ ...current, passwordConfirm: event.target.value }));
                setStatus("");
              }}
            />
          </div>
        </div>
      )}

      <div ref={formRef} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-primary-text">نام</RequiredLabel>
          <CustomInput
            value={profileDraft.firstName}
            variant="primary"
            placeholder="نام"
            pattern="[\p{L}][\p{L}\s'-]{1,49}"
            required
            invalid={showRequiredErrors && !NAME_PATTERN.test(profileDraft.firstName.trim())}
            showLabel={false}
            aria-label="نام"
            onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-primary-text">نام خانوادگی</RequiredLabel>
          <CustomInput
            value={profileDraft.lastName}
            variant="primary"
            placeholder="نام خانوادگی"
            pattern="[\p{L}][\p{L}\s'-]{1,49}"
            required
            invalid={showRequiredErrors && !NAME_PATTERN.test(profileDraft.lastName.trim())}
            showLabel={false}
            aria-label="نام خانوادگی"
            onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-primary-text">کد ملی</RequiredLabel>
          <CustomInput
            value={profileDraft.nationalId}
            variant="primary"
            placeholder="کد ملی"
            pattern="\d{10}"
            maxLength={10}
            required
            invalid={showRequiredErrors && !NATIONAL_ID_PATTERN.test(profileDraft.nationalId.trim())}
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
            variant="primary"
            placeholder="1370/01/01"
            pattern="(13|14)[0-9]{2}/[0-9]{2}/[0-9]{2}"
            inputMode="numeric"
            required
            invalid={showRequiredErrors && !isValidPastPersianDate(profileDraft.birthDate)}
            showLabel={false}
            aria-label="تاریخ تولد"
            onChange={(event) => updateProfileDraft({ birthDate: normalizePersianDate(event.target.value) })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-primary-text">شماره تماس</RequiredLabel>
          <CustomInput
            value={profileDraft.phone}
            variant="primary"
            placeholder="شماره تماس"
            pattern="09\d{9}"
            maxLength={11}
            required
            invalid={showRequiredErrors && !PHONE_PATTERN.test(profileDraft.phone.trim())}
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
            variant="primary"
            placeholder="آدرس کامل"
            minLength={5}
            maxLength={200}
            required
            invalid={showRequiredErrors && (profileDraft.address.trim().length < 5 || profileDraft.address.trim().length > 200)}
            showLabel={false}
            aria-label="آدرس"
            onChange={(event) => updateProfileDraft({ address: event.target.value })}
          />
        </div>
      </div>

      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-card px-3 py-2 text-sm font-semibold text-primary-text">
          {status}
        </div>
      ) : null}

      <CustomButton
        variant="primary"
        icon={authUser ? <IoSaveOutline /> : <IoLogInOutline />}
        isLoading={authUser ? isSavingProfile : isRegistering}
        onClick={authUser ? saveProfile : registerAndLogin}
      >
        {authUser ? "ذخیره پروفایل" : "ساخت حساب و ورود"}
      </CustomButton>

      {authUser ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-base p-3">
          {showPasswordForm ? (
            <>
              <div className="text-sm font-bold text-primary-text">تغییر رمز عبور</div>
              <CustomInput
                value={passwordDraft.currentPassword}
                variant="primary"
                type="password"
                placeholder="رمز عبور فعلی"
                autoComplete="current-password"
                aria-label="رمز عبور فعلی"
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }));
                  setPasswordStatus("");
                }}
              />
              <CustomInput
                value={passwordDraft.password}
                variant="primary"
                type="password"
                placeholder="رمز عبور جدید"
                autoComplete="new-password"
                pattern="(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}"
                aria-label="رمز عبور جدید"
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, password: event.target.value }));
                  setPasswordStatus("");
                }}
              />
              <CustomInput
                value={passwordDraft.passwordConfirm}
                variant="primary"
                type="password"
                placeholder="تکرار رمز عبور جدید"
                autoComplete="new-password"
                pattern="(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}"
                aria-label="تکرار رمز عبور جدید"
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, passwordConfirm: event.target.value }));
                  setPasswordStatus("");
                }}
              />
            </>
          ) : null}
          {passwordStatus ? (
            <div className="rounded-md border border-primary-border bg-primary-card px-3 py-2 text-sm font-semibold text-primary-text">
              {passwordStatus}
            </div>
          ) : null}
          <CustomButton
            variant="primary"
            icon={<IoKeyOutline />}
            isLoading={isChangingPassword}
            onClick={showPasswordForm ? changePassword : () => setShowPasswordForm(true)}
          >
            تغییر رمز عبور
          </CustomButton>
        </div>
      ) : null}
    </section>
  );
}
