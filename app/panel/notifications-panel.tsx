"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStructurePagedCollection } from "@/hooks/use-structure-paged-collection";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { CustomTabs } from "@/app/design-system/components/ui/tabs";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { invalidateFetchCache } from "@/lib/fetch-json";
import { USER_STRUCTURE_URL } from "@/lib/user-structure";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { AppHeading } from "@/app/design-system/components/ui/text";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { AdminUsersPanel, type AdminUser } from "@/app/panel/admin/admin-users-panel";

type Entry = { id: string; name?: string; title: string; body: string; url: string; active?: boolean; readAt?: string | null; createdAt?: string; _count?: { notifications: number } };
const empty: Entry = { id: "", title: "عنوان اعلان", body: "متن پیام", url: "/panel/user" };
const audiences = [["all","همه کاربران"],["new_users","کاربران جدید"],["purchase_count","حداقل تعداد خرید"],["purchase_amount","حداقل مبلغ خرید"],["no_purchase","بدون خرید در بازه"]] as const;
async function request(url: string, method = "GET", body?: unknown) {
 const response = await fetch(url, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const json = await response.json();
 if (!response.ok || !json.ok) throw new Error(json.showMessage || "عملیات انجام نشد.");
 return json.data;
}

export function NotificationsPanel({ admin = false, usersCount }: { admin?: boolean; usersCount?: number }) {
 const endpoint = admin ? "/api/admin/notifications" : "/api/user/notifications";
 const page = useStructurePagedCollection<Entry>({ endpoint, structureEndpoint: endpoint + "?structure=1", itemKey: "items" });
 const queryClient = useQueryClient();
 const [message, setMessage] = useState("");
 const [busy, setBusy] = useState(false);
 const [confirmId, setConfirmId] = useState<string | null>(null);
 useEffect(() => {
   if (admin) return;
   const refreshInbox = () => {
     if (document.hidden) return;
     invalidateFetchCache(USER_STRUCTURE_URL);
     void queryClient.invalidateQueries({ queryKey: ["user-structure"] });
     void queryClient.invalidateQueries({ queryKey: ["collection-structure", endpoint + "?structure=1"] });
     void queryClient.invalidateQueries({ queryKey: ["admin-list", endpoint] });
   };
   const timer = window.setInterval(refreshInbox, 30000);
   window.addEventListener("focus", refreshInbox);
   return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshInbox); };
 }, [admin, endpoint, queryClient]);
 const [draft, setDraft] = useState({ name: "", title: "", body: "", url: "/panel/user", audienceType: "all", minimumValue: 1, lookbackDays: 30 });
 const [view, setView] = useState<"individual" | "create">("individual");
 const [selected, setSelected] = useState<AdminUser[]>([]);
 const refresh = async () => { invalidateFetchCache(USER_STRUCTURE_URL); await queryClient.invalidateQueries({ queryKey: ["user-structure"] }); await queryClient.invalidateQueries({ queryKey: ["admin-list", endpoint] }); await page.refresh(); };
 const mutate = async (method: string, body: unknown, send = false) => {
 setBusy(true); setMessage("");
 try { let result = await request(endpoint, method, body);
 if (send) {
   try { result = await request(endpoint, "PATCH", { id: result.rule.id, action: "run" }); }
   catch (error) {
     setMessage(`اعلان ذخیره شد اما ارسال کامل نشد. از دکمه ارسال اعلان در فهرست پایین دوباره تلاش کنید. ${error instanceof Error ? error.message : ""}`);
     await refresh();
     return;
   }
 }
 setMessage(result.created !== undefined ? `${result.created} اعلان جدید در صندوق کاربران ثبت شد.` : "ذخیره شد."); await refresh(); }
 catch (e) { setMessage(e instanceof Error ? e.message : "عملیات انجام نشد."); }
 finally { setBusy(false); }
 };
 const row = (item: Entry) => <div className="flex flex-col gap-3 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
 <AppHeading level={3} className="text-base font-bold">{item.name || item.title}</AppHeading>
 {admin ? <span>{item.title}</span> : null}
 <div className="whitespace-pre-wrap break-words text-sm">{item.body}</div>
 {admin ? <div className="flex flex-wrap gap-2">
 <span>{item._count?.notifications ?? 0} گیرنده · {item.active ? "فعال" : "متوقف"}</span>
 <CustomButton disabled={busy || !item.active} onClick={() => setConfirmId(item.id)}>ارسال اعلان</CustomButton>
 <CustomSwitch checked={!!item.active} disabled={busy} label="فعال بودن اعلان" onChange={active => void mutate("PATCH", { id: item.id, action: "toggle", active })} />
 </div> : <div className="flex flex-wrap gap-2">
 <span>{item.readAt ? "خوانده‌شده" : "خوانده‌نشده"}</span>
 <CustomButton href={item.url} variant="neutral">مشاهده مقصد</CustomButton>
 {!item.readAt ? <CustomButton disabled={busy} onClick={() => void mutate("PATCH", { id: item.id })}>خواندم</CustomButton> : null}
 </div>}
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
 <CustomInput label="نام اعلان" value={draft.name} required maxLength={100} disabled={busy} onChange={e => setDraft({ ...draft, name: e.target.value })} />
 {draft.audienceType !== "all" ? <CustomInput label="بازه بررسی (روز)" type="number" min={1} max={3650} value={draft.lookbackDays} disabled={busy} onChange={e => setDraft({ ...draft, lookbackDays: Number(e.target.value) })} /> : null}
 {draft.audienceType.startsWith("purchase_") ? <CustomInput label={draft.audienceType === "purchase_count" ? "حداقل تعداد خرید" : "حداقل مبلغ خرید (تومان)"} type="number" min={1} value={draft.minimumValue} disabled={busy} onChange={e => setDraft({ ...draft, minimumValue: Number(e.target.value) })} /> : null}
 </>}
 <CustomInput label="مسیر مقصد داخل سایت" value={draft.url} required maxLength={500} disabled={busy} onChange={e => setDraft({ ...draft, url: e.target.value })} />
 <CustomInput label="عنوان اعلان" value={draft.title} required maxLength={100} disabled={busy} onChange={e => setDraft({ ...draft, title: e.target.value })} />
 <CustomInput label="متن اعلان" multiline value={draft.body} required maxLength={1000} disabled={busy} onChange={e => setDraft({ ...draft, body: e.target.value })} />
 <CustomButton type="submit" disabled={busy || (view === "individual" && selected.length === 0)} isLoading={busy}>{view === "individual" ? "ارسال اعلان" : "ساخت و ارسال اعلان"}</CustomButton>
 </form> : <><PushSettings /><CustomButton disabled={busy} variant="neutral" onClick={() => void mutate("PATCH", {})}>خواندن همه اعلان‌ها</CustomButton></>}
 {message || page.error ? <div role="status" className="text-sm text-primary-text">{message || page.error}</div> : null}
 {!page.loading && page.total === 0 ? <div className="text-secondary-text">هنوز موردی ثبت نشده است.</div> : null}
 <DynamicLoadingCollection items={page.items} isLoading={page.loading && !page.error} {...page.collectionProps} getKey={item => item.id} lazy className="flex flex-col gap-3" renderItem={row} renderSkeleton={() => <Loading loading="skeleton-structure" isLoading>{row(empty)}</Loading>} />
 <CustomModal open={confirmId !== null} onClose={() => setConfirmId(null)} title="تأیید ارسال اعلان">
 <div className="flex flex-col gap-4"><div>این اعلان برای تمام مخاطبان آن ثبت شود؟ کاربران دریافت‌کننده قبلی دوباره پیام نمی‌گیرند.</div>
 <CustomButton disabled={busy} onClick={() => { const id = confirmId; setConfirmId(null); if (id) void mutate("PATCH", { id, action: "run" }); }}>تأیید و ارسال</CustomButton></div>
 </CustomModal>
 </section>;
}

