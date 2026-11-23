import * as webpush from "web-push";

export async function sendBrowserPush(subscription, notification, config, ttl = 86400) {
  if (!config.publicKey || !config.privateKey || !config.subject) throw new Error("Missing VAPID configuration");
  return webpush.sendNotification({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }, JSON.stringify(notification), {
    TTL: ttl,
    timeout: 10000,
    vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
  });
}
