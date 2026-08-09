type ProfileLike = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
};

type UserLike = {
  username?: string | null;
  profile?: unknown;
} | null | undefined;

function readProfile(value: unknown): ProfileLike | null {
  return value && typeof value === "object" ? value as ProfileLike : null;
}

export function getProfileFullName(profile: unknown) {
  const record = readProfile(profile);
  return `${record?.firstName ?? ""} ${record?.lastName ?? ""}`.trim();
}

export function getProfilePhone(profile: unknown) {
  return String(readProfile(profile)?.phone || "").trim();
}

export function getProfileMarketingEmail(profile: unknown) {
  return String(readProfile(profile)?.email || "").trim();
}

export function getUserPhone(user: UserLike, preferredProfile?: unknown, options?: { fallbackToUsername?: boolean }) {
  const phone = getProfilePhone(preferredProfile ?? user?.profile);
  if (phone) return phone;
  return options?.fallbackToUsername ? String(user?.username || "").trim() : "";
}
