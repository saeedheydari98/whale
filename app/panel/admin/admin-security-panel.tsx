"use client";

import { CustomTabs } from "@/app/design-system/components/ui/tabs";

import { useEffect, useMemo, useState } from "react";
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoRefreshOutline,
  IoSearchOutline,
  IoShieldCheckmarkOutline,
  IoTrashOutline,
} from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { AppHeading } from "@/app/design-system/components/ui/text";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomTag } from "@/app/design-system/components/ui/tag";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import {
  fetchAdminAccessRequests,
  grantAdminAccessToUser,
  reviewAdminAccessRequest,
  type AdminAccessRequestRecord,
} from "@/lib/admin-access";
import {
  adminUserMatchesSearch,
  getAdminUserContact,
  getAdminUserTitle,
} from "@/app/panel/admin/admin-user-compact-row";

type SecurityView = "requests" | "users";

type SecurityUser = {
  id: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
  profiles: Array<{
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  }>;
};

function statusLabel(status: string) {
  if (status === "approved") return "تایید شده";
  if (status === "rejected") return "رد شده";
  if (status === "revoked") return "لغو شده";
  return "در انتظار بررسی";
}

function statusVariant(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected" || status === "revoked") return "danger" as const;
  return "warning" as const;
}

function AccessStatusTag({ status }: { status: string }) {
  return (
    <CustomTag variant={statusVariant(status)} size="xs" rounded="full" className="shrink-0">
      {statusLabel(status)}
    </CustomTag>
  );
}

function requestDisplayName(request: AdminAccessRequestRecord) {
  const profile = request.user?.profile;
  const fullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();
  return fullName || request.user?.name || request.phone || request.username;
}

async function fetchUsers() {
  const response = await fetch("/api/admin/users", { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.showMessage || "بارگذاری کاربران ناموفق بود.");
  }
  return Array.isArray(data?.data?.users) ? data.data.users as SecurityUser[] : [];
}

