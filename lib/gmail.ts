import nodemailer from "nodemailer";
import { EMAIL_PATTERN, OTP_CODE_PATTERN } from "@/lib/validation-patterns";

const SMTP_CONNECTION_ERROR_CODES = new Set([
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ESOCKET",
  "ETIMEDOUT",
  "ETIMEOUT",
  "ERR_SOCKET_CONNECTION_TIMEOUT",
]);

type OtpMail = {
  to: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  text: string;
  html: string;
};

function trimEnv(value: string | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function gmailConfig() {
  const user = process.env.GMAIL_SMTP_USER;
  const appPassword = process.env.GMAIL_SMTP_APP_PASSWORD;
  const fromName = process.env.GMAIL_FROM_NAME;
  const webhookUrl = process.env.GMAIL_WEBHOOK_URL;
  const webhookSecret = process.env.GMAIL_WEBHOOK_SECRET;
  const oauthClientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN;
  return {
    user: trimEnv(user).toLowerCase(),
    appPassword: trimEnv(appPassword).replace(/\s+/g, ""),
    fromName: trimEnv(fromName) || "Whale",
    webhookUrl: trimEnv(webhookUrl),
    webhookSecret: trimEnv(webhookSecret),
    oauthClientId: trimEnv(oauthClientId),
    oauthClientSecret: trimEnv(oauthClientSecret),
    oauthRefreshToken: trimEnv(oauthRefreshToken),
  };
}

function smtpErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String(error.code ?? "").toUpperCase();
}

function encodedHeaderValue(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function rfc822Raw(mail: OtpMail) {
  const from = `${encodedHeaderValue(mail.fromName)} <${mail.fromAddress}>`;
  const body = [
    `From: ${from}`,
    `To: ${mail.to}`,
    `Subject: ${encodedHeaderValue(mail.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="whale-otp"',
    "",
    "--whale-otp",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    mail.text,
    "--whale-otp",
    "Content-Type: text/html; charset=UTF-8",
    "",
    mail.html,
    "--whale-otp--",
  ].join("\r\n");
  return Buffer.from(body, "utf8").toString("base64url");
}

async function sendViaWebhook(mail: OtpMail, url: string, secret: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({
      secret,
      to: mail.to,
      from: mail.fromAddress,
      fromName: mail.fromName,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });
  if (!response.ok) throw new Error(`Gmail HTTPS webhook failed (${response.status}).`);
}

async function gmailAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Gmail OAuth token refresh failed.");
  const json = await response.json() as { access_token?: string };
  if (!json.access_token) throw new Error("Gmail OAuth token refresh failed.");
  return json.access_token;
}

async function sendViaGmailApi(mail: OtpMail, clientId: string, clientSecret: string, refreshToken: string) {
  const accessToken = await gmailAccessToken(clientId, clientSecret, refreshToken);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rfc822Raw(mail) }),
  });
  if (!response.ok) throw new Error(`Gmail API send failed (${response.status}).`);
}

function createGmailTransport(
  auth: { user: string; pass: string },
  connection: { port: number; secure: boolean; requireTLS?: boolean }
) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: connection.port,
    secure: connection.secure,
    requireTLS: connection.requireTLS,
    auth,
    family: 4,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  } as nodemailer.TransportOptions);
}

async function sendViaSmtp(mail: OtpMail, user: string, appPassword: string) {
  const message = {
    from: { address: user, name: mail.fromName },
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  };
  const connections = [
    { port: 465, secure: true },
    { port: 587, secure: false, requireTLS: true },
  ];

  for (const [index, connection] of connections.entries()) {
    const transporter = createGmailTransport({ user, pass: appPassword }, connection);
    try {
      await transporter.sendMail(message);
      return;
    } catch (error) {
      const hasFallback = index < connections.length - 1;
      if (!hasFallback || !SMTP_CONNECTION_ERROR_CODES.has(smtpErrorCode(error))) throw error;
      console.warn(`Gmail SMTP connection on port ${connection.port} failed; trying the fallback port.`);
    } finally {
      transporter.close();
    }
  }
}

export async function sendAuthOtpEmail(input: {
  email: string;
  code: string;
  expiresInMinutes: number;
}) {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error("Invalid OTP recipient email.");
  if (!OTP_CODE_PATTERN.test(input.code)) throw new Error("Invalid OTP code.");

  const config = gmailConfig();
  const mail: OtpMail = {
    to: email,
    fromName: config.fromName,
    fromAddress: config.user || email,
    subject: "کد ورود به فروشگاه وال",
    text: `به فروشگاه وال خوش آمدید.\nکد ورود شما: ${input.code}\nاین کد تا ${input.expiresInMinutes} دقیقه معتبر است. اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.`,
    html: `
    <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#172033">
      <div style="font-size:18px;font-weight:700">به فروشگاه وال خوش آمدید</div>
      <div style="margin-top:16px">کد یک‌بارمصرف شما:</div>
      <div dir="ltr" style="margin-top:8px;font-size:32px;font-weight:800;letter-spacing:8px">${input.code}</div>
      <div style="margin-top:16px">این کد تا ${input.expiresInMinutes} دقیقه معتبر است.</div>
      <div style="margin-top:8px;color:#667085">اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.</div>
    </div>
  `,
  };

  if (config.user && config.appPassword) {
    await sendViaSmtp(mail, config.user, config.appPassword);
    return;
  }
  if (config.webhookUrl) {
    await sendViaWebhook(mail, config.webhookUrl, config.webhookSecret);
    return;
  }
  if (config.oauthClientId && config.oauthClientSecret && config.oauthRefreshToken) {
    await sendViaGmailApi(mail, config.oauthClientId, config.oauthClientSecret, config.oauthRefreshToken);
    return;
  }
  throw new Error("Gmail SMTP is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.");
}
