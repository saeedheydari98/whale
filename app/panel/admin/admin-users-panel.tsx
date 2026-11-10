"use client";

import { CustomTable, CustomTableRow, CustomSortHeader as SortHeaderButton } from "@/app/design-system/components/ui/table";

import { useEffect, useMemo, useState } from "react";
import { IoReloadOutline, IoSearchOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomTag } from "@/app/design-system/components/ui/tag";
import {
  adminUserMatchesSearch,
  getAdminUserContact,
  getAdminUserTitle,
} from "@/app/panel/admin/admin-user-compact-row";
import { formatPersianDate } from "@/lib/date-format";
import { formatAmount } from "@/lib/price-format";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { AppHeading } from "@/app/design-system/components/ui/text";

export type AdminUser = {
  id: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
  walletBalance: number;
  createdAt: string;
  orderCount: number;
  orderTotal: number;
  lastOrderAt?: string | null;
  profiles: Array<{ firstName: string; lastName: string; phone: string; email?: string | null }>;
};

type SortKey = "name" | "role" | "createdAt" | "orderCount" | "orderTotal" | "walletBalance" | "lastOrderAt";
type SortDirection = "asc" | "desc";

const loadingUser: AdminUser = {
  id: 0,
  name: "کاربر",
  username: "user",
  email: "user@example.com",
  role: "user",
  walletBalance: 0,
  createdAt: new Date(0).toISOString(),
  orderCount: 0,
  orderTotal: 0,
  lastOrderAt: null,
  profiles: [{ firstName: "نام", lastName: "کاربر", phone: "09" }],
};

function roleLabel(role: string) {
  if (role === "superadmin") return "سوپرادمین";
  if (role === "admin") return "ادمین";
  return "کاربر";
}

function roleVariant(role: string) {
  if (role === "superadmin") return "accent" as const;
  if (role === "admin") return "info" as const;
  return "neutral" as const;
}

function compareUsers(a: AdminUser, b: AdminUser, key: SortKey, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;
  if (key === "name") {
    return factor * getAdminUserTitle(a).localeCompare(getAdminUserTitle(b), "fa");
  }
  if (key === "role") {
    return factor * roleLabel(a.role).localeCompare(roleLabel(b.role), "fa");
  }
  if (key === "createdAt" || key === "lastOrderAt") {
    const left = new Date(a[key] || 0).getTime();
    const right = new Date(b[key] || 0).getTime();
    return factor * (left - right);
  }
  return factor * ((a[key] as number) - (b[key] as number));
}

function UserTableRow({
  user,
  onSelectUser,
  isLoading = false,
}: {
  user: AdminUser;
  onSelectUser?: (user: AdminUser) => void;
  isLoading?: boolean;
}) {
  return (
    <CustomTableRow>
      <div className="flex w-44 shrink-0 flex-col gap-0.5">
        <AppHeading level={3} className="truncate text-xs font-bold text-primary-text">
          {getAdminUserTitle(user)}
        </AppHeading>
        <span className="truncate text-[11px] text-secondary-text">{getAdminUserContact(user)}</span>
      </div>
      <div className="w-24 shrink-0">
        <CustomTag variant={roleVariant(user.role)} size="xs" rounded="full">
          {roleLabel(user.role)}
        </CustomTag>
      </div>
      <span className="w-28 shrink-0 truncate text-xs tabular-nums text-secondary-text">
        {formatPersianDate(user.createdAt) || "—"}
      </span>
      <span className="w-20 shrink-0 truncate text-xs font-bold tabular-nums text-primary-text">
        {user.orderCount.toLocaleString("fa-IR")}
      </span>
      <span className="w-28 shrink-0 truncate text-xs font-bold tabular-nums text-primary">
        {formatAmount(user.orderTotal)}
      </span>
      <span className="w-28 shrink-0 truncate text-xs tabular-nums text-secondary-text">
        {user.lastOrderAt ? formatPersianDate(user.lastOrderAt) : "—"}
      </span>
      <span className="w-28 shrink-0 truncate text-xs font-bold tabular-nums text-primary">
        {formatAmount(user.walletBalance)}
      </span>
      {onSelectUser ? (
        <div className="w-24 shrink-0">
          <CustomButton size="sm" variant="neutral" disabled={isLoading} onClick={() => onSelectUser(user)}>
            <span>انتخاب</span>
          </CustomButton>
        </div>
      ) : null}
    </CustomTableRow>
  );
}

type AdminUsersPanelProps = {
  totalCount?: number;
  onSelectUser?: (user: AdminUser) => void;
};

