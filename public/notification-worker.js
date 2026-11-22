self.addEventListener("push", event => {
 let data = {};
 try { data = event.data?.json() || {}; } catch { data = {}; }
 event.waitUntil(self.registration.showNotification(data.title || "اعلان جدید", {
 body: data.body || "یک پیام جدید در حساب کاربری دارید.", tag: data.id, data: { url: data.url || "/panel/user" },
 }));
});
self.addEventListener("notificationclick", event => {
 event.notification.close();
 let url = new URL("/panel/user", self.location.origin);
 try { url = new URL(event.notification.data?.url || "/panel/user", self.location.origin); } catch {}
 const target = url.origin === self.location.origin ? url.href : new URL("/panel/user", self.location.origin).href;
 event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
 const client = clients.find(c => new URL(c.url).origin === self.location.origin);
 if (client) { const navigated = await client.navigate(target); return navigated?.focus(); }
 return self.clients.openWindow(target);
 }));
});

