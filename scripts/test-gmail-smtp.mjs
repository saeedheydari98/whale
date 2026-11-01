import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

function loadEnvFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env"));

const user = (process.env.GMAIL_SMTP_USER || "").trim().toLowerCase();
const appPassword = (process.env.GMAIL_SMTP_APP_PASSWORD || "").trim().replace(/\s+/g, "");

if (!user || !appPassword) {
  console.error("FAIL: GMAIL_SMTP_USER or GMAIL_SMTP_APP_PASSWORD missing in .env");
  process.exit(1);
}

console.log("SMTP user:", user);
console.log("App password length:", appPassword.length, "(expect 16)");

async function verifyPort(port, secure, requireTLS) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,
    secure,
    requireTLS,
    auth: { user, pass: appPassword },
    family: 4,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  try {
    await transporter.verify();
    console.log(`OK: SMTP verify on port ${port}`);
    return true;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const response = error && typeof error === "object" && "response" in error ? String(error.response) : "";
    console.error(`FAIL: port ${port}`, code, response || (error instanceof Error ? error.message : error));
    return false;
  } finally {
    transporter.close();
  }
}

const ok465 = await verifyPort(465, true);
const ok587 = ok465 ? true : await verifyPort(587, false, true);

if (!ok465 && !ok587) {
  console.error("\nAuth/connection failed. Typical fixes for a new Gmail account:");
  console.error("1) Enable 2-Step Verification on the SMTP account");
  console.error("2) Create a new App Password for Mail");
  console.error("3) Put that 16-char password in GMAIL_SMTP_APP_PASSWORD");
  process.exit(2);
}

console.log("\nSMTP login works. Sending a test message to the same inbox…");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: ok465 ? 465 : 587,
  secure: ok465,
  requireTLS: !ok465,
  auth: { user, pass: appPassword },
  family: 4,
});

try {
  const info = await transporter.sendMail({
    from: { name: process.env.GMAIL_FROM_NAME || "Whale", address: user },
    to: user,
    subject: "Whale SMTP test",
    text: "If you see this, OTP sending from this account should work.",
  });
  console.log("OK: test email sent.", info.messageId || "");
} catch (error) {
  const response = error && typeof error === "object" && "response" in error ? String(error.response) : "";
  console.error("FAIL: sendMail:", response || (error instanceof Error ? error.message : error));
  process.exit(3);
} finally {
  transporter.close();
}
