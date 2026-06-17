"use client";

import { useEffect, useState } from "react";
import { IoSaveOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { persistCart, readLocalCart } from "@/lib/cart-client";
import {
  EMPTY_USER_PROFILE,
  fetchUserProfile,
  isUserProfileComplete,
  readUserProfile,
  saveUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  type UserProfile,
} from "@/lib/user-profile";

export function UserProfilePanel() {
  const [profileDraft, setProfileDraft] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const syncProfile = () => {
      setProfileDraft(readUserProfile() ?? EMPTY_USER_PROFILE);
    };

    syncProfile();
    void fetchUserProfile().then((profile) => {
      if (profile) setProfileDraft(profile);
    }).catch((error) => {
      console.error("Profile API load error:", error);
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

  const saveProfile = async () => {
    if (!isUserProfileComplete(profileDraft)) {
      setStatus("All profile fields are required.");
      return;
    }

    const nextProfile = {
      firstName: profileDraft.firstName.trim(),
      lastName: profileDraft.lastName.trim(),
      nationalId: profileDraft.nationalId.trim(),
      phone: profileDraft.phone.trim(),
    };

    try {
      const savedProfile = await saveUserProfile(nextProfile);
      setProfileDraft(savedProfile);
      void persistCart(readLocalCart(), savedProfile);
      setStatus("Profile saved to database.");
    } catch {
      setStatus("Profile database save failed.");
    }
  };

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-secondary-border bg-secondary-card p-4 text-primary-text"
    >
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-secondary-text">Profile information</div>
        <div className="text-sm text-secondary-text">
          Edit the information used for checkout.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-secondary-text">First name</div>
          <CustomInput
            value={profileDraft.firstName}
            variant="secondary"
            placeholder="نام"
            required
            aria-label="First name"
            onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-secondary-text">Last name</div>
          <CustomInput
            value={profileDraft.lastName}
            variant="secondary"
            placeholder="نام خانوادگی"
            required
            aria-label="Last name"
            onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-secondary-text">National ID</div>
          <CustomInput
            value={profileDraft.nationalId}
            variant="secondary"
            placeholder="کد ملی"
            required
            inputMode="numeric"
            aria-label="National ID"
            onChange={(event) => updateProfileDraft({ nationalId: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-secondary-text">Phone</div>
          <CustomInput
            value={profileDraft.phone}
            variant="secondary"
            placeholder="شماره تماس"
            required
            inputMode="tel"
            aria-label="Phone"
            onChange={(event) => updateProfileDraft({ phone: event.target.value })}
          />
        </div>
      </div>

      {status ? (
        <div
          className="rounded-md border border-secondary-border bg-secondary-card px-3 py-2 text-sm font-semibold text-secondary-text"
        >
          {status}
        </div>
      ) : null}

      <CustomButton border="base" variant="secondary" icon={<IoSaveOutline />} onClick={saveProfile}>
        Save profile
      </CustomButton>
    </section>
  );
}
