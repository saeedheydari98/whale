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
import {
  fetchAdminAccessRequests,
  reviewAdminAccessRequest,
  type AdminAccessRequestRecord,
} from "@/lib/admin-access";
import { SUPERADMIN_PHONE } from "@/lib/auth-constants";
import { fetchCurrentUser } from "@/lib/auth-client";

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
  const [actingId, setActingId] = useState("");
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [checkedSuperadmin, setCheckedSuperadmin] = useState(false);

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

  const loadRequests = async (force = false) => {
    setLoading(true);
    try {
      const nextRequests = await fetchAdminAccessRequests({ force });
      setRequests(nextRequests);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "بارگذاری درخواست های مدیریت ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void fetchCurrentUser()
      .then((user) => {
        if (cancelled) return;
        const superadmin = user?.username === SUPERADMIN_PHONE && user?.role === "superadmin";
        setIsSuperadmin(superadmin);
        setCheckedSuperadmin(true);
        if (superadmin) void loadRequests();
        else setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCheckedSuperadmin(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyReview = async (id: string, action: "approve" | "reject" | "revoke") => {
    setActingId(id);
    setStatus("");

    try {
      await reviewAdminAccessRequest(id, action);
      await loadRequests(true);
      setStatus(
        action === "approve"
          ? "دسترسی مدیریت تایید شد."
          : action === "revoke"
            ? "دسترسی مدیریت لغو شد."
            : "درخواست مدیریت رد شد."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "به روزرسانی درخواست مدیریت ناموفق بود.");
    } finally {
      setActingId("");
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-bg p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <div className="text-base font-bold text-primary-text">مدیریت دسترسی ادمین</div>
        <div className="text-sm text-primary-text">
          درخواست های کاربران برای ورود به پنل مدیریت را بررسی کنید و دسترسی های فعال را هر زمان لازم بود لغو کنید.
        </div>
      </div>

      {checkedSuperadmin && !isSuperadmin ? (
        <div className="rounded-md border border-primary-border bg-primary-card px-3 py-2 text-sm font-semibold text-primary-text">
          فقط حساب مدیر ارشد می تواند دسترسی مدیریت کاربران را تغییر دهد.
        </div>
      ) : null}

      {isSuperadmin ? (
        <>
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
              <span>به روزرسانی</span>
            </CustomButton>
          </div>

          {status ? (
            <div className="rounded-md border border-primary-border bg-primary-card px-3 py-2 text-sm font-semibold text-primary-text">
              {status}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary-border bg-primary-card p-3 text-sm font-semibold text-primary-text">
              <Loading loading="dots" />
              <span>در حال دریافت درخواست ها</span>
            </div>
          ) : null}

          {!loading ? (
            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-bold text-primary-text">درخواست های جدید</div>
                <span className="text-xs text-secondary-text">
                  کاربرانی که از مسیر قفل شده پنل مدیریت درخواست دسترسی داده اند.
                </span>
              </div>
              {pendingRequests.length === 0 ? (
                <span className="text-xs text-secondary-text">درخواست جدیدی ثبت نشده است.</span>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex flex-col gap-3 rounded-md border border-primary-border bg-primary-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-primary-text">
                          {requestDisplayName(request)}
                        </span>
                        <span className="text-xs text-secondary-text">
                          این کاربر با شماره {request.phone || request.username} درخواست دسترسی مدیریت دارد.
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
          ) : null}

          {!loading ? (
            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-bold text-primary-text">دسترسی های فعال</div>
                <span className="text-xs text-secondary-text">
                  کاربرانی که اکنون می توانند وارد پنل مدیریت شوند.
                </span>
              </div>
              {approvedRequests.length === 0 ? (
                <span className="text-xs text-secondary-text">هیچ دسترسی فعالی برای کاربران ثبت نشده است.</span>
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
          ) : null}

          {!loading && archivedRequests.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-primary-border bg-primary-card p-3">
              <div className="flex items-center gap-2">
                <IoShieldCheckmarkOutline aria-hidden="true" />
                <div className="text-sm font-bold text-primary-text">سوابق درخواست ها</div>
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
        </>
      ) : null}
    </section>
  );
}