export function AdminUsersPanel({ totalCount, onSelectUser }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useTransientAppMessage(message);

  const filteredUsers = useMemo(
    () => users.filter((user) => adminUserMatchesSearch(user, searchQuery)),
    [searchQuery, users]
  );

  const sortedUsers = useMemo(
    () => [...filteredUsers].sort((a, b) =>
      compareUsers(a, b, sortKey ?? "createdAt", sortDirection)
    ),
    [filteredUsers, sortDirection, sortKey]
  );
  const displayLimitNumber = Number(displayLimit);
  const visibleUsers = displayLimit === "" || !Number.isFinite(displayLimitNumber)
    ? sortedUsers
    : sortedUsers.slice(0, Math.max(0, Math.floor(displayLimitNumber)));
  const hasSearch = Boolean(searchQuery.trim());
  const collectionTotalCount = loading ? totalCount : visibleUsers.length;
  const matchingUserCount = hasSearch
    ? filteredUsers.length
    : Math.max(users.length, Number(totalCount) || 0);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) throw new Error(data?.showMessage || "دریافت کاربران انجام نشد.");
      const nextUsers = Array.isArray(data?.data?.users) ? data.data.users as AdminUser[] : [];
      setUsers(nextUsers.map((user) => ({
        ...user,
        orderCount: Number(user.orderCount) || 0,
        orderTotal: Number(user.orderTotal) || 0,
        walletBalance: Number(user.walletBalance) || 0,
      })));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "دریافت کاربران انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "name" || key === "role" || key === "createdAt" ? "asc" : "desc");
  };

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <AppHeading level={2} className="text-base font-bold text-primary-text">کاربران</AppHeading>
          <span className="text-xs text-secondary-text">
            {visibleUsers.length.toLocaleString("fa-IR")} از {matchingUserCount.toLocaleString("fa-IR")} حساب کاربری
          </span>
        </div>
        <CustomButton size="sm" variant="neutral" icon={<IoReloadOutline />} onClick={() => void load()} disabled={loading}>
          <span>به‌روزرسانی</span>
        </CustomButton>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <CustomInput
            type="search"
            name="admin-user-search"
            autoComplete="off"
            spellCheck={false}
            value={searchQuery}
            label="جست‌وجوی کاربران"
            aria-label="جست‌وجوی کاربران با نام، موبایل یا ایمیل"
            placeholder="نام، موبایل یا ایمیل…"
            icon={<IoSearchOutline aria-hidden="true" />}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="min-w-56 flex-1">
          <CustomInput
            type="number"
            min={1}
            step={1}
            label="تعداد کاربران قابل نمایش"
            placeholder="تعداد کاربران قابل نمایش…  "
            value={displayLimit}
            aria-label="تعداد کاربران قابل نمایش"
            onChange={(event) => setDisplayLimit(event.target.value)}
          />
        </div>
      </div>

      {!loading && users.length === 0 ? <CustomEmptyState description="کاربری پیدا نشد." /> : null}
      {!loading && users.length > 0 && visibleUsers.length === 0 ? (
        <CustomEmptyState description="کاربری مطابق جست‌وجو یا فیلتر پیدا نشد." size="sm" />
      ) : null}

      <CustomTable columns={onSelectUser ? 8 : 7}>

        <CustomTableRow>
          <div className="w-44 shrink-0">
            <SortHeaderButton
              label="نام / تماس"
              active={sortKey === "name"}
              direction={sortDirection}
              onClick={() => toggleSort("name")}
            />
          </div>
          <div className="w-24 shrink-0">
            <SortHeaderButton
              label="نقش"
              active={sortKey === "role"}
              direction={sortDirection}
              onClick={() => toggleSort("role")}
            />
          </div>
          <div className="w-28 shrink-0">
            <SortHeaderButton
              label="ثبت‌نام"
              active={sortKey === "createdAt"}
              direction={sortDirection}
              onClick={() => toggleSort("createdAt")}
            />
          </div>
          <div className="w-20 shrink-0">
            <SortHeaderButton
              label="تعداد خرید"
              active={sortKey === "orderCount"}
              direction={sortDirection}
              onClick={() => toggleSort("orderCount")}
            />
          </div>
          <div className="w-28 shrink-0">
            <SortHeaderButton
              label="مبلغ کل خرید"
              active={sortKey === "orderTotal"}
              direction={sortDirection}
              onClick={() => toggleSort("orderTotal")}
            />
          </div>
          <div className="w-28 shrink-0">
            <SortHeaderButton
              label="آخرین خرید"
              active={sortKey === "lastOrderAt"}
              direction={sortDirection}
              onClick={() => toggleSort("lastOrderAt")}
            />
          </div>
          <div className="w-28 shrink-0">
            <SortHeaderButton
              label="کیف پول"
              active={sortKey === "walletBalance"}
              direction={sortDirection}
              onClick={() => toggleSort("walletBalance")}
            />
          </div>
          {onSelectUser ? <div className="w-24 shrink-0"><span className="text-[11px] font-bold text-secondary-text">عملیات</span></div> : null}
        </CustomTableRow>

        <DynamicLoadingCollection
          items={visibleUsers}
          isLoading={loading}
          totalCount={collectionTotalCount}
          viewportLimited
          className="flex w-full flex-col gap-1.5"
          containerProps={{ "aria-live": "polite" }}
          getKey={(user) => user.id}
          lazy
          renderItem={(user) => <UserTableRow user={user} onSelectUser={onSelectUser} />}
          renderSkeleton={() => (
            <Loading loading="skeleton-structure" isLoading>
              <UserTableRow user={loadingUser} onSelectUser={onSelectUser} isLoading />
            </Loading>
          )}
        />

      </CustomTable>
    </section>
  );
}
