"use client";

import { useEffect, useRef, useState } from "react";
import { IoKeyOutline, IoLogInOutline, IoSaveOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { RequiredLabel } from "@/app/design-system/components/ui/required-label";
import { persistCart, readLocalCart } from "@/lib/cart-client";
import { scrollToFirstInvalidField } from "@/lib/form-validation";
import {
  EMPTY_USER_PROFILE,
  fetchUserProfile,
  isUserProfileComplete,
  readUserProfile,
  saveUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  type UserProfile,
} from "@/lib/user-profile";
import { fetchCurrentUser, setCachedAuthUser } from "@/lib/auth-client";

type PanelUser = {
  username?: string | null;
  email?: string | null;
  name?: string | null;
};

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const NAME_PATTERN = /^[\p{L}][\p{L}\s'-]{1,49}$/u;
const NATIONAL_ID_PATTERN = /^\d{10}$/;
const PHONE_PATTERN = /^09\d{9}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_REGISTER = {
  username: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

const EMPTY_PASSWORD = {
  currentPassword: "",
  password: "",
  passwordConfirm: "",
};

function isLocalEmail(email?: string | null) {
  return Boolean(email?.endsWith("@local.user"));
}

export function UserProfilePanel() {
  const [profileDraft, setProfileDraft] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [registerDraft, setRegisterDraft] = useState(EMPTY_REGISTER);
  const [passwordDraft, setPasswordDraft] = useState(EMPTY_PASSWORD);
  const [authUser, setAuthUser] = useState<PanelUser | null>(null);
  const [status, setStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncProfile = () => {
      setProfileDraft(readUserProfile() ?? EMPTY_USER_PROFILE);
    };

    syncProfile();
    void Promise.all([
      fetchUserProfile().catch(() => null),
      fetchCurrentUser(),
    ]).then(([profile, user]) => {
      if (profile) setProfileDraft(profile);
      setAuthUser(user);
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

  const cleanProfile = () => ({
    firstName: profileDraft.firstName.trim(),
    lastName: profileDraft.lastName.trim(),
    nationalId: profileDraft.nationalId.trim(),
    birthDate: profileDraft.birthDate.trim(),
    phone: profileDraft.phone.trim(),
    address: profileDraft.address.trim(),
    isAdminUnlocked: profileDraft.isAdminUnlocked,
  });

  const validateProfile = () => {
    if (
      isUserProfileComplete(profileDraft) &&
      NAME_PATTERN.test(profileDraft.firstName.trim()) &&
      NAME_PATTERN.test(profileDraft.lastName.trim()) &&
      NATIONAL_ID_PATTERN.test(profileDraft.nationalId.trim()) &&
      PHONE_PATTERN.test(profileDraft.phone.trim()) &&
      profileDraft.address.trim().length >= 5 &&
      profileDraft.address.trim().length <= 200 &&
      Boolean(profileDraft.birthDate.trim()) &&
      new Date(profileDraft.birthDate).getTime() <= Date.now()
    ) return true;
    setShowRequiredErrors(true);
    setStatus("Please enter valid profile information.");
    window.setTimeout(() => scrollToFirstInvalidField(formRef.current), 0);
    return false;
  };

  const saveProfile = async () => {
    if (!validateProfile()) return;

    setIsSavingProfile(true);
    try {
      const savedProfile = await saveUserProfile(cleanProfile());
      setProfileDraft(savedProfile);
      setShowRequiredErrors(false);
      void persistCart(readLocalCart(), savedProfile);
      setStatus("Profile saved.");
    } catch {
      setStatus("Profile database save failed.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const registerAndLogin = async () => {
    if (!validateProfile()) return;
    if (!registerDraft.username.trim() || !registerDraft.password || !registerDraft.passwordConfirm) {
      setStatus("Username and password confirmation are required.");
      return;
    }
    if (!USERNAME_PATTERN.test(registerDraft.username.trim().toLowerCase())) {
      setStatus("Username must be 3-32 lowercase letters, numbers, dot, dash, or underscore.");
      return;
    }
    if (registerDraft.email.trim() && !EMAIL_PATTERN.test(registerDraft.email.trim())) {
      setStatus("Email format is not valid.");
      return;
    }
    if (!PASSWORD_PATTERN.test(registerDraft.password)) {
      setStatus("Password must be 8-72 characters and include at least one letter and one number.");
      return;
    }
    if (registerDraft.password !== registerDraft.passwordConfirm) {
      setStatus("Password confirmation does not match.");
      return;
    }

    setIsRegistering(true);
    try {
      const profile = cleanProfile();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: registerDraft.username.trim().toLowerCase(),
          email: registerDraft.email.trim() || undefined,
          password: registerDraft.password,
          passwordConfirm: registerDraft.passwordConfirm,
          profile,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Account creation failed.");
      const savedProfile = (await fetchUserProfile(profile.nationalId).catch(() => null)) ?? profile;
      const user = data?.data?.user ?? null;
      setCachedAuthUser(user);
      setAuthUser(user);
      setProfileDraft(savedProfile);
      setRegisterDraft(EMPTY_REGISTER);
      setShowRequiredErrors(false);
      setStatus("Account created and signed in.");
      void persistCart(readLocalCart(), savedProfile);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Account creation failed.");
    } finally {
      setIsRegistering(false);
    }
  };

  const changePassword = async () => {
    if (!passwordDraft.currentPassword || !passwordDraft.password || !passwordDraft.passwordConfirm) {
      setPasswordStatus("All password fields are required.");
      return;
    }
    if (!PASSWORD_PATTERN.test(passwordDraft.password)) {
      setPasswordStatus("New password must be 8-72 characters and include at least one letter and one number.");
      return;
    }
    if (passwordDraft.password !== passwordDraft.passwordConfirm) {
      setPasswordStatus("Password confirmation does not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordDraft.currentPassword,
          password: passwordDraft.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Password change failed.");
      setPasswordDraft(EMPTY_PASSWORD);
      setShowPasswordForm(false);
      setPasswordStatus("Password changed. Please sign in again if needed.");
    } catch (error) {
      setPasswordStatus(error instanceof Error ? error.message : "Password change failed.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-secondary-border bg-secondary-card p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-secondary-text">
          {authUser ? "Profile information" : "Create account"}
        </div>
        <div className="text-sm text-secondary-text">
          {authUser ? "Edit the information used for checkout." : "Complete the required customer profile to sign in automatically."}
        </div>
      </div>

      {authUser ? (
        <div className="flex flex-col gap-2 rounded-md border border-secondary-border bg-bg-base p-3">
          <RequiredLabel className="text-secondary-text">Username</RequiredLabel>
          <CustomInput
            value={authUser.username || ""}
            variant="secondary"
            disabled
            showLabel={false}
            autoComplete="username"
            aria-label="Username"
          />
          {!isLocalEmail(authUser.email) && authUser.email ? (
            <span className="text-xs font-semibold text-secondary-text">{authUser.email}</span>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-secondary-border bg-bg-base p-3">
          <div className="flex flex-col gap-2">
            <RequiredLabel required className="text-secondary-text">Username</RequiredLabel>
            <CustomInput
              value={registerDraft.username}
              variant="secondary"
              placeholder="username"
              pattern="[a-z0-9._-]{3,32}"
              title="3-32 lowercase letters, numbers, dot, dash, or underscore"
              autoComplete="username"
              required
              invalid={showRequiredErrors && !registerDraft.username.trim()}
              showLabel={false}
              aria-label="Username"
              onChange={(event) => {
                setRegisterDraft((current) => ({ ...current, username: event.target.value }));
                setStatus("");
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel className="text-secondary-text">Email</RequiredLabel>
            <CustomInput
              value={registerDraft.email}
              variant="secondary"
              type="email"
              placeholder="email"
              autoComplete="email"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              showLabel={false}
              aria-label="Email"
              onChange={(event) => setRegisterDraft((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel required className="text-secondary-text">Password</RequiredLabel>
            <CustomInput
              value={registerDraft.password}
              variant="secondary"
              type="password"
              placeholder="password"
              autoComplete="new-password"
              pattern="(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}"
              title="8-72 characters with at least one letter and one number"
              required
              invalid={showRequiredErrors && !registerDraft.password}
              showLabel={false}
              aria-label="Password"
              onChange={(event) => {
                setRegisterDraft((current) => ({ ...current, password: event.target.value }));
                setStatus("");
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel required className="text-secondary-text">Confirm password</RequiredLabel>
            <CustomInput
              value={registerDraft.passwordConfirm}
              variant="secondary"
              type="password"
              placeholder="confirm password"
              autoComplete="new-password"
              pattern="(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}"
              required
              invalid={showRequiredErrors && !registerDraft.passwordConfirm}
              showLabel={false}
              aria-label="Confirm password"
              onChange={(event) => {
                setRegisterDraft((current) => ({ ...current, passwordConfirm: event.target.value }));
                setStatus("");
              }}
            />
          </div>
        </div>
      )}

      <div ref={formRef} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-secondary-text">First name</RequiredLabel>
          <CustomInput
            value={profileDraft.firstName}
            variant="secondary"
            placeholder="first name"
            pattern="[\p{L}][\p{L}\s'-]{1,49}"
            required
            invalid={showRequiredErrors && !NAME_PATTERN.test(profileDraft.firstName.trim())}
            showLabel={false}
            aria-label="First name"
            onChange={(event) => updateProfileDraft({ firstName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-secondary-text">Last name</RequiredLabel>
          <CustomInput
            value={profileDraft.lastName}
            variant="secondary"
            placeholder="last name"
            pattern="[\p{L}][\p{L}\s'-]{1,49}"
            required
            invalid={showRequiredErrors && !NAME_PATTERN.test(profileDraft.lastName.trim())}
            showLabel={false}
            aria-label="Last name"
            onChange={(event) => updateProfileDraft({ lastName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-secondary-text">National ID</RequiredLabel>
          <CustomInput
            value={profileDraft.nationalId}
            variant="secondary"
            placeholder="national id"
            pattern="\d{10}"
            maxLength={10}
            required
            invalid={showRequiredErrors && !NATIONAL_ID_PATTERN.test(profileDraft.nationalId.trim())}
            showLabel={false}
            inputMode="numeric"
            aria-label="National ID"
            onChange={(event) => updateProfileDraft({ nationalId: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-secondary-text">Birth date</RequiredLabel>
          <CustomInput
            value={profileDraft.birthDate}
            variant="secondary"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            required
            invalid={showRequiredErrors && (!profileDraft.birthDate.trim() || new Date(profileDraft.birthDate).getTime() > Date.now())}
            showLabel={false}
            aria-label="Birth date"
            onChange={(event) => updateProfileDraft({ birthDate: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-secondary-text">Phone</RequiredLabel>
          <CustomInput
            value={profileDraft.phone}
            variant="secondary"
            placeholder="phone"
            pattern="09\d{9}"
            maxLength={11}
            required
            invalid={showRequiredErrors && !PHONE_PATTERN.test(profileDraft.phone.trim())}
            showLabel={false}
            inputMode="tel"
            aria-label="Phone"
            onChange={(event) => updateProfileDraft({ phone: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <RequiredLabel required className="text-secondary-text">Address</RequiredLabel>
          <CustomInput
            value={profileDraft.address}
            variant="secondary"
            placeholder="address"
            minLength={5}
            maxLength={200}
            required
            invalid={showRequiredErrors && (profileDraft.address.trim().length < 5 || profileDraft.address.trim().length > 200)}
            showLabel={false}
            aria-label="Address"
            onChange={(event) => updateProfileDraft({ address: event.target.value })}
          />
        </div>
      </div>

      {status ? (
        <div className="rounded-md border border-secondary-border bg-secondary-card px-3 py-2 text-sm font-semibold text-secondary-text">
          {status}
        </div>
      ) : null}

      <CustomButton
        border="base"
        variant="secondary"
        icon={authUser ? <IoSaveOutline /> : <IoLogInOutline />}
        isLoading={authUser ? isSavingProfile : isRegistering}
        onClick={authUser ? saveProfile : registerAndLogin}
      >
        {authUser ? "Save profile" : "Create account and sign in"}
      </CustomButton>

      {authUser ? (
        <div className="flex flex-col gap-3 rounded-lg border border-secondary-border bg-bg-base p-3">
          {showPasswordForm ? (
            <>
              <div className="text-sm font-bold text-secondary-text">Change password</div>
              <CustomInput
                value={passwordDraft.currentPassword}
                variant="secondary"
                type="password"
                placeholder="current password"
                autoComplete="current-password"
                aria-label="Current password"
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }));
                  setPasswordStatus("");
                }}
              />
              <CustomInput
                value={passwordDraft.password}
                variant="secondary"
                type="password"
                placeholder="new password"
                autoComplete="new-password"
                pattern="(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}"
                aria-label="New password"
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, password: event.target.value }));
                  setPasswordStatus("");
                }}
              />
              <CustomInput
                value={passwordDraft.passwordConfirm}
                variant="secondary"
                type="password"
                placeholder="confirm new password"
                autoComplete="new-password"
                pattern="(?=.*[A-Za-z])(?=.*\d)[^\s]{8,72}"
                aria-label="Confirm new password"
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, passwordConfirm: event.target.value }));
                  setPasswordStatus("");
                }}
              />
            </>
          ) : null}
          {passwordStatus ? (
            <div className="rounded-md border border-secondary-border bg-secondary-card px-3 py-2 text-sm font-semibold text-secondary-text">
              {passwordStatus}
            </div>
          ) : null}
          <CustomButton
            border="base"
            variant="secondary"
            icon={<IoKeyOutline />}
            isLoading={isChangingPassword}
            onClick={showPasswordForm ? changePassword : () => setShowPasswordForm(true)}
          >
            Change password
          </CustomButton>
        </div>
      ) : null}
    </section>
  );
}
