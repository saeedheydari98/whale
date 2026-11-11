"use client";

import { CustomTable, CustomTableRow, CustomSortHeader as SortHeaderButton } from "@/app/design-system/components/ui/table";

import { useState } from "react";
import { useAdminPagedCollection } from "@/hooks/use-admin-paged-collection";
import { IoSearchOutline } from "react-icons/io5";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomTag } from "@/app/design-system/components/ui/tag";
import {
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

function UserTableRow({
  user,
  onSelectUser,
  isLoading = false,
  selectionLabel = "انتخاب",
  canSelectUser,
}: {
  user: AdminUser;
  onSelectUser?: (user: AdminUser) => void;
  isLoading?: boolean;
  selectionLabel?: string;
  canSelectUser?: (user: AdminUser) => boolean;
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
          <CustomButton size="sm" variant="neutral" disabled={isLoading || (canSelectUser ? !canSelectUser(user) : false)} onClick={() => onSelectUser(user)}>
            <span>{selectionLabel}</span>
          </CustomButton>
        </div>
      ) : null}
    </CustomTableRow>
  );
}

type AdminUsersPanelProps = {
  totalCount?: number;
  onSelectUser?: (user: AdminUser) => void;
  selectionLabel?: string;
  canSelectUser?: (user: AdminUser) => boolean;
};

export function AdminUsersPanel({ totalCount, onSelectUser, selectionLabel, canSelectUser }: AdminUsersPanelProps) {
  const [tableOpen, setTableOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const params = new URLSearchParams({ q: searchQuery.trim(), sort: sortKey ?? "createdAt", direction: sortDirection });
  const page = useAdminPagedCollection<AdminUser>({ endpoint: "/api/admin/users", itemKey: "users", params: params.toString(), totalCount: searchQuery.trim() ? undefined : totalCount, structureEndpoint: "/api/admin/collections/structure?collection=users", enabled: tableOpen });
  const { items: users, loading } = page;
  const visibleUsers = users;
  const matchingUserCount = page.total ?? users.length;
  useTransientAppMessage(page.error);

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
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <AppHeading level={2} className="text-base font-bold text-primary-text">کاربران</AppHeading>
          <span className="text-xs text-secondary-text">
            {visibleUsers.length.toLocaleString("fa-IR")} از {matchingUserCount.toLocaleString("fa-IR")} حساب کاربری
          </span>
        </div>
        <div className="min-w-0 basis-60 flex-1">
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

      </div>

      <CustomAccordion title="فهرست کاربران" open={tableOpen} onOpenChange={setTableOpen} showStatusLabel={false}>
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
          {...page.collectionProps}
          className="flex w-full flex-col gap-1.5"
          containerProps={{ "aria-live": "polite" }}
          getKey={(user) => user.id}
          lazy
          renderItem={(user) => <UserTableRow user={user} onSelectUser={onSelectUser} selectionLabel={selectionLabel} canSelectUser={canSelectUser} />}
          renderSkeleton={() => (
            <Loading loading="skeleton-structure" isLoading>
              <UserTableRow user={loadingUser} onSelectUser={onSelectUser} isLoading />
            </Loading>
          )}
        />

      </CustomTable>
      </CustomAccordion>
    </section>
  );
}
