"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoRefreshOutline,
  IoShieldCheckmarkOutline,
  IoTrashOutline,
} from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import {
  fetchAdminAccessRequests,
  reviewAdminAccessRequest,
  type AdminAccessRequestRecord,
} from "@/lib/admin-access";

function statusLabel(status: string) {
  if (status === "approved") return "تایید شده";
  if (status === "rejected") return "رد شده";
  if (status === "revoked") return "لغو شده";
  return "در انتظار بررسی";
}

function requestDisplayName(request: AdminAccessRequestRecord) {
  const profile = request.user?.profile;
  const fullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();
  return fullName || request.user?.name || request.phone || request.username;
}

export function AdminSecurityPanel() {
  const [requests, setRequests] = useState<AdminAccessRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  useTransientAppMessage(status);
  const [actingId, setActingId] = useState("");

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

  const loadRequests = async (force = false, showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const nextRequests = await fetchAdminAccessRequests({ force });
      setRequests(nextRequests);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "بارگذاری درخواست‌ها ناموفق بود.");
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRequests(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const applyReview = async (id: string, action: "approve" | "reject" | "revoke") => {
    setActingId(id);
    setStatus("");

    try {
      await reviewAdminAccessRequest(id, action);
      await loadRequests(true, false);
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

  return (
    <Loading loading="skeleton-structure" isLoading={loading}>
    <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-bg p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-primary-text">دسترسی مدیریت</div>
        <div className="text-sm text-primary-text">
          درخواست‌ها را بررسی کنید و دسترسی‌های فعال را لغو کنید.
        </div>
      </div>

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
              onClick={() => void loadRequests(true)}
            >
              <span>به‌روزرسانی</span>
            </CustomButton>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-bold text-primary-text">درخواست‌های جدید</div>
                <span className="text-xs text-secondary-text">
                  درخواست‌های ورود به پنل مدیریت.
                </span>
              </div>
              {pendingRequests.length === 0 ? (
                <CustomEmptyState description="درخواست جدیدی برای بررسی وجود ندارد." size="sm" />
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-primary-text">
                          {requestDisplayName(request)}
                        </span>
                        <span className="text-xs text-secondary-text">
                          شماره {request.phone || request.username}
                        </span>
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
                <div className="text-sm font-bold text-primary-text">دسترسی‌های فعال</div>
                <span className="text-xs text-secondary-text">
                  کاربران دارای دسترسی مدیریت.
                </span>
              </div>
              {approvedRequests.length === 0 ? (
                <CustomEmptyState description="هنوز دسترسی فعالی ثبت نشده است." size="sm" />
              ) : (
                <div className="flex flex-col gap-2">
                  {approvedRequests.map((request) => (
                    <div key={request.id} className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-primary-text">
                          {requestDisplayName(request)}
                        </span>
                        <span className="text-xs text-secondary-text">
                          شماره {request.phone || request.username}، وضعیت {statusLabel(request.status)}
                        </span>
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

          {!loading && archivedRequests.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex items-center gap-2">
                <IoShieldCheckmarkOutline aria-hidden="true" />
                <div className="text-sm font-bold text-primary-text">سوابق درخواست‌ها</div>
              </div>
              <div className="flex flex-col gap-2">
                {archivedRequests.map((request) => (
                  <div key={request.id} className="flex flex-col gap-1 rounded-md border border-primary-border bg-primary-bg p-3">
                    <span className="text-sm font-bold text-primary-text">{requestDisplayName(request)}</span>
                    <span className="text-xs text-secondary-text">
                      شماره {request.phone || request.username}، وضعیت {statusLabel(request.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
    </section>
    </Loading>
  );
}
