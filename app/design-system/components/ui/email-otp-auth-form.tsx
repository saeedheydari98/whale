"use client";

import { useEffect, useState } from "react";
import { IoLogInOutline, IoMailOutline } from "react-icons/io5";
import { CustomButton } from "./button";
import { CustomInput } from "./input";
import type { AuthClientUser } from "@/lib/auth-client";

const PHONE_PATTERN = /^09\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailOtpAuthFormProps = {
  purpose?: "login" | "admin";
  onSuccess: (result: { user: AuthClientUser; profileComplete: boolean }) => void | Promise<void>;
  submitLabel?: string;
};

type AuthResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: {
    user?: AuthClientUser | null;
    profileComplete?: boolean;
    retryAfterSeconds?: number;
    developmentCode?: string;
  };
};

export function EmailOtpAuthForm({
  purpose = "login",
  onSuccess,
  submitLabel = "تأیید کد و ورود",
}: EmailOtpAuthFormProps) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resetVerification = () => {
    setCode("");
    setCodeSent(false);
    setCooldown(0);
    setStatus("");
  };

  const validateIdentity = () => {
    if (!PHONE_PATTERN.test(phone.trim())) {
      setStatus("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
      return false;
    }
    if (!EMAIL_PATTERN.test(email.trim().toLowerCase())) {
      setStatus("ایمیل معتبر وارد کنید.");
      return false;
    }
    return true;
  };

  const requestCode = async () => {
    if (!validateIdentity() || cooldown > 0) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), email: email.trim().toLowerCase(), purpose }),
      });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok || payload?.ok === false) {
        const retryAfter = Number(payload?.data?.retryAfterSeconds);
        if (Number.isFinite(retryAfter) && retryAfter > 0) setCooldown(Math.ceil(retryAfter));
        throw new Error(payload?.message || payload?.error || "ارسال کد ورود ناموفق بود.");
      }
      setCodeSent(true);
      setCooldown(Math.max(1, Math.round(Number(payload?.data?.retryAfterSeconds) || 60)));
      setStatus(payload?.data?.developmentCode
        ? `کد توسعه: ${payload.data.developmentCode}`
        : `کد ورود به ${email.trim().toLowerCase()} ارسال شد.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ارسال کد ورود ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!validateIdentity()) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setStatus("کد ورود باید ۶ رقم باشد.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), email: email.trim().toLowerCase(), code: code.trim(), purpose }),
      });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      const user = payload?.data?.user ?? null;
      if (!response.ok || payload?.ok === false || !user) {
        throw new Error(payload?.message || payload?.error || "کد ورود تأیید نشد.");
      }
      await onSuccess({ user, profileComplete: payload?.data?.profileComplete === true });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "کد ورود تأیید نشد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <CustomInput
        value={phone}
        placeholder="شماره موبایل"
        autoComplete="tel"
        inputMode="tel"
        maxLength={11}
        pattern="09\d{9}"
        aria-label="شماره موبایل"
        onChange={(event) => {
          setPhone(event.target.value);
          resetVerification();
        }}
      />
      <CustomInput
        value={email}
        type="email"
        placeholder="ایمیل"
        autoComplete="email"
        aria-label="ایمیل"
        onChange={(event) => {
          setEmail(event.target.value);
          resetVerification();
        }}
      />
      {codeSent ? (
        <CustomInput
          value={code}
          placeholder="کد ۶ رقمی ایمیل"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          aria-label="کد ورود ایمیل‌شده"
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") void verifyCode();
          }}
        />
      ) : null}
      {codeSent ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <CustomButton fullWidth icon={<IoLogInOutline />} isLoading={loading} onClick={() => void verifyCode()}>
            <span>{submitLabel}</span>
          </CustomButton>
          <CustomButton
            fullWidth
            variant="neutral"
            icon={<IoMailOutline />}
            disabled={loading || cooldown > 0}
            onClick={() => void requestCode()}
          >
            <span>{cooldown > 0 ? `ارسال دوباره تا ${cooldown} ثانیه` : "ارسال دوباره کد"}</span>
          </CustomButton>
        </div>
      ) : (
        <CustomButton fullWidth icon={<IoMailOutline />} isLoading={loading} onClick={() => void requestCode()}>
          <span>ارسال کد ورود به ایمیل</span>
        </CustomButton>
      )}
      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-base p-2 text-sm font-semibold text-primary-text">
          <span>{status}</span>
        </div>
      ) : null}
    </div>
  );
}
