import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const notificationId = `native-test-${Date.now()}`;
try {
 const context = await browser.newContext({ permissions: ["notifications"] });
 await context.addInitScript(() => {
   PushManager.prototype.getSubscription = async () => ({ endpoint: "https://fcm.googleapis.com/test" });
 });
 await context.route("**/native-fixture", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Native notification test</title>" }));
 let feedRequests = 0;
 await context.route("**/api/**", route => {
   const url = new URL(route.request().url());
   const json = data => route.fulfill({ json: { ok: true, data } });
   if (url.pathname === "/api/theme") return json({ theme: { primary: "blue", style: "light" } });
   if (url.pathname === "/api/app/user") return json({ user: { id: 1, role: "user", username: "09120000000", email: "test@example.com", themeMode: "light", profile: null }, cart: { count: 0 } });
   if (url.pathname === "/api/user/structure") return json({ structure: { orders: 0, discounts: 0, unseenDiscounts: 0, walletTransactions: 0, unreadNotifications: 1 } });
   if (url.pathname === "/api/user/push/live") {
     feedRequests++;
     return json({ enabled: true, items: url.searchParams.has("cursor") ? [] : [{ id: notificationId, title: "Native browser message", body: "Delivered without the push queue", url: "/panel/user" }], cursor: "job1" });
   }
   if (url.pathname === "/api/catalog/sync") return route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" });
   return json({});
 });
 const page = await context.newPage();
 await page.goto("http://localhost:3100/native-fixture");
 await page.evaluate(async () => {
   await navigator.serviceWorker.register("/notification-worker.js", { scope: "/" });
   await navigator.serviceWorker.ready;
 });
 const worker = context.serviceWorkers()[0];
 await worker.evaluate(() => {
   self.nativeNotificationCalls = [];
   const show = self.registration.showNotification.bind(self.registration);
   self.registration.showNotification = async (title, options) => {
     await show(title, options);
     self.nativeNotificationCalls.push({ title, body: options.body });
   };
 });
 await page.goto("http://localhost:3100/panel/user");
 for (let attempt = 0; attempt < 40; attempt++) {
   if (await worker.evaluate(() => self.nativeNotificationCalls.length)) break;
   await page.waitForTimeout(500);
 }
 assert.ok(feedRequests > 0, `Live feed requests: ${feedRequests}; page: ${await page.title()}`);
 const shown = await worker.evaluate(() => self.nativeNotificationCalls);
 assert.deepEqual(shown, [{ title: "Native browser message", body: "Delivered without the push queue" }]);
 await page.evaluate(async id => {
   const registration = await navigator.serviceWorker.ready;
   for (const notification of await registration.getNotifications()) notification.close();
   await new Promise((resolve, reject) => {
     const channel = new MessageChannel();
     channel.port1.onmessage = event => event.data.ok ? resolve() : reject();
     registration.active.postMessage({ type: "display-notification", notification: { id, title: "Duplicate", body: "Duplicate" } }, [channel.port2]);
   });
 }, notificationId);
 assert.equal(await worker.evaluate(() => self.nativeNotificationCalls.length), 1, "Closed notification is not shown again by the other delivery channel");
 console.log("PASS: real service worker displays a native browser notification outside the inbox; persistent duplicate suppression");
} finally { await browser.close(); }
