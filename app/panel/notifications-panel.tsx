"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAppUser } from "@/lib/app-user-context";
import { useStructurePagedCollection } from "@/hooks/use-structure-paged-collection";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { CustomTabs } from "@/app/design-system/components/ui/tabs";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { invalidateFetchCache } from "@/lib/fetch-json";
import { USER_STRUCTURE_URL } from "@/lib/user-structure";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { AppHeading } from "@/app/design-system/components/ui/text";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { AdminUsersPanel, type AdminUser } from "@/app/panel/admin/admin-users-panel";

import { notificationRequest as request, restoreBrowserPush, browserPushDisabled, setBrowserPushDisabled, rememberBrowserPush } from "@/lib/notification-client";

type Entry = { id: string; name?: string; title: string; body: string; url: string; active?: boolean; readAt?: string | null; createdAt?: string; _count?: { notifications: number } };
const empty: Entry = { id: "", title: "عنوان اعلان", body: "متن پیام", url: "/" };
const audiences = [["all","همه کاربران"],["new_users","کاربران جدید"],["purchase_count","حداقل تعداد خرید"],["purchase_amount","حداقل مبلغ خرید"],["no_purchase","بدون خرید در بازه"]] as const;
export function NotificationsPanel({ admin = false, usersCount, unreadCount = 0 }: { admin?: boolean; usersCount?: number; unreadCount?: number }) {
 const endpoint = admin ? "/api/admin/notifications" : "/api/user/notifications";
 const [messagesOpen, setMessagesOpen] = useState(false);
 const page = useStructurePagedCollection<Entry>({ endpoint, structureEndpoint: endpoint + "?structure=1", itemKey: "items", enabled: messagesOpen });
 const queryClient = useQueryClient();
 const { data: appUser } = useAppUser();
 const accountId = appUser?.user?.id ?? "guest";
 const [message, setMessage] = useState("");
 const [busy, setBusy] = useState(false);
 const [newMessageIds, setNewMessageIds] = useState<string[]>([]);
 const arrivingMessageIds = admin ? [] : page.items.filter(item => !item.readAt && !newMessageIds.includes(item.id)).map(item => item.id);
 if (arrivingMessageIds.length > 0) {
   // Retain the arrival state after the automatic read acknowledgement refreshes data.
   setNewMessageIds([...newMessageIds, ...arrivingMessageIds]);
 }
 const [pendingSend, setPendingSend] = useState<{ id: string; body: string } | null>(null);
 const unreadIds = JSON.stringify(admin ? [] : page.items.filter(item => !item.readAt).slice(0, 100).map(item => item.id));
 useEffect(() => {
   if (admin || !messagesOpen || unreadIds === "[]") return;
   let stopped = false;
   let pending = false;
   const markRead = async () => {
     if (stopped || pending || document.hidden) return;
     pending = true;
     try {
       await request(endpoint, "PATCH", { ids: JSON.parse(unreadIds) });
       if (stopped) return;
       const acknowledged = new Set<string>(JSON.parse(unreadIds));
       const readAt = new Date().toISOString();
       queryClient.setQueriesData<InfiniteData<{ items: Entry[]; total: number; nextOffset: number | null }>>(
         { queryKey: ["admin-list", endpoint], predicate: query => query.queryKey[4] === accountId },
         current => current ? { ...current, pages: current.pages.map(batch => ({ ...batch, items: batch.items.map(item => acknowledged.has(item.id) ? { ...item, readAt: item.readAt || readAt } : item) })) } : current,
       );
       invalidateFetchCache(USER_STRUCTURE_URL);
       await queryClient.invalidateQueries({ queryKey: ["user-structure"] });
     } catch {
       // Keep unread state and retry while the inbox is visible.
     } finally { pending = false; }
   };
   void markRead();
   const timer = window.setInterval(() => void markRead(), 30000);
   document.addEventListener("visibilitychange", markRead);
   return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", markRead); };
 }, [accountId, admin, endpoint, messagesOpen, queryClient, unreadIds]);
 useEffect(() => {
   if (admin || !messagesOpen) return;
   const refreshInbox = () => {
     if (document.hidden) return;
     invalidateFetchCache(USER_STRUCTURE_URL);
     void queryClient.invalidateQueries({ queryKey: ["user-structure"] }, { cancelRefetch: false });
     void queryClient.invalidateQueries({ queryKey: ["collection-structure", endpoint + "?structure=1"] }, { cancelRefetch: false });
     void queryClient.invalidateQueries({ queryKey: ["admin-list", endpoint] }, { cancelRefetch: false });
   };
   const timer = window.setInterval(refreshInbox, 30000);
   window.addEventListener("focus", refreshInbox);

   return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshInbox); };
 }, [admin, endpoint, messagesOpen, queryClient]);
 const [draft, setDraft] = useState({ name: "", title: "", body: "", url: "/", audienceType: "all", minimumValue: 1, lookbackDays: 30 });
 const [view, setView] = useState<"individual" | "create">("individual");
 const [selected, setSelected] = useState<AdminUser[]>([]);
 const refresh = async () => { invalidateFetchCache(USER_STRUCTURE_URL); await queryClient.invalidateQueries({ queryKey: ["user-structure"] }); await page.refresh(); };
 const mutationLock = useRef(false);
 const mutate = async (method: string, body: unknown, send = false) => {
 if (mutationLock.current) return;
 mutationLock.current = true;
 setBusy(true); setMessage("");
 try { let result = pendingSend && send && pendingSend.body === JSON.stringify(body) ? { rule: { id: pendingSend.id } } : await request(endpoint, method, body);
 if (send) {
   setPendingSend({ id: result.rule.id, body: JSON.stringify(body) });
   try { result = await request(endpoint, "PATCH", { id: result.rule.id, action: "run" }); setPendingSend(null); }
   catch (error) {
     setMessage(`اعلان ذخیره شد اما ارسال کامل نشد. برای تلاش دوباره، دکمه ارسال همین فرم را بزنید. ${error instanceof Error ? error.message : ""}`);
     await refresh();
     return;
   }
 }
 setMessage(result.created !== undefined ? `${result.created} اعلان جدید در صندوق کاربران ثبت شد.${result.pushWarning ? ` ${result.pushWarning}` : ""}` : "ذخیره شد."); await refresh(); }
 catch (e) { setMessage(e instanceof Error ? e.message : "عملیات انجام نشد."); }
 finally { mutationLock.current = false; setBusy(false); }
 };
 const row = (item: Entry) => <div className="flex min-w-0 flex-col gap-2 border-b border-primary-border p-2 text-primary-text">
   <div className="flex min-w-0 items-center gap-2">
     <AppHeading level={3} className="text-sm font-medium">{item.name || item.title}</AppHeading>
     {!admin && newMessageIds.includes(item.id) ? <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">جدید</span> : null}
   </div>
   <span className="text-xs text-secondary-text">{admin ? `${(item._count?.notifications ?? 0).toLocaleString("fa-IR")} گیرنده` : item.readAt ? "خوانده‌شده" : "خوانده‌نشده"}</span>
 {admin && item.name && item.name !== item.title ? <div className="text-sm font-medium">{item.title}</div> : null}
 <div className="whitespace-pre-wrap break-words text-sm leading-7 text-secondary-text">{item.body}</div>
 </div>;
 return <section className="flex flex-col gap-4">
 {admin ? <CustomTabs items={([
   { id: "individual", label: "ارسال فردی" },
   { id: "create", label: "ساخت اعلان" },
 ] as const)} value={view} onChange={setView} disabled={busy} variant="secondary" ariaLabel="روش ارسال اعلان" /> : null}
 {admin && view === "create" ? <CustomTabs items={audiences.map(([id,label]) => ({ id, label }))} value={draft.audienceType} onChange={id => setDraft({ ...draft, audienceType: id })} disabled={busy} ariaLabel="مخاطبان اعلان" /> : null}
 <AppHeading level={2} className="text-lg font-bold text-primary-text">{admin ? view === "individual" ? "ارسال به افراد منتخب" : "ساخت اعلان" : "اعلان‌ها"}</AppHeading>
 {admin ? <form className="flex flex-col gap-4" onSubmit={e => {
   e.preventDefault();
   if (busy || (view === "individual" && selected.length === 0)) return;
   void mutate("POST", { ...draft, name: view === "individual" ? draft.title : draft.name, audienceType: view === "individual" ? "selected" : draft.audienceType, userIds: view === "individual" ? selected.map(u => u.id) : [] }, true);
 }}>
 <div className="text-sm text-secondary-text">{view === "individual" ? "گیرندگان را انتخاب کنید و پس از نوشتن متن، دکمه ارسال اعلان را بزنید." : "مخاطبان را مشخص کنید و پس از نوشتن متن، اعلان را بسازید و ارسال کنید. هر اعلان برای هر کاربر فقط یک بار ارسال می‌شود. بازه خرید بر اساس سفارش‌های پرداخت‌شده است."}</div>
 {view === "individual" ? <div className="flex flex-col gap-3">
 <div className="flex flex-wrap gap-2">{selected.map(u => <CustomButton key={u.id} type="button" variant="neutral" disabled={busy} onClick={() => setSelected(current => current.filter(s => s.id !== u.id))}>{u.name || u.username || u.email} ×</CustomButton>)}</div>
 <AdminUsersPanel totalCount={usersCount} onSelectUser={u => { if (!busy) setSelected(current => current.some(s => s.id === u.id) ? current : [...current,u]); }} canSelectUser={u => !busy && !selected.some(s => s.id === u.id)} />
 <div className="text-sm text-secondary-text">{selected.length === 0 ? "حداقل یک گیرنده انتخاب کنید." : `${selected.length.toLocaleString("fa-IR")} گیرنده انتخاب شده است.`}</div>
 </div> : <>
 <CustomInput label="نام اعلان" placeholder="نام اعلان" value={draft.name} required maxLength={100} disabled={busy} onChange={e => setDraft({ ...draft, name: e.target.value })} />
 {draft.audienceType !== "all" ? <CustomInput label="بازه بررسی (روز)" placeholder="بازه بررسی (روز)" type="number" min={1} max={3650} value={draft.lookbackDays} disabled={busy} onChange={e => setDraft({ ...draft, lookbackDays: Number(e.target.value) })} /> : null}
 {draft.audienceType.startsWith("purchase_") ? <CustomInput label={draft.audienceType === "purchase_count" ? "حداقل تعداد خرید" : "حداقل مبلغ خرید (تومان)"} placeholder={draft.audienceType === "purchase_count" ? "حداقل تعداد خرید" : "حداقل مبلغ خرید (تومان)"} type="number" min={1} value={draft.minimumValue} disabled={busy} onChange={e => setDraft({ ...draft, minimumValue: Number(e.target.value) })} /> : null}
 </>}
 <CustomInput label="مسیر مقصد داخل سایت" placeholder="مسیر مقصد داخل سایت" value={draft.url} required maxLength={500} disabled={busy} onChange={e => setDraft({ ...draft, url: e.target.value })} />
 <CustomInput label="عنوان اعلان" placeholder="عنوان اعلان" value={draft.title} required maxLength={100} disabled={busy} onChange={e => setDraft({ ...draft, title: e.target.value })} />
 <CustomInput label="متن اعلان" placeholder="متن اعلان" multiline value={draft.body} required maxLength={1000} disabled={busy} onChange={e => setDraft({ ...draft, body: e.target.value })} />
 <CustomButton type="submit" disabled={busy || (view === "individual" && selected.length === 0)} isLoading={busy}>{view === "individual" ? "ارسال اعلان" : "ساخت و ارسال اعلان"}</CustomButton>
 </form> : <PushSettings key={String(accountId)} />}
 {message || page.error ? <div role="status" className="text-sm text-primary-text">{message || page.error}</div> : null}
 <CustomAccordion title={messagesOpen ? "بستن پیام‌ها" : "نمایش پیام‌ها"} open={messagesOpen} onOpenChange={setMessagesOpen} showStatusLabel={false}
 heading={<div className="flex flex-wrap items-center gap-2 p-2"><AppHeading level={2} className="text-sm font-semibold text-primary-text">{admin ? "پیام‌های ارسال‌شده" : "پیام‌های دریافتی"}</AppHeading>{!admin && unreadCount > 0 ? <span role="status" className="rounded-full bg-primary-soft p-1 text-xs font-medium text-primary">{unreadCount.toLocaleString("fa-IR")} پیام جدید</span> : null}</div>} contentClassName="p-2">
 {!page.loading && page.total === 0 ? <div className="text-secondary-text">هنوز موردی ثبت نشده است.</div> : null}
 <DynamicLoadingCollection items={page.items} isLoading={page.loading && !page.error} {...page.collectionProps} getKey={item => item.id} lazy className="flex flex-col gap-2" renderItem={row} renderSkeleton={() => <Loading loading="skeleton-structure" isLoading>{row(empty)}</Loading>} />
 </CustomAccordion>
 </section>;
}

