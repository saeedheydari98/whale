"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminPagedCollection } from "@/hooks/use-admin-paged-collection";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomTag } from "@/app/design-system/components/ui/tag";
import { AppHeading } from "@/app/design-system/components/ui/text";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { grantAdminAccessToUser, reviewAdminAccessRequest, type AdminAccessRequestRecord } from "@/lib/admin-access";
import { AdminUsersPanel, type AdminUser } from "./admin-users-panel";

const REQUESTS_ENDPOINT = "/api/admin/security/requests";

function requestName(request: AdminAccessRequestRecord) {
  const profile = request.user?.profile;
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || request.user?.name || request.phone || request.username;
}

function AccessRequestCard({ request, acting, onReview }: {
  request: AdminAccessRequestRecord; acting: boolean;
  onReview: (action: "approve" | "reject" | "revoke") => void;
}) {
  return <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-card p-2">
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
      <AppHeading level={3} className="min-w-0 break-words text-sm font-bold text-primary-text">{requestName(request)}</AppHeading>
      <span className="min-w-0 break-all text-xs tabular-nums text-secondary-text">شماره {request.phone || request.username}</span>
      <CustomTag size="xs" variant={request.status === "approved" ? "success" : "neutral"}>{({ pending: "در انتظار بررسی", approved: "فعال", rejected: "ردشده", revoked: "لغوشده" } as Record<string, string>)[request.status] ?? request.status}</CustomTag>
    </div>
    <div className="flex shrink-0 flex-wrap gap-2">
      {request.status === "pending" ? <>
        <CustomButton size="sm" isLoading={acting} onClick={() => onReview("approve")}><span>تایید</span></CustomButton>
        <CustomButton size="sm" variant="danger" disabled={acting} onClick={() => onReview("reject")}><span>رد</span></CustomButton>
      </> : request.status === "approved" ? <CustomButton size="sm" variant="danger" isLoading={acting} onClick={() => onReview("revoke")}><span>لغو دسترسی</span></CustomButton> : null}
    </div>
  </div>;
}

function AccessRequestList({ status, totalCount }: { status: "pending" | "approved" | "archived"; totalCount?: number }) {
  const queryClient = useQueryClient();
  const page = useAdminPagedCollection<AdminAccessRequestRecord>({ endpoint: REQUESTS_ENDPOINT, itemKey: "requests", params: new URLSearchParams({ status }).toString(), totalCount });
  const [actingId, setActingId] = useState("");
  const [message, setMessage] = useState("");
  useTransientAppMessage(page.error || message);
  const review = async (request: AdminAccessRequestRecord, action: "approve" | "reject" | "revoke") => {
    if (actingId) return;
    setActingId(request.id);
    setMessage("");
    try {
      await reviewAdminAccessRequest(request.id, action);
      await queryClient.invalidateQueries({ queryKey: ["admin-structure"] });
      await queryClient.invalidateQueries({ queryKey: ["collection-structure"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-list", REQUESTS_ENDPOINT] });
      await queryClient.invalidateQueries({ queryKey: ["admin-list", "/api/admin/users"] });
    } catch (error) { setMessage(error instanceof Error ? error.message : "ثبت تغییرات انجام نشد."); }
    finally { setActingId(""); }
  };
  return <div className="flex flex-col gap-2">
    {!page.loading && page.items.length === 0 ? <CustomEmptyState description="درخواستی برای نمایش وجود ندارد." size="sm" /> : null}
    <DynamicLoadingCollection items={page.items} isLoading={page.loading} {...page.collectionProps} lazy className="flex flex-col gap-2" getKey={(request) => request.id}
      renderItem={(request) => <AccessRequestCard request={request} acting={actingId === request.id} onReview={(action) => void review(request, action)} />}
      renderSkeleton={() => <Loading loading="skeleton-structure" isLoading><AccessRequestCard request={{ id: "loading", username: "کاربر", phone: "09", status: status === "archived" ? "rejected" : status }} acting={false} onReview={() => undefined} /></Loading>} />
  </div>;
}

function AccessUsers({ totalCount }: { totalCount?: number }) {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  useTransientAppMessage(message);
  const grant = async (user: AdminUser) => {
    if (actingId !== null || user.role !== "user") return;
    setActingId(user.id);
    setMessage("");
    try {
      await grantAdminAccessToUser(user.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-structure"] });
      await queryClient.invalidateQueries({ queryKey: ["collection-structure"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-list", "/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-list", REQUESTS_ENDPOINT] });
    } catch (error) { setMessage(error instanceof Error ? error.message : "اعطای دسترسی انجام نشد."); }
    finally { setActingId(null); }
  };
  return <AdminUsersPanel totalCount={totalCount} onSelectUser={(user) => void grant(user)} selectionLabel="اعطای دسترسی" canSelectUser={(user) => actingId === null && user.role === "user"} />;
}

export function AdminSecurityPanel({ counts, usersCount }: { counts?: { pending: number; approved: number; archived: number }; usersCount?: number }) {
  return <section className="flex flex-col gap-4">
    <AppHeading level={2} className="text-base font-bold text-primary-text">دسترسی مدیریت</AppHeading>
    <CustomAccordion title="درخواست‌های جدید" defaultOpen={false} showStatusLabel={false}><AccessRequestList status="pending" totalCount={counts?.pending} /></CustomAccordion>
    <CustomAccordion title="دسترسی‌های فعال" defaultOpen={false} showStatusLabel={false}><AccessRequestList status="approved" totalCount={counts?.approved} /></CustomAccordion>
    <CustomAccordion title="سوابق درخواست‌ها" defaultOpen={false} showStatusLabel={false}><AccessRequestList status="archived" totalCount={counts?.archived} /></CustomAccordion>
    <AccessUsers totalCount={usersCount} />
  </section>;
}
