import fs from "node:fs";
import * as webpush from "web-push";
const file = ".env";
let text = fs.readFileSync(file, "utf8");
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SITE_URL, NEXT_PUBLIC_SITE_URL, GMAIL_SMTP_USER } = process.env;
if (Boolean(VAPID_PUBLIC_KEY) !== Boolean(VAPID_PRIVATE_KEY)) throw new Error("Incomplete VAPID key pair; restore the missing key instead of rotating it.");
if (!VAPID_PUBLIC_KEY) {
 const keys = webpush.generateVAPIDKeys();
 text += "\nVAPID_PUBLIC_KEY=" + keys.publicKey + "\nVAPID_PRIVATE_KEY=" + keys.privateKey + "\n";
}
if (!VAPID_SUBJECT) {
 const site = NEXT_PUBLIC_SITE_URL || SITE_URL;
 const subject = GMAIL_SMTP_USER?.includes("@") ? "mailto:" + GMAIL_SMTP_USER : site?.startsWith("https://") ? site : null;
 if (subject) text += "VAPID_SUBJECT=" + subject + "\n";
 else console.log("Set VAPID_SUBJECT to mailto:your-contact-email or your public HTTPS URL.");
}
fs.writeFileSync(file, text);
console.log("VAPID keys configured in the ignored .env file; no secrets printed.");

