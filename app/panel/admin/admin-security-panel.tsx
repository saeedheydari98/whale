"use client";

import { useEffect, useRef, useState } from "react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import {
  fetchAdminSecurity,
  saveAdminPanelLock,
  saveAdminAccessCode,
} from "@/lib/admin-access";
import { fetchCurrentUser } from "@/lib/auth-client";

type AdminRequest = {
  id: string;
  username: string;
  status: string;
  user?: { name?: string | null; email?: string | null; role?: string | null };
};

let pendingAdminRequests: Promise<AdminRequest[]> | null = null;
let cachedAdminRequests: AdminRequest[] | null = null;

async function fetchAdminRequests(force = false) {
  if (!force && cachedAdminRequests) return cachedAdminRequests;
  if (!force && pendingAdminRequests) return pendingAdminRequests;

  pendingAdminRequests = fetch("/api/admin/security/requests", { cache: "no-store" })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "بارگذاری درخواست‌های مدیریت ناموفق بود.");
      const requests = Array.isArray(data?.data?.requests) ? data.data.requests : [];
      cachedAdminRequests = requests;
      return requests;
    })
    .finally(() => {
      pendingAdminRequests = null;
    });

  return pendingAdminRequests;
}

export function AdminSecurityPanel() {
  const [hasAdminCode, setHasAdminCode] = useState(false);
  const [isPanelLocked, setIsPanelLocked] = useState(false);
  const [currentAdminCode, setCurrentAdminCode] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [confirmAdminCode, setConfirmAdminCode] = useState("");
  const [showCurrentCode, setShowCurrentCode] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [showConfirmAdminCode, setShowConfirmAdminCode] = useState(false);
  const [savingLock, setSavingLock] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [status, setStatus] = useState("");
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [checkedSuperadmin, setCheckedSuperadmin] = useState(false);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [showCodeRequiredErrors, setShowCodeRequiredErrors] = useState(false);
  const codeFormRef = useRef<HTMLDivElement>(null);

  const loadAdminRequests = async (force = false) => {
    setAdminRequests(await fetchAdminRequests(force));
  };

  useEffect(() => {
    void fetchAdminSecurity()
      .then((security) => {
        setHasAdminCode(security.hasCode);
        setIsPanelLocked(security.isPanelLocked);
      })
      .catch((error) => {
        console.error("Admin security load error:", error);
      });
    void fetchCurrentUser()
      .then((user) => {
        const superadmin = user?.username === "09176991556" && user?.role === "superadmin";
        setIsSuperadmin(superadmin);
        setCheckedSuperadmin(true);
        if (superadmin) void loadAdminRequests();
      })
      .catch(() => setCheckedSuperadmin(true));
  }, []);

  const reviewAdminRequest = async (id: string, approved: boolean) => {
    setStatus("");
    try {
      const res = await fetch("/api/admin/security/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "به‌روزرسانی درخواست مدیریت ناموفق بود.");
      await loadAdminRequests(true);
      setStatus(approved ? "درخواست مدیریت تایید شد." : "درخواست مدیریت رد شد.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "به‌روزرسانی درخواست مدیریت ناموفق بود.");
    }
  };

  const togglePanelLock = async (nextLocked: boolean) => {
    const previousLocked = isPanelLocked;
    setIsPanelLocked(nextLocked);
    setSavingLock(true);
    setStatus("");

    try {
      const saved = await saveAdminPanelLock(nextLocked);
      setHasAdminCode(saved.hasCode);
      setIsPanelLocked(saved.isPanelLocked);
      setStatus(saved.isPanelLocked ? "پنل مدیریت برای دیگر کاربران قفل شد." : "پنل مدیریت برای همه باز است.");
    } catch (error) {
      setIsPanelLocked(previousLocked);
      setStatus(error instanceof Error ? error.message : "به‌روزرسانی قفل مدیریت ناموفق بود.");
    } finally {
      setSavingLock(false);
    }
  };

  const saveSecurityCode = async () => {
    if ((hasAdminCode && !currentAdminCode.trim()) || !adminCode.trim() || !confirmAdminCode.trim()) {
      setShowCodeRequiredErrors(true);
      setStatus("فیلدهای ضروری کد مدیریت باید تکمیل شوند.");
      window.setTimeout(() => scrollToFirstInvalidField(codeFormRef.current), 0);
      return;
    }

    setSavingCode(true);
    setStatus("");

    try {
      const saved = await saveAdminAccessCode(currentAdminCode, adminCode, confirmAdminCode);
      setHasAdminCode(saved.hasCode);
      setIsPanelLocked(saved.isPanelLocked);
      setCurrentAdminCode("");
      setAdminCode("");
      setConfirmAdminCode("");
      setShowCodeRequiredErrors(false);
      setStatus(
        saved.isPanelLocked
          ? "کد امنیتی مدیریت ذخیره شد. دسترسی مدیریت تا ورود دوباره کد قفل می‌ماند."
          : "کد امنیتی مدیریت ذخیره شد. پنل مدیریت تا زمان قفل شدن برای همه باز می‌ماند."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ذخیره کد امنیتی مدیریت ناموفق بود.");
    } finally {
      setSavingCode(false);
    }
  };

  const passwordVisibilityButton = (isVisible: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      aria-label={label}
      className="flex items-center justify-center text-lg text-secondary-text transition-colors hover:text-primary-text"
      onClick={onClick}
    >
      {isVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
    </button>
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-bg p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-primary-text">قفل پنل مدیریت</div>
        <div className="text-sm text-primary-text">
          کدی را تنظیم کنید که دسترسی مدیریت را برای هر پروفایل باز می‌کند.
        </div>
      </div>

      {checkedSuperadmin && !isSuperadmin ? (
        <div className="rounded-md border border-primary-border bg-primary-card px-3 py-2 text-sm font-semibold text-primary-text">
          فقط حساب مدیر ارشد می‌تواند تنظیمات امنیت مدیریت را تغییر دهد.
        </div>
      ) : null}

      {isSuperadmin ? (
        <>
      <div ref={codeFormRef} className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
        <input
          type="text"
          name="admin-security-username"
          autoComplete="username"
          value="admin"
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-bold text-primary-text">دسترسی پنل</div>
            <span className="text-xs text-secondary-text">
              {isPanelLocked ? "قفل: فقط پروفایل‌های تاییدشده می‌توانند پنل مدیریت را باز کنند." : "باز: همه می‌توانند پنل مدیریت را باز کنند."}
            </span>
          </div>
          <CustomSwitch
            checked={isPanelLocked}
            onChange={togglePanelLock}
            isLoading={savingLock}
            label={isPanelLocked ? "قفل" : "باز"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-bold text-primary-text">کد امنیتی مدیریت</div>
          <span className="text-xs text-secondary-text">
            {hasAdminCode ? "کد اختصاصی فعال است." : "برای دسترسی مدیریت یک کد اختصاصی تنظیم کنید."}
          </span>
        </div>
        {hasAdminCode ? (
          <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-primary-text">کد فعلی</RequiredLabel>
          <CustomInput
            name="admin-security-current-code"
            value={currentAdminCode}
            type={showCurrentCode ? "text" : "password"}
            placeholder="کد فعلی"
            autoComplete="current-password"
            aria-label="کد امنیتی فعلی مدیریت"
            invalid={showCodeRequiredErrors && !currentAdminCode.trim()}
            showLabel={false}
            iconAfter={passwordVisibilityButton(
              showCurrentCode,
              () => setShowCurrentCode((isVisible) => !isVisible),
              showCurrentCode ? "پنهان کردن کد فعلی مدیریت" : "نمایش کد فعلی مدیریت"
            )}
            onChange={(event) => {
              setCurrentAdminCode(event.target.value);
              setStatus("");
            }}
          />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
        <RequiredLabel required className="text-primary-text">کد جدید</RequiredLabel>
        <CustomInput
          name="admin-security-new-code"
          value={adminCode}
          type={showAdminCode ? "text" : "password"}
          placeholder="کد جدید"
          autoComplete="new-password"
          aria-label="کد امنیتی جدید مدیریت"
          invalid={showCodeRequiredErrors && !adminCode.trim()}
          showLabel={false}
          iconAfter={passwordVisibilityButton(
            showAdminCode,
            () => setShowAdminCode((isVisible) => !isVisible),
            showAdminCode ? "پنهان کردن کد جدید مدیریت" : "نمایش کد جدید مدیریت"
          )}
          onChange={(event) => {
            setAdminCode(event.target.value);
            setStatus("");
          }}
        />
        </div>
        <div className="flex flex-col gap-2">
        <RequiredLabel required className="text-primary-text">تکرار کد جدید</RequiredLabel>
        <CustomInput
          name="admin-security-confirm-code"
          value={confirmAdminCode}
          type={showConfirmAdminCode ? "text" : "password"}
          placeholder="تکرار کد جدید"
          autoComplete="new-password"
          aria-label="تکرار کد امنیتی جدید مدیریت"
          invalid={showCodeRequiredErrors && !confirmAdminCode.trim()}
          showLabel={false}
          iconAfter={passwordVisibilityButton(
            showConfirmAdminCode,
            () => setShowConfirmAdminCode((isVisible) => !isVisible),
            showConfirmAdminCode ? "پنهان کردن تکرار کد مدیریت" : "نمایش تکرار کد مدیریت"
          )}
          onChange={(event) => {
            setConfirmAdminCode(event.target.value);
            setStatus("");
          }}
        />
        </div>
        <CustomButton
          fullWidth
          isLoading={savingCode}
          loading="dots"
          loadingText="Saving..."
          onClick={saveSecurityCode}
        >
          ذخیره کد امنیتی
        </CustomButton>
      </div>

      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-bg px-3 py-2 text-sm font-semibold text-primary-text">
          {status}
        </div>
      ) : null}

        <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-bold text-primary-text">درخواست‌های مدیریت</div>
            <span className="text-xs text-secondary-text">کاربرانی را که کد مدیریت را وارد کرده‌اند تایید کنید.</span>
          </div>
          {adminRequests.length === 0 ? (
            <span className="text-xs text-secondary-text">هنوز درخواستی ثبت نشده است.</span>
          ) : (
            <div className="flex flex-col gap-2">
              {adminRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-bg p-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-primary-text">{request.username}</span>
                    <span className="text-xs text-secondary-text">{request.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <CustomButton size="sm" onClick={() => void reviewAdminRequest(request.id, true)}>
                      تایید
                    </CustomButton>
                    <CustomButton size="sm" variant="danger" onClick={() => void reviewAdminRequest(request.id, false)}>
                      رد
                    </CustomButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      ) : null}
    </section>
  );
}
