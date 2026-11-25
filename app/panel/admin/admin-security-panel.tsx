"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminPagedCollection } from "@/hooks/use-admin-paged-collection";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomTag } from "@/app/design-system/components/ui/tag";
import { AppHeading } from "@/app/design-system/components/ui/text";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { grantAdminAccessToUser, revokeAdminAccessFromUser, reviewAdminAccessRequest, type AdminAccessRequestRecord } from "@/lib/admin-access";
import { AdminUsersPanel, type AdminUser } from "./admin-users-panel";

import { ADMIN_SECTIONS, type AdminPermissions } from "@/lib/admin-permissions";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";

function PermissionEditor({ initial, busy, onSave, onClose }: { initial: AdminPermissions; busy: boolean; onSave: (permissions: AdminPermissions) => Promise<boolean>; onClose: () => void }) {
  const [permissions, setPermissions] = useState(initial);
  return <CustomModal open title="دسترسی بخش‌های پنل" onClose={() => { if (!busy) onClose(); }} closeOnBackdrop={!busy}>
    <div className="flex flex-col gap-4">
      <div className="text-sm text-secondary-text">فقط بخش‌های انتخاب‌شده برای این ادمین فعال می‌شوند. بدون انتخاب بخش، فقط ورود به پنل مجاز است.</div>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-5">
        {Object.entries(ADMIN_SECTIONS).map(([key, label]) => (
          <CustomSwitch
            key={key}
            label={label}
            layout="vertical"
            className="basis-[calc((100%-1.5rem)/3)] text-xs font-medium sm:text-sm"
            disabled={busy}
            checked={permissions[key as keyof AdminPermissions] === true}
            onChange={value => setPermissions(current => ({ ...current, [key]: value }))}
          />
        ))}
      </div>
      <CustomButton isLoading={busy} onClick={async () => { if (await onSave(permissions)) onClose(); }}><span>ذخیره دسترسی‌ها</span></CustomButton>
    </div>
  </CustomModal>;
}

const REQUESTS_ENDPOINT = "/api/admin/security/requests";

function requestName(request: AdminAccessRequestRecord) {
  const profile = request.user?.profile;
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || request.user?.name || request.phone || request.username;
}

function AccessRequestCard({ request, acting, onReview }: {
  request: AdminAccessRequestRecord; acting: boolean;
  onReview: (action: "approve" | "reject" | "revoke", permissions?: AdminPermissions) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  return <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-card p-2">
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
      <AppHeading level={3} className="min-w-0 break-words text-sm font-bold text-primary-text">{requestName(request)}</AppHeading>
      <span className="min-w-0 break-all text-xs tabular-nums text-secondary-text">شماره {request.phone || request.username}</span>
      <CustomTag size="xs" variant={request.status === "approved" ? "success" : "neutral"}>{({ pending: "در انتظار بررسی", approved: "فعال", rejected: "ردشده", revoked: "لغوشده" } as Record<string, string>)[request.status] ?? request.status}</CustomTag>
    </div>
    {editing ? <PermissionEditor initial={request.user?.adminPermissions ?? {}} busy={acting} onSave={permissions => onReview("approve", permissions)} onClose={() => setEditing(false)} /> : null}
    <div className="flex shrink-0 flex-wrap gap-2">
      {request.status === "approved" ? <CustomButton size="sm" disabled={acting} onClick={() => setEditing(true)}><span>ویرایش دسترسی‌ها</span></CustomButton> : null}
      {request.status === "pending" ? <>
        <CustomButton size="sm" isLoading={acting} onClick={() => setEditing(true)}><span>تایید</span></CustomButton>
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
  const review = async (request: AdminAccessRequestRecord, action: "approve" | "reject" | "revoke", permissions: AdminPermissions = {}) => {
    if (actingId) return false;
    setActingId(request.id);
    setMessage("");
    try {
      await reviewAdminAccessRequest(request.id, action, permissions);
      await queryClient.invalidateQueries({ queryKey: ["admin-structure"] });
      await queryClient.invalidateQueries({ queryKey: ["collection-structure"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-list", REQUESTS_ENDPOINT] });
      await queryClient.invalidateQueries({ queryKey: ["admin-list", "/api/admin/users"] });
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "ثبت تغییرات انجام نشد."); return false; }
    finally { setActingId(""); }
  };
  return <div className="flex flex-col gap-2">
    {!page.loading && page.items.length === 0 ? <CustomEmptyState description="درخواستی برای نمایش وجود ندارد." size="sm" /> : null}
    <DynamicLoadingCollection items={page.items} isLoading={page.loading} {...page.collectionProps} lazy className="flex flex-col gap-2" getKey={(request) => request.id}
      renderItem={(request) => <AccessRequestCard request={request} acting={actingId === request.id} onReview={(action, permissions) => review(request, action, permissions)} />}
      renderSkeleton={() => <Loading loading="skeleton-structure" isLoading><AccessRequestCard request={{ id: "loading", username: "کاربر", phone: "09", status: status === "archived" ? "rejected" : status }} acting={false} onReview={async () => false} /></Loading>} />
  </div>;
}

function AccessUsers({ totalCount }: { totalCount?: number }) {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  useTransientAppMessage(message);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const actionPending = useRef(false);
  const grant = async (user: AdminUser, permissions: AdminPermissions, revoke = false) => {
    if (actionPending.current || !["user", "admin"].includes(user.role)) return false;
    actionPending.current = true;
    setActingId(user.id);
    setMessage("");
    try {
      if (revoke) await revokeAdminAccessFromUser(user.id);
      else await grantAdminAccessToUser(user.id, permissions);
      await queryClient.invalidateQueries({ queryKey: ["admin-structure"] });
      await queryClient.invalidateQueries({ queryKey: ["collection-structure"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-list", "/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-list", REQUESTS_ENDPOINT] });
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "اعطای دسترسی انجام نشد."); return false; }
    finally { actionPending.current = false; setActingId(null); }
  };
  return <>{selected ? <PermissionEditor initial={selected.adminPermissions ?? {}} busy={actingId !== null} onSave={permissions => grant(selected, permissions)} onClose={() => setSelected(null)} /> : null}<AdminUsersPanel totalCount={totalCount} onSelectUser={setSelected} renderActions={(user, isLoading) => user.role === "superadmin" ? null : <>
    <CustomButton size="sm" variant="neutral" disabled={isLoading || actingId !== null} onClick={() => setSelected(user)}><span>{user.role === "admin" ? "ویرایش دسترسی" : "اعطای دسترسی"}</span></CustomButton>
    {user.role === "admin" ? <CustomButton size="sm" variant="danger" disabled={isLoading || actingId !== null} onClick={() => grant(user, {}, true)}><span>لغو دسترسی</span></CustomButton> : null}
  </>} /></>;
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
