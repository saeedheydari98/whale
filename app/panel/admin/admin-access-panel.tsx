"use client";

import { useEffect, useState } from "react";
import { IoLogInOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { requestAdminAccess } from "@/lib/admin-access";
import {
  fetchCurrentUser,
  hasAdminRole,
  setCachedAuthUser,
  type AuthClientUser,
} from "@/lib/auth-client";

type AdminAccessPanelProps = {
  onUnlock: () => void;
};

function getUserPhone(user: AuthClientUser | null) {
  const profile = user?.profile as { phone?: string | null } | null | undefined;
  return String(profile?.phone || user?.username || "").trim();
}

export function AdminAccessPanel({ onUnlock }: AdminAccessPanelProps) {
  const [authUser, setAuthUser] = useState<AuthClientUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchCurrentUser({ force: true })
      .then((user) => {
        if (cancelled) return;
        setAuthUser(user);
        if (hasAdminRole(user)) {
          setCachedAuthUser(user);
          onUnlock();
        }
      })
      .catch(() => {
        if (!cancelled) setAuthUser(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingUser(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onUnlock]);

  const submitAdminRequest = async (user = authUser) => {
    if (!user) {
      setStatus("برای ارسال درخواست مدیریت ابتدا وارد حساب خود شوید.");
      return false;
    }

    if (hasAdminRole(user)) {
      onUnlock();
      return true;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      await requestAdminAccess();
      setStatus("درخواست مدیریت شما برای مدیر ارشد ارسال شد.");
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ثبت درخواست مدیریت ناموفق بود.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishLogin = async (user: AuthClientUser | null) => {
    setCachedAuthUser(user);
    setAuthUser(user);

    if (!user) {
      setStatus("ورود ناموفق بود. دوباره تلاش کنید.");
      return;
    }

    if (hasAdminRole(user)) {
      onUnlock();
      return;
    }

    await submitAdminRequest(user);
  };

  const loginWithPassword = async () => {
    if (!phone.trim() || !password.trim()) {
      setStatus("شماره موبایل و رمز عبور الزامی است.");
      return;
    }

    setIsLoggingIn(true);
    setStatus("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || "ورود ناموفق بود.");
      }
      await finishLogin(data?.data?.user ?? null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ورود ناموفق بود.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const requestOtp = async () => {
    if (!phone.trim()) {
      setStatus("شماره موبایل الزامی است.");
      return;
    }

    setIsLoggingIn(true);
    setStatus("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), purpose: "admin" }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || "ارسال کد پیامکی ناموفق بود.");
      }
      setOtpSent(true);
      setStatus(data?.data?.developmentCode ? `کد توسعه: ${data.data.developmentCode}` : "کد پیامکی ارسال شد.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ارسال کد پیامکی ناموفق بود.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const verifyOtp = async () => {
    if (!phone.trim() || !otpCode.trim()) {
      setStatus("شماره موبایل و کد پیامک الزامی است.");
      return;
    }

    setIsLoggingIn(true);
    setStatus("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: otpCode.trim(), purpose: "admin" }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || "ورود پیامکی ناموفق بود.");
      }
      await finishLogin(data?.data?.user ?? null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ورود پیامکی ناموفق بود.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const userPhone = getUserPhone(authUser);

  return (
    <section className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-primary-border bg-primary-card p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="text-xl font-bold text-primary-text">دسترسی مدیریت</div>
        <div className="text-sm text-secondary-text">
          برای ورود به پنل مدیریت باید درخواست شما توسط مدیر ارشد تایید شود.
        </div>
      </div>

      {checkingUser ? (
        <div className="flex items-center gap-2 rounded-md border border-primary-border bg-primary-base px-3 py-2 text-sm font-semibold text-primary-text">
          <Loading loading="dots" size="md" />
          <span>در حال بررسی حساب کاربری</span>
        </div>
      ) : authUser ? (
        <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-base p-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-primary-text">درخواست دسترسی مدیریت</span>
            <span className="text-xs text-secondary-text">
              درخواست با شماره {userPhone || "ثبت نشده"} برای مدیر ارشد ارسال می شود.
            </span>
          </div>
          <CustomButton
            fullWidth
            icon={<IoShieldCheckmarkOutline />}
            isLoading={isSubmitting}
            loading="dots"
            loadingText="در حال ارسال"
            disabled={!userPhone}
            onClick={() => void submitAdminRequest()}
          >
            <span>ارسال درخواست مدیریت</span>
          </CustomButton>
          {!userPhone ? (
            <div className="text-xs font-semibold text-danger-text-nomode">
              شماره موبایل حساب شما ثبت نشده است. ابتدا پروفایل کاربری را تکمیل کنید.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-base p-3">
          <div className="text-sm font-semibold text-primary-text">
            برای ثبت درخواست مدیریت ابتدا وارد حساب خود شوید.
          </div>
          <div className="flex gap-2 rounded-md border border-primary-border bg-primary-bg p-1">
            <button
              type="button"
              className={`flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold ${loginMethod === "password" ? "bg-primary text-primary-contrast" : "text-primary-text"}`}
              onClick={() => setLoginMethod("password")}
            >
              <span>ورود با رمز</span>
            </button>
            <button
              type="button"
              className={`flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold ${loginMethod === "otp" ? "bg-primary text-primary-contrast" : "text-primary-text"}`}
              onClick={() => setLoginMethod("otp")}
            >
              <span>ورود با پیامک</span>
            </button>
          </div>
          <CustomInput
            value={phone}
            placeholder="شماره موبایل"
            inputMode="tel"
            maxLength={11}
            pattern="09\d{9}"
            aria-label="شماره موبایل"
            onChange={(event) => {
              setPhone(event.target.value);
              setOtpSent(false);
              setOtpCode("");
              setStatus("");
            }}
          />
          {loginMethod === "password" ? (
            <CustomInput
              value={password}
              type="password"
              placeholder="رمز عبور"
              autoComplete="current-password"
              aria-label="رمز عبور"
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loginWithPassword();
              }}
            />
          ) : (
            <CustomInput
              value={otpCode}
              placeholder="کد پیامک"
              inputMode="numeric"
              maxLength={6}
              pattern="\d{6}"
              disabled={!otpSent}
              aria-label="کد پیامک"
              onChange={(event) => setOtpCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && otpSent) void verifyOtp();
              }}
            />
          )}
          {loginMethod === "password" ? (
            <CustomButton fullWidth icon={<IoLogInOutline />} isLoading={isLoggingIn} onClick={loginWithPassword}>
              <span>ورود و ارسال درخواست</span>
            </CustomButton>
          ) : otpSent ? (
            <CustomButton fullWidth icon={<IoLogInOutline />} isLoading={isLoggingIn} onClick={verifyOtp}>
              <span>تایید کد و ارسال درخواست</span>
            </CustomButton>
          ) : (
            <CustomButton fullWidth isLoading={isLoggingIn} onClick={requestOtp}>
              <span>ارسال کد پیامکی</span>
            </CustomButton>
          )}
        </div>
      )}

      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-base px-3 py-2 text-sm font-semibold text-primary-text">
          {status}
        </div>
      ) : null}
    </section>
  );
}
