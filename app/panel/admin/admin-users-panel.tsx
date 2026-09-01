"use client";

import { useEffect, useMemo, useState } from "react";
import { IoReloadOutline, IoSearchOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { AdminUserCompactRow, adminUserMatchesSearch } from "@/app/panel/admin/admin-user-compact-row";
import { formatPersianDate } from "@/lib/date-format";
import { formatAmount } from "@/lib/price-format";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";

type AdminUser = {
  id: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
  walletBalance: number;
  createdAt: string;
  profiles: Array<{ firstName: string; lastName: string; phone: string; email?: string | null }>;
};

const loadingUser: AdminUser = {
  id: 0,
  name: "کاربر",
  username: "user",
  email: "user@example.com",
  role: "user",
  walletBalance: 0,
  createdAt: new Date(0).toISOString(),
  profiles: [{ firstName: "نام", lastName: "کاربر", phone: "09" }],
};

type AdminUsersPanelProps = {
  totalCount?: number;
};

export function AdminUsersPanel({ totalCount }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [, setCapacity] = useState(0);
  const [message, setMessage] = useState("");
  useTransientAppMessage(message);
  const filteredUsers = useMemo(
    () => users.filter((user) => adminUserMatchesSearch(user, searchQuery)),
    [searchQuery, users]
  );

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) throw new Error(data?.message || "دریافت کاربران انجام نشد.");
      setUsers(Array.isArray(data?.data?.users) ? data.data.users : []);
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

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold text-primary-text">کاربران</div>
          <span className="text-xs text-secondary-text">{filteredUsers.length} از {Math.max(users.length, Number(totalCount) || 0)} حساب کاربری</span>
        </div>
        <CustomButton size="sm" variant="neutral" icon={<IoReloadOutline />} onClick={() => void load()} isLoading={loading}>
          <span>به‌روزرسانی</span>
        </CustomButton>
      </div>
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
      {!loading && users.length === 0 ? <CustomEmptyState description="کاربری پیدا نشد." /> : null}
      {!loading && users.length > 0 && filteredUsers.length === 0 ? <CustomEmptyState description="کاربری مطابق جست‌وجو پیدا نشد." size="sm" /> : null}
      <DynamicLoadingCollection
        items={filteredUsers}
        isLoading={loading && users.length === 0}
        totalCount={searchQuery.trim() ? filteredUsers.length : totalCount}
        onCapacityChange={searchQuery.trim() || totalCount === undefined ? undefined : setCapacity}
        className="flex w-full flex-col gap-1.5"
        containerProps={{ "aria-live": "polite" }}
        getKey={(user) => user.id}
        lazy
        renderItem={(user) => (
          <AdminUserCompactRow
            user={user}
            meta={<span>{user.role} · {formatPersianDate(user.createdAt)}</span>}
            trailing={<span className="tabular-nums">{formatAmount(user.walletBalance)}</span>}
          />
        )}
        renderSkeleton={() => (
          <Loading loading="skeleton-structure" isLoading>
            <AdminUserCompactRow
              user={loadingUser}
              meta={<span>{loadingUser.role} · {formatPersianDate(loadingUser.createdAt)}</span>}
              trailing={<span className="tabular-nums">{formatAmount(loadingUser.walletBalance)}</span>}
            />
          </Loading>
        )}
      />
    </section>
  );
}
