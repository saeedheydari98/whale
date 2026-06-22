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
      setStatus("Username and security code are required.");
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

      setStatus("Request sent. Superadmin must approve admin access.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Security code was not accepted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-primary-border bg-primary-card p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="text-xl font-bold text-primary-text">Admin access</div>
        <div className="text-sm text-secondary-text">
          Enter the security code to open the admin panel for the active profile.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <RequiredLabel required className="text-primary-text">Username</RequiredLabel>
        <CustomInput
          value={username}
          placeholder="Enter your username"
          aria-label="Admin username"
          invalid={showRequiredError && !username.trim()}
          onChange={(event) => {
            setUsername(event.target.value);
            setShowRequiredError(false);
            setStatus("");
          }}
        />
        <RequiredLabel required className="text-primary-text">Security code</RequiredLabel>
        <CustomInput
          value={code}
          type="password"
          placeholder="Enter admin code"
          aria-label="Admin access code"
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
        <div className="rounded-md border border-primary-border bg-bg-base px-3 py-2 text-sm font-semibold text-primary-text">
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
        Open admin panel
      </CustomButton>
    </section>
  );
}