function PushSettings() {
 const [state, setState] = useState({ loading: true, supported: false, enabled: false, configured: false });
 const [busy, setBusy] = useState(false), [error, setError] = useState("");
 const supported = () => window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
 async function load() {
 if (!supported()) { setState({ loading: false, supported: false, enabled: false, configured: false }); return; }
 try {
 const reg = await navigator.serviceWorker.getRegistration("/");
 const subscription = await reg?.pushManager.getSubscription();
 const status = await request("/api/user/push" + (subscription ? "?endpoint=" + encodeURIComponent(subscription.endpoint) : ""));
 setState({ loading: false, supported: true, configured: status.configured, enabled: !!subscription && status.enabled && Notification.permission === "granted" });
 } catch (e) { setError(e instanceof Error ? e.message : "دریافت تنظیمات انجام نشد."); setState(s => ({ ...s, loading: false })); }
 }
 useEffect(() => { void load(); const visible = () => { if (!document.hidden) void load(); }; window.addEventListener("focus", visible); return () => window.removeEventListener("focus", visible); }, []);
 async function toggle() {
 setBusy(true); setError("");
 try {
 if (state.enabled) {
 const reg = await navigator.serviceWorker.getRegistration("/");
 const subscription = await reg?.pushManager.getSubscription();
 if (subscription) { await request("/api/user/push", "DELETE", { endpoint: subscription.endpoint }); await subscription.unsubscribe(); }
 } else {
 const permission = await Notification.requestPermission();
 if (permission !== "granted") throw new Error("مجوز اعلان را از تنظیمات مرورگر فعال کنید.");
 const config = await request("/api/user/push");
 if (!config.configured) throw new Error("پوش هنوز توسط مدیر سایت پیکربندی نشده است.");
 await navigator.serviceWorker.register("/notification-worker.js", { scope: "/" });
 const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("سرویس اعلان آماده نشد.")),15000))]);
 let sub = await reg.pushManager.getSubscription();
 if (!sub) { const key = config.publicKey.replace(/-/g,"+").replace(/_/g,"/"); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(key), c => c.charCodeAt(0)) }); }
 await request("/api/user/push", "POST", sub.toJSON());
 }
 await load();
 } catch (e) { setError(e instanceof Error ? e.message : "عملیات انجام نشد."); }
 finally { setBusy(false); }
 }
 return <Loading loading="skeleton-structure" isLoading={state.loading}><div className="flex flex-col gap-3">
 <div className="text-sm text-secondary-text">صندوق اعلان همیشه در دسترس است. پوش برای همین مرورگر فعال می‌شود. در آیفون ابتدا سایت را به صفحه اصلی اضافه کنید.</div>
 <CustomSwitch checked={state.enabled} disabled={state.loading || busy || !state.supported || !state.configured} isLoading={busy} label="اعلان‌های پوش این مرورگر" onChange={() => void toggle()} />
 {!state.supported ? <div>مرورگر یا اتصال فعلی از پوش پشتیبانی نمی‌کند.</div> : !state.configured ? <div>پوش هنوز توسط مدیر سایت پیکربندی نشده است.</div> : null}
 {error ? <div role="alert">{error}</div> : null}
 </div></Loading>;
}

