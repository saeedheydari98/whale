"use client";

import { useState } from "react";
import { IoLockOpenOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { unlockAdminAccessWithCode } from "@/lib/admin-access";
import { setCachedAuthUser } from "@/lib/auth-client";

type AdminAccessPanelProps = {
  onUnlock: () => void;
};

export function AdminAccessPanel({ onUnlock }: AdminAccessPanelProps) {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showRequiredError, setShowRequiredError] = useState(false);

  const finishAdminLogin = (user: any) => {
    setCachedAuthUser(user);
    if (user?.role === "admin" || user?.role === "superadmin") {
      onUnlock();
      return true;
    }
    setStatus("این شماره موبایل دسترسی مدیریت ندارد.");
    return false;
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
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "ورود مدیریت ناموفق بود.");
      finishAdminLogin(data?.data?.user ?? null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ورود مدیریت ناموفق بود.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const requestAdminOtp = async () => {
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
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "ارسال کد مدیریت ناموفق بود.");
      setOtpSent(true);
      setStatus(data?.data?.developmentCode ? `کد توسعه: ${data.data.developmentCode}` : "کد ورود مدیریت ارسال شد.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ارسال کد مدیریت ناموفق بود.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const verifyAdminOtp = async () => {
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
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "ورود پیامکی مدیریت ناموفق بود.");
      finishAdminLogin(data?.data?.user ?? null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ورود پیامکی مدیریت ناموفق بود.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const submitCode = async () => {
    if (!username.trim() || !code.trim()) {
      setShowRequiredError(true);
      setStatus("شماره موبایل و کد امنیتی الزامی است.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const unlocked = await unlockAdminAccessWithCode(code, username.trim());
      if (unlocked) {
        setCode("");
        setUsername("");
        setShowRequiredError(false);
        onUnlock();
        return;
      }

      setStatus("درخواست ارسال شد. مدیر ارشد باید دسترسی مدیریت را تایید کند.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "کد امنیتی پذیرفته نشد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-primary-border bg-primary-card p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="text-xl font-bold text-primary-text">دسترسی مدیریت</div>
        <div className="text-sm text-secondary-text">
          برای ورود مدیر از شماره موبایل استفاده کنید. اگر دسترسی ندارید، کد امنیتی را برای ثبت درخواست وارد کنید.
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-base p-3">
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
          placeholder="شماره موبایل مدیر"
          inputMode="tel"
          maxLength={11}
          pattern="09\d{9}"
          aria-label="شماره موبایل مدیر"
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
            aria-label="رمز عبور مدیریت"
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
            aria-label="کد پیامک مدیریت"
            onChange={(event) => setOtpCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && otpSent) void verifyAdminOtp();
            }}
          />
        )}
        {loginMethod === "password" ? (
          <CustomButton fullWidth isLoading={isLoggingIn} onClick={loginWithPassword}>
            <span>ورود مدیریت</span>
          </CustomButton>
        ) : otpSent ? (
          <CustomButton fullWidth isLoading={isLoggingIn} onClick={verifyAdminOtp}>
            <span>تایید کد</span>
          </CustomButton>
        ) : (
          <CustomButton fullWidth isLoading={isLoggingIn} onClick={requestAdminOtp}>
            <span>ارسال کد</span>
          </CustomButton>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <RequiredLabel required className="text-primary-text">شماره موبایل</RequiredLabel>
        <CustomInput
          value={username}
          placeholder="شماره موبایل خود را وارد کنید"
          inputMode="tel"
          maxLength={11}
          pattern="09\d{9}"
          aria-label="شماره موبایل درخواست مدیریت"
          invalid={showRequiredError && !username.trim()}
          onChange={(event) => {
            setUsername(event.target.value);
            setShowRequiredError(false);
            setStatus("");
          }}
        />
        <RequiredLabel required className="text-primary-text">کد امنیتی</RequiredLabel>
        <CustomInput
          value={code}
          type="password"
          placeholder="کد مدیریت را وارد کنید"
          aria-label="کد دسترسی مدیریت"
          invalid={showRequiredError && !code.trim()}
          onChange={(event) => {
            setCode(event.target.value);
            setShowRequiredError(false);
            setStatus("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submitCode();
            }
          }}
        />
      </div>

      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-base px-3 py-2 text-sm font-semibold text-primary-text">
          {status}
        </div>
      ) : null}

      <CustomButton
        fullWidth
        icon={<IoLockOpenOutline />}
        isLoading={isSubmitting}
        onClick={submitCode}
      >
        باز کردن پنل مدیریت
      </CustomButton>
    </section>
  );
}
