 self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
 self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

// Both network push and the open-site receiver use this ledger and serialized queue.
// Persist IDs so closing a notification or reloading the page does not show it twice.
let displayQueue = Promise.resolve();
function openLedger() {
 return new Promise((resolve, reject) => {
   const request = indexedDB.open("browser-notifications-v1", 1);
   request.onupgradeneeded = () => request.result.createObjectStore("shown");
   request.onsuccess = () => resolve(request.result);
   request.onerror = () => reject(request.error);
 });
}
function ledgerRequest(db, mode, action) {
 return new Promise((resolve, reject) => {
   const tx = db.transaction("shown", mode);
   const request = action(tx.objectStore("shown"));
   tx.oncomplete = () => resolve(request.result);
   tx.onerror = () => reject(tx.error);
   tx.onabort = () => reject(tx.error);
 });
}
function displayNotification(data) {
 const task = displayQueue.catch(() => {}).then(async () => {
 let db;
 try {
 if (data.id) {
   try { db = await openLedger(); } catch { /* Display still works when browser storage is unavailable. */ }
   if (db && await ledgerRequest(db, "readonly", store => store.get(data.id))) return;
 }
 await self.registration.showNotification(data.title || "اعلان جدید", {
 body: data.body || "یک پیام جدید در حساب کاربری دارید.", tag: data.id,
 icon: "/icon", lang: "fa", dir: "rtl", data: { id: data.id, url: data.url || "/" },
 });
 if (db) await ledgerRequest(db, "readwrite", store => store.put(Date.now(), data.id));
 const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
 for (const client of clients) client.postMessage({ type: "notification-received" });
 } finally { db?.close(); }
 });
 displayQueue = task;
 return task;
}
self.addEventListener("message", event => {
 if (event.data?.type !== "display-notification" || !event.source?.url) return;
 if (new URL(event.source.url).origin !== self.location.origin) return;
 const data = event.data.notification;
 if (!data || typeof data.id !== "string" || typeof data.title !== "string" || typeof data.body !== "string") return;
 event.waitUntil(displayNotification(data).then(
   () => event.ports[0]?.postMessage({ ok: true }),
   () => event.ports[0]?.postMessage({ ok: false }),
 ));
});
self.addEventListener("push", event => {
 let data = {};
 try { const parsed = event.data?.json(); data = parsed && typeof parsed === "object" ? parsed : {}; } catch { data = { body: event.data?.text() }; }
 event.waitUntil(displayNotification(data));
});
self.addEventListener("notificationclick", event => {
 event.notification.close();
 let url = new URL("/", self.location.origin);
 try { url = new URL(event.notification.data?.url || "/", self.location.origin); } catch {}
 const target = url.origin === self.location.origin ? url.href : new URL("/", self.location.origin).href;
 const markRead = typeof event.notification.data?.id === "string" && event.notification.data.id
 ? fetch("/api/user/notifications", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: event.notification.data.id }) }).catch(() => undefined)
 : Promise.resolve();
 event.waitUntil(Promise.all([markRead, self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
 const client = clients.find(c => new URL(c.url).origin === self.location.origin);
 if (client) { const navigated = await client.navigate(target); return navigated?.focus(); }
 return self.clients.openWindow(target);
 })]));
});

