self.addEventListener("push", event => {
 let data = {};
 try { const parsed = event.data?.json(); data = parsed && typeof parsed === "object" ? parsed : {}; } catch { data = { body: event.data?.text() }; }
 event.waitUntil((async () => {
 await self.registration.showNotification(data.title || "اعلان جدید", {
 body: data.body || "یک پیام جدید در حساب کاربری دارید.", tag: data.id,
 icon: "/icon", lang: "fa", dir: "rtl", data: { id: data.id, url: data.url || "/panel/user" },
 });
 const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
 for (const client of clients) client.postMessage({ type: "notification-received" });
 })());
});
self.addEventListener("notificationclick", event => {
 event.notification.close();
 let url = new URL("/panel/user", self.location.origin);
 try { url = new URL(event.notification.data?.url || "/panel/user", self.location.origin); } catch {}
 const target = url.origin === self.location.origin ? url.href : new URL("/panel/user", self.location.origin).href;
 const markRead = typeof event.notification.data?.id === "string" && event.notification.data.id
 ? fetch("/api/user/notifications", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: event.notification.data.id }) }).catch(() => undefined)
 : Promise.resolve();
 event.waitUntil(Promise.all([markRead, self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
 const client = clients.find(c => new URL(c.url).origin === self.location.origin);
 if (client) { const navigated = await client.navigate(target); return navigated?.focus(); }
 return self.clients.openWindow(target);
 })]));
});