function PushSettings() {
 const { data: appUser } = useAppUser();
 const accountId = appUser?.user?.id;
 const operationLock = useRef(false);
 const loadLock = useRef<Promise<void> | null>(null);
 const [state, setState] = useState({ loading: true, supported: false, enabled: false, configured: false });
 const [busy, setBusy] = useState(false), [error, setError] = useState("");
 const [notice, setNotice] = useState("");
 const supported = () => window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
 function load(): Promise<void> {
 if (loadLock.current) return loadLock.current;
 const task = loadStatus().finally(() => { if (loadLock.current === task) loadLock.current = null; });
 loadLock.current = task;
 return task;
 }
 async function loadStatus() {
 if (!supported()) { setState({ loading: false, supported: false, enabled: false, configured: false }); return; }
 try {
 if (accountId) await restoreBrowserPush(accountId);
 const reg = await navigator.serviceWorker.getRegistration("/");
 const subscription = await reg?.pushManager.getSubscription();
 const status = await request("/api/user/push" + (subscription ? "?endpoint=" + encodeURIComponent(subscription.endpoint) : ""));
 setState({ loading: false, supported: true, configured: status.configured, enabled: !browserPushDisabled() && !!subscription && status.enabled && Notification.permission === "granted" });
 } catch (e) { setError(e instanceof Error ? e.message : "دریافت تنظیمات انجام نشد."); setState(s => ({ ...s, loading: false })); }
 }
 useEffect(() => { void load(); const visible = () => { if (!document.hidden && !operationLock.current) void load(); }; window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible); return () => { window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); }; }, []);
 async function toggle() {
 if (operationLock.current) return;
 operationLock.current = true;
 await loadLock.current;
 setBusy(true); setError(""); setNotice("");
 try {
 if (state.enabled) {
 const reg = await navigator.serviceWorker.getRegistration("/");
 const subscription = await reg?.pushManager.getSubscription();
 if (subscription) { await request("/api/user/push", "DELETE", { endpoint: subscription.endpoint }); if (!await subscription.unsubscribe()) throw new Error("حذف اشتراک مرورگر انجام نشد."); }
 setBrowserPushDisabled(true);
 } else {
 const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
 if (permission !== "granted") throw new Error("مجوز اعلان را از تنظیمات مرورگر فعال کنید.");
 const config = await request("/api/user/push");
 if (!config.configured) throw new Error("پوش هنوز توسط مدیر سایت پیکربندی نشده است.");
 await navigator.serviceWorker.register("/notification-worker.js", { scope: "/" });
 let timer: ReturnType<typeof setTimeout> | undefined;
 const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("سرویس اعلان آماده نشد.")),15000); })]).finally(() => clearTimeout(timer));
 let sub = await reg.pushManager.getSubscription();
 const key = config.publicKey.replace(/-/g,"+").replace(/_/g,"/");
 const applicationServerKey = Uint8Array.from(atob(key), c => c.charCodeAt(0));
 const existingKey = sub?.options.applicationServerKey;
 if (sub && (!existingKey || new Uint8Array(existingKey).length !== applicationServerKey.length || !new Uint8Array(existingKey).every((value, index) => value === applicationServerKey[index]))) {
   await request("/api/user/push", "DELETE", { endpoint: sub.endpoint });
   if (!await sub.unsubscribe()) throw new Error("حذف اشتراک قدیمی انجام نشد؛ دوباره تلاش کنید.");
   sub = null;
 }
 if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
 await request("/api/user/push", "POST", sub.toJSON());
 setBrowserPushDisabled(false);
 if (accountId) rememberBrowserPush(accountId, sub.endpoint);
 setNotice("اعلان‌های این مرورگر فعال شد. پیام‌های مدیر به صورت اعلان مرورگر نمایش داده می‌شوند.");
 }
 await load();
 } catch (e) { setError(e instanceof Error ? e.message : "عملیات انجام نشد."); }
 finally { operationLock.current = false; setBusy(false); }
 }
 return <Loading loading="skeleton-structure" isLoading={state.loading}><div className="flex flex-col gap-3">
 <div className="text-sm text-secondary-text">صندوق اعلان همیشه در دسترس است. پوش برای همین مرورگر فعال می‌شود. در آیفون ابتدا سایت را به صفحه اصلی اضافه کنید.</div>
 <div className="flex items-center gap-2">
 <CustomSwitch labelClickable={false} showLabel={false} checked={state.enabled} disabled={state.loading || busy || !state.supported || !state.configured} isLoading={busy} label="اعلان‌های پوش این مرورگر" onChange={() => void toggle()} />
 <span>اعلان‌های پوش این مرورگر</span>
 </div>
 {!state.supported ? <div>مرورگر یا اتصال فعلی از پوش پشتیبانی نمی‌کند.</div> : !state.configured ? <div>پوش هنوز توسط مدیر سایت پیکربندی نشده است.</div> : null}
 {error ? <div role="alert">{error}</div> : null}
 {notice ? <div role="status" className="text-sm text-secondary-text">{notice}</div> : null}
 </div></Loading>;
}

