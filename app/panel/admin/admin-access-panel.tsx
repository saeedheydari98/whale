"use client";

import { useEffect, useState } from "react";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { EmailOtpAuthForm } from "@/app/design-system/components/ui/email-otp-auth-form";
import { requestAdminAccess } from "@/lib/admin-access";
import { fetchCurrentUser, hasAdminRole, setCachedAuthUser, type AuthClientUser } from "@/lib/auth-client";
import { getUserPhone } from "@/lib/user-display";

type AdminAccessPanelProps = { onUnlock: () => void };

export function AdminAccessPanel({ onUnlock }: AdminAccessPanelProps) {
  const [authUser, setAuthUser] = useState<AuthClientUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setAuthUser(user);
        if (hasAdminRole(user)) {
          setCachedAuthUser(user);
          onUnlock();
        }
      })
      .catch(() => { if (!cancelled) setAuthUser(null) })
      .finally(() => { if (!cancelled) setCheckingUser(false) });
    return () => { cancelled = true };
  }, [onUnlock]);

  const submitAdminRequest = async (user = authUser) => {
    if (!user) {
      setStatus("برای ثبت درخواست وارد حساب شوید.");
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
      setStatus("درخواست برای مدیر ارشد ارسال شد.");
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ثبت درخواست ناموفق بود.");
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

  const userPhone = getUserPhone(authUser, undefined, { fallbackToUsername: true });

  return (
    <section className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-primary-border bg-primary-card p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="text-xl font-bold text-primary-text">دسترسی مدیریت</div>
        <div className="text-sm text-secondary-text">درخواستتان پس از تأیید مدیر ارشد فعال می‌شود.</div>
      </div>

      {checkingUser ? (
        <div className="flex items-center gap-2 rounded-md border border-primary-border bg-primary-base px-3 py-2 text-sm font-semibold text-primary-text">
          <Loading loading="dots" size="md" />
          <span>در حال بررسی حساب کاربری</span>
        </div>
      ) : authUser ? (
        <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-base p-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-primary-text">درخواست مدیریت</span>
            <span className="text-xs text-secondary-text">شماره درخواست: {userPhone || "ثبت نشده"}</span>
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
            <span>ارسال درخواست</span>
          </CustomButton>
          {!userPhone ? (
            <div className="text-xs font-semibold text-danger-text-nomode">شماره موبایل را در پروفایل کامل کنید.</div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-base p-3">
          <div className="text-sm font-semibold text-primary-text">برای ورود، شماره موبایل و ایمیل خود را تأیید کنید.</div>
          <EmailOtpAuthForm
            purpose="admin"
            submitLabel="تأیید کد و ارسال درخواست"
            onSuccess={({ user }) => finishLogin(user)}
          />
        </div>
      )}

      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-base px-3 py-2 text-sm font-semibold text-primary-text">{status}</div>
      ) : null}
    </section>
  );
}
