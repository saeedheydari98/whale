import { sendBrowserPush } from "./send-push.mjs";

export async function sendTestPush(subscription, config) {
  await sendBrowserPush(subscription, {
    title: "آزمایش اعلان مرورگر",
    body: "اعلان آزمایشی از سرور به این مرورگر رسید.",
    url: "/panel/user",
  }, config, 60);
}
