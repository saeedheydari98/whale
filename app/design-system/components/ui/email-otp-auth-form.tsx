"use client";

import { useEffect, useRef, useState } from "react";
import { IoArrowForwardOutline, IoLogInOutline, IoMailOutline } from "react-icons/io5";
import { CustomButton } from "./button";
import { CustomInput } from "./input";
import type { AuthClientUser } from "@/lib/auth-client";
import {
  EMAIL_PATTERN,
  NON_ASCII_DIGIT_PATTERN,
  OTP_CODE_PATTERN,
  PHONE_PATTERN,
  PHONE_PATTERN_SOURCE,
} from "@/lib/validation-patterns";

const OTP_LENGTH = 6;

function emptyOtpDigits() {
  return Array.from({ length: OTP_LENGTH }, () => "");
}

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
  const [codeDigits, setCodeDigits] = useState<string[]>(emptyOtpDigits);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const code = codeDigits.join("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resetVerification = () => {
    setCodeDigits(emptyOtpDigits());
    setCodeSent(false);
    setCooldown(0);
    setStatus("");
  };

  const focusOtpInput = (index: number) => {
    otpInputRefs.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();
  };

  const fillOtpDigits = (startIndex: number, value: string) => {
    const digits = value.replace(NON_ASCII_DIGIT_PATTERN, "").slice(0, OTP_LENGTH - startIndex).split("");
    if (digits.length === 0) return;
    setCodeDigits((current) => {
      const next = [...current];
      digits.forEach((digit, offset) => {
        next[startIndex + offset] = digit;
      });
      return next;
    });
    focusOtpInput(Math.min(startIndex + digits.length, OTP_LENGTH - 1));
    setStatus("");
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digits = value.replace(NON_ASCII_DIGIT_PATTERN, "");
    if (digits.length > 1) {
      fillOtpDigits(index, digits);
      return;
    }

    setCodeDigits((current) => {
      const next = [...current];
      next[index] = digits;
      return next;
    });
    if (digits && index < OTP_LENGTH - 1) focusOtpInput(index + 1);
    setStatus("");
  };

  const returnToIdentity = () => {
    setCodeDigits(emptyOtpDigits());
    setCodeSent(false);
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
      setCodeDigits(emptyOtpDigits());
      setCodeSent(true);
      setCooldown(Math.max(1, Math.round(Number(payload?.data?.retryAfterSeconds) || 60)));
      setStatus(payload?.data?.developmentCode
        ? `کد توسعه: ${payload.data.developmentCode}`
        : `کد ورود به ${email.trim().toLowerCase()} ارسال شد.`);
      window.requestAnimationFrame(() => focusOtpInput(0));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ارسال کد ورود ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!validateIdentity()) return;
    if (!OTP_CODE_PATTERN.test(code)) {
      setStatus("کد ورود باید ۶ رقم باشد.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), email: email.trim().toLowerCase(), code, purpose }),
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
      {codeSent ? (
        <div className="flex flex-col gap-3">
          <CustomButton
            size="sm"
            variant="neutral"
            className="self-end"
            icon={<IoArrowForwardOutline />}
            onClick={returnToIdentity}
          >
            <span>بازگشت و ویرایش اطلاعات</span>
          </CustomButton>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-primary-text">
              <span>کد ۶ رقمی ارسال‌شده را وارد کنید.</span>
            </div>
            <div dir="ltr" className="flex w-full justify-center gap-2" onPaste={(event) => {
              const pastedDigits = event.clipboardData.getData("text").replace(NON_ASCII_DIGIT_PATTERN, "");
              if (!pastedDigits) return;
              event.preventDefault();
              fillOtpDigits(0, pastedDigits);
            }}>
              {codeDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    otpInputRefs.current[index] = element;
                  }}
                  value={digit}
                  dir="ltr"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`رقم ${index + 1} از کد ورود`}
                  className="h-12 min-w-0 max-w-12 flex-1 rounded-md border border-primary-border bg-primary-bg p-0 text-center text-xl font-bold leading-[3rem] text-primary-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-border disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ direction: "ltr", textAlign: "center", paddingInline: 0 }}
                  disabled={loading}
                  onChange={(event) => updateOtpDigit(index, event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !codeDigits[index] && index > 0) {
                      event.preventDefault();
                      setCodeDigits((current) => {
                        const next = [...current];
                        next[index - 1] = "";
                        return next;
                      });
                      focusOtpInput(index - 1);
                    }
                    if (event.key === "ArrowLeft" && index > 0) focusOtpInput(index - 1);
                    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) focusOtpInput(index + 1);
                    if (event.key === "Enter") void verifyCode();
                  }}
                />
              ))}
            </div>
          </div>
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
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <CustomInput
            value={phone}
            placeholder="شماره موبایل"
            autoComplete="tel"
            inputMode="tel"
            maxLength={11}
            pattern={PHONE_PATTERN_SOURCE}
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
          <CustomButton fullWidth icon={<IoMailOutline />} isLoading={loading} onClick={() => void requestCode()}>
            <span>ارسال کد ورود به ایمیل</span>
          </CustomButton>
        </div>
      )}
      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-base p-2 text-sm font-semibold text-primary-text">
          <span>{status}</span>
        </div>
      ) : null}
    </div>
  );
}
