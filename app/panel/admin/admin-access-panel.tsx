"use client";

import { useState } from "react";
import { IoLockOpenOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { unlockAdminAccessWithCode } from "@/lib/admin-access";

type AdminAccessPanelProps = {
  onUnlock: () => void;
};

export function AdminAccessPanel({ onUnlock }: AdminAccessPanelProps) {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequiredError, setShowRequiredError] = useState(false);

  const submitCode = async () => {
    if (!username.trim() || !code.trim()) {
      setShowRequiredError(true);
      setStatus("نام کاربری و کد امنیتی الزامی است.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const unlocked = await unlockAdminAccessWithCode(code, username.trim().toLowerCase());
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
          برای باز کردن پنل مدیریت، کد امنیتی حساب فعال را وارد کنید.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <RequiredLabel required className="text-primary-text">نام کاربری</RequiredLabel>
        <CustomInput
          value={username}
          placeholder="نام کاربری خود را وارد کنید"
          aria-label="نام کاربری مدیریت"
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
        border="base"
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
