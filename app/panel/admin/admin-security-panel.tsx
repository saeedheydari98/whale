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

type AdminRequest = {
  id: string;
  username: string;
  status: string;
  user?: { name?: string | null; email?: string | null; role?: string | null };
};

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
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [showCodeRequiredErrors, setShowCodeRequiredErrors] = useState(false);
  const codeFormRef = useRef<HTMLDivElement>(null);

  const loadAdminRequests = async () => {
    const res = await fetch("/api/admin/security/requests", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || data?.ok === false) throw new Error(data?.error || "Admin requests load failed.");
    setAdminRequests(Array.isArray(data?.data?.requests) ? data.data.requests : []);
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
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const user = data?.data?.user;
        const superadmin = user?.username === "saeedheydari98" && user?.role === "superadmin";
        setIsSuperadmin(superadmin);
        if (superadmin) void loadAdminRequests();
      })
      .catch(() => undefined);
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
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Admin request update failed.");
      await loadAdminRequests();
      setStatus(approved ? "Admin request approved." : "Admin request rejected.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin request update failed.");
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
      setStatus(saved.isPanelLocked ? "Admin panel is locked for everyone else." : "Admin panel is open for everyone.");
    } catch (error) {
      setIsPanelLocked(previousLocked);
      setStatus(error instanceof Error ? error.message : "Admin lock update failed.");
    } finally {
      setSavingLock(false);
    }
  };

  const saveSecurityCode = async () => {
    if ((hasAdminCode && !currentAdminCode.trim()) || !adminCode.trim() || !confirmAdminCode.trim()) {
      setShowCodeRequiredErrors(true);
      setStatus("Required admin code fields must be filled.");
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
          ? "Admin security code saved. Admin access is locked until the code is entered again."
          : "Admin security code saved. Admin panel remains open for everyone until locked."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin security code save failed.");
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
        <div className="text-base font-bold text-primary-text">Admin panel lock</div>
        <div className="text-sm text-primary-text">
          Set the code that unlocks admin access for each profile.
        </div>
      </div>

      <div ref={codeFormRef} className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-bold text-primary-text">Panel access</div>
            <span className="text-xs text-secondary-text">
              {isPanelLocked ? "Locked: only unlocked profiles can open admin." : "Unlocked: everyone can open admin."}
            </span>
          </div>
          <CustomSwitch
            checked={isPanelLocked}
            onChange={togglePanelLock}
            isLoading={savingLock}
            label={isPanelLocked ? "Locked" : "Open"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-bold text-primary-text">Admin security code</div>
          <span className="text-xs text-secondary-text">
            {hasAdminCode ? "Custom code is active." : "Set a custom code for admin access."}
          </span>
        </div>
        {hasAdminCode ? (
          <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-primary-text">Current code</RequiredLabel>
          <CustomInput
            value={currentAdminCode}
            type={showCurrentCode ? "text" : "password"}
            placeholder="Current code"
            aria-label="Current admin security code"
            invalid={showCodeRequiredErrors && !currentAdminCode.trim()}
            iconAfter={passwordVisibilityButton(
              showCurrentCode,
              () => setShowCurrentCode((isVisible) => !isVisible),
              showCurrentCode ? "Hide current admin code" : "Show current admin code"
            )}
            onChange={(event) => {
              setCurrentAdminCode(event.target.value);
              setStatus("");
            }}
          />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
        <RequiredLabel required className="text-primary-text">New code</RequiredLabel>
        <CustomInput
          value={adminCode}
          type={showAdminCode ? "text" : "password"}
          placeholder="New code"
          aria-label="New admin security code"
          invalid={showCodeRequiredErrors && !adminCode.trim()}
          iconAfter={passwordVisibilityButton(
            showAdminCode,
            () => setShowAdminCode((isVisible) => !isVisible),
            showAdminCode ? "Hide new admin code" : "Show new admin code"
          )}
          onChange={(event) => {
            setAdminCode(event.target.value);
            setStatus("");
          }}
        />
        </div>
        <div className="flex flex-col gap-2">
        <RequiredLabel required className="text-primary-text">Confirm new code</RequiredLabel>
        <CustomInput
          value={confirmAdminCode}
          type={showConfirmAdminCode ? "text" : "password"}
          placeholder="Confirm new code"
          aria-label="Confirm new admin security code"
          invalid={showCodeRequiredErrors && !confirmAdminCode.trim()}
          iconAfter={passwordVisibilityButton(
            showConfirmAdminCode,
            () => setShowConfirmAdminCode((isVisible) => !isVisible),
            showConfirmAdminCode ? "Hide confirmed admin code" : "Show confirmed admin code"
          )}
          onChange={(event) => {
            setConfirmAdminCode(event.target.value);
            setStatus("");
          }}
        />
        </div>
        <CustomButton
          border="base"
          fullWidth
          isLoading={savingCode}
          loading="dots"
          loadingText="Saving..."
          onClick={saveSecurityCode}
        >
          Save security code
        </CustomButton>
      </div>

      {status ? (
        <div className="rounded-md border border-primary-border bg-primary-bg px-3 py-2 text-sm font-semibold text-primary-text">
          {status}
        </div>
      ) : null}

      {isSuperadmin ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-bold text-primary-text">Admin requests</div>
            <span className="text-xs text-secondary-text">Approve users who entered the admin code.</span>
          </div>
          {adminRequests.length === 0 ? (
            <span className="text-xs text-secondary-text">No requests yet.</span>
          ) : (
            <div className="flex flex-col gap-2">
              {adminRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-bg p-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-primary-text">{request.username}</span>
                    <span className="text-xs text-secondary-text">{request.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <CustomButton size="sm" border="base" onClick={() => void reviewAdminRequest(request.id, true)}>
                      Approve
                    </CustomButton>
                    <CustomButton size="sm" variant="danger" border="base" onClick={() => void reviewAdminRequest(request.id, false)}>
                      Reject
                    </CustomButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
