import type { ReactNode } from "react";

export type CompactAdminUser = {
  id: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string;
  profiles: Array<{
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  }>;
};

export function getAdminUserTitle(user: CompactAdminUser) {
  const profile = user.profiles[0];
  return `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim()
    || user.name
    || user.username
    || user.email
    || `کاربر ${user.id}`;
}

export function getAdminUserContact(user: CompactAdminUser) {
  const profile = user.profiles[0];
  return profile?.phone || profile?.email || user.username || user.email || `شناسه ${user.id}`;
}

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase("fa")
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .trim();
}

export function adminUserMatchesSearch(user: CompactAdminUser, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const profile = user.profiles[0];
  return [
    getAdminUserTitle(user),
    profile?.phone,
    profile?.email,
    user.email,
    user.username,
    user.role,
    String(user.id),
  ].some((value) => normalizeSearchValue(String(value ?? "")).includes(normalizedQuery));
}

type AdminUserCompactRowProps = {
  user: CompactAdminUser;
  meta?: ReactNode;
  trailing?: ReactNode;
  onSelect?: () => void;
};

function RowContent({ user, meta, trailing }: Omit<AdminUserCompactRowProps, "onSelect">) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-bold text-primary-text">{getAdminUserTitle(user)}</span>
        <span className="truncate text-[11px] text-secondary-text">{getAdminUserContact(user)}</span>
      </span>
      {meta ? <span className="hidden min-w-0 shrink text-[10px] text-secondary-text sm:flex">{meta}</span> : null}
      {trailing ? <span className="flex shrink-0 items-center text-[11px] font-bold text-primary">{trailing}</span> : null}
    </>
  );
}

export function AdminUserCompactRow({ user, meta, trailing, onSelect }: AdminUserCompactRowProps) {
  const className = "flex min-h-11 w-full items-center gap-2 rounded-md border border-primary-border bg-primary-card px-2.5 py-1.5 text-right";

  if (onSelect) {
    return (
      <button
        type="button"
        aria-label={`انتخاب ${getAdminUserTitle(user)}`}
        className={`${className} cursor-pointer transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary`}
        onClick={onSelect}
      >
        <RowContent user={user} meta={meta} trailing={trailing} />
      </button>
    );
  }

  return (
    <div className={className}>
      <RowContent user={user} meta={meta} trailing={trailing} />
    </div>
  );
}