export function AdminSecurityPanel() {
  const [requests, setRequests] = useState<AdminAccessRequestRecord[]>([]);
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  useTransientAppMessage(status);
  const [actingId, setActingId] = useState("");
  const [view, setView] = useState<SecurityView>("requests");
  const [searchQuery, setSearchQuery] = useState("");

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );
  const approvedRequests = useMemo(
    () => requests.filter((request) => request.status === "approved"),
    [requests]
  );
  const archivedRequests = useMemo(
    () => requests.filter((request) => request.status !== "pending" && request.status !== "approved"),
    [requests]
  );
  const filteredUsers = useMemo(
    () => users.filter((user) => adminUserMatchesSearch(user, searchQuery)),
    [searchQuery, users]
  );

  const loadData = async (force = false, showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const [nextRequests, nextUsers] = await Promise.all([
        fetchAdminAccessRequests({ force }),
        fetchUsers(),
      ]);
      setRequests(nextRequests);
      setUsers(nextUsers);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "بارگذاری اطلاعات دسترسی ناموفق بود.");
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const applyReview = async (id: string, action: "approve" | "reject" | "revoke") => {
    setActingId(id);
    setStatus("");

    try {
      await reviewAdminAccessRequest(id, action);
      await loadData(true, false);
      setStatus(
        action === "approve"
          ? "دسترسی مدیریت تایید شد."
          : action === "revoke"
            ? "دسترسی مدیریت لغو شد."
            : "درخواست مدیریت رد شد."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "به‌روزرسانی درخواست ناموفق بود.");
    } finally {
      setActingId("");
    }
  };

  const grantAccess = async (user: SecurityUser) => {
    setActingId(`user-${user.id}`);
    setStatus("");

    try {
      await grantAdminAccessToUser(user.id);
      await loadData(true, false);
      setStatus(`دسترسی مدیریت برای ${getAdminUserTitle(user)} فعال شد.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "اعطای دسترسی مدیریت ناموفق بود.");
    } finally {
      setActingId("");
    }
  };

  return (
    <Loading loading="skeleton-structure" isLoading={loading}>
      <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-bg p-4 text-primary-text">
        <div className="flex flex-col gap-1">
          <AppHeading level={2} className="text-base font-bold text-primary-text">دسترسی مدیریت</AppHeading>
          <div className="text-sm text-primary-text">
            درخواست‌ها را بررسی کنید یا مستقیماً برای کاربران دسترسی مدیریت فعال کنید.
          </div>
        </div>

        <CustomTabs items={([
            { id: "requests", label: "درخواست‌ها و سوابق" },
            { id: "users", label: "جست‌وجو و اعطای دسترسی" },
          ] as const)} value={view} onChange={setView} variant="secondary" />

        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-40 flex-1 flex-col gap-1 rounded-lg border border-primary-border bg-primary-card p-3">
            <span className="text-xs font-semibold text-secondary-text">در انتظار بررسی</span>
            <span className="text-2xl font-bold text-primary-text">{pendingRequests.length}</span>
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-1 rounded-lg border border-primary-border bg-primary-card p-3">
            <span className="text-xs font-semibold text-secondary-text">دسترسی فعال</span>
            <span className="text-2xl font-bold text-primary-text">{approvedRequests.length}</span>
          </div>
          <CustomButton
            size="sm"
            variant="secondary"
            icon={<IoRefreshOutline />}
            isLoading={loading}
            loading="dots"
            onClick={() => void loadData(true)}
          >
            <span>به‌روزرسانی</span>
          </CustomButton>
        </div>

        {view === "requests" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex flex-col gap-1">
                <AppHeading level={3} className="text-sm font-bold text-primary-text">درخواست‌های جدید</AppHeading>
                <span className="text-xs text-secondary-text">درخواست‌های ورود به پنل مدیریت.</span>
              </div>
              {pendingRequests.length === 0 ? (
                <CustomEmptyState description="درخواست جدیدی برای بررسی وجود ندارد." size="sm" />
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-primary-text">{requestDisplayName(request)}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-secondary-text">شماره {request.phone || request.username}</span>
                          <AccessStatusTag status={request.status} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CustomButton
                          size="sm"
                          icon={<IoCheckmarkCircleOutline />}
                          isLoading={actingId === request.id}
                          onClick={() => void applyReview(request.id, "approve")}
                        >
                          <span>تایید</span>
                        </CustomButton>
                        <CustomButton
                          size="sm"
                          variant="danger"
                          icon={<IoCloseCircleOutline />}
                          isLoading={actingId === request.id}
                          onClick={() => void applyReview(request.id, "reject")}
                        >
                          <span>رد</span>
                        </CustomButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex flex-col gap-1">
                <AppHeading level={3} className="text-sm font-bold text-primary-text">دسترسی‌های فعال</AppHeading>
                <span className="text-xs text-secondary-text">کاربران دارای دسترسی مدیریت.</span>
              </div>
              {approvedRequests.length === 0 ? (
                <CustomEmptyState description="هنوز دسترسی فعالی ثبت نشده است." size="sm" />
              ) : (
                <div className="flex flex-col gap-2">
                  {approvedRequests.map((request) => (
                    <div key={request.id} className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-primary-text">{requestDisplayName(request)}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-secondary-text">شماره {request.phone || request.username}</span>
                          <AccessStatusTag status={request.status} />
                        </div>
                      </div>
                      <CustomButton
                        size="sm"
                        variant="danger"
                        icon={<IoTrashOutline />}
                        isLoading={actingId === request.id}
                        onClick={() => void applyReview(request.id, "revoke")}
                      >
                        <span>لغو دسترسی</span>
                      </CustomButton>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex items-center gap-2">
                <IoShieldCheckmarkOutline aria-hidden="true" />
                <AppHeading level={3} className="text-sm font-bold text-primary-text">سوابق درخواست‌ها</AppHeading>
              </div>
              {archivedRequests.length === 0 ? (
                <CustomEmptyState description="سابقه‌ای برای نمایش وجود ندارد." size="sm" />
              ) : (
                <div className="flex flex-col gap-2">
                  {archivedRequests.map((request) => (
                    <div key={request.id} className="flex flex-col gap-1 rounded-md border border-primary-border bg-primary-bg p-3">
                      <span className="text-sm font-bold text-primary-text">{requestDisplayName(request)}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-secondary-text">شماره {request.phone || request.username}</span>
                        <AccessStatusTag status={request.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <CustomInput
              type="search"
              name="admin-access-user-search"
              autoComplete="off"
              spellCheck={false}
              value={searchQuery}
              label="جست‌وجوی کاربران"
              aria-label="جست‌وجوی کاربران با نام، موبایل یا ایمیل"
              placeholder="نام، موبایل یا ایمیل…"
              icon={<IoSearchOutline aria-hidden="true" />}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {filteredUsers.length === 0 ? (
              <CustomEmptyState
                description={searchQuery.trim() ? "کاربری مطابق جست‌وجو پیدا نشد." : "کاربری برای نمایش وجود ندارد."}
                size="sm"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {filteredUsers.map((user) => {
                  const hasAdminRole = user.role === "admin" || user.role === "superadmin";
                  return (
                    <div key={user.id} className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-card p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-sm font-bold text-primary-text">{getAdminUserTitle(user)}</span>
                        <span className="truncate text-xs text-secondary-text">{getAdminUserContact(user)}</span>
                      </div>
                      {hasAdminRole ? (
                        <CustomTag variant="success" size="xs" rounded="full" className="shrink-0">
                          دسترسی مدیریت فعال
                        </CustomTag>
                      ) : (
                        <CustomButton
                          size="sm"
                          icon={<IoCheckmarkCircleOutline />}
                          isLoading={actingId === `user-${user.id}`}
                          onClick={() => void grantAccess(user)}
                        >
                          <span>اعطای دسترسی</span>
                        </CustomButton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </Loading>
  );
}
