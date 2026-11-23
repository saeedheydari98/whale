import * as webpush from "web-push";

export async function sendTestPush(subscription, config) {
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  await webpush.sendNotification({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }, JSON.stringify({
    title: "آزمایش اعلان مرورگر",
    body: "اعلان آزمایشی از سرور به این مرورگر رسید.",
    url: "/panel/user",
  }), { TTL: 60, timeout: 10000 });
}
