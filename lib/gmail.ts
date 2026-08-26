import nodemailer from "nodemailer";
import { EMAIL_PATTERN, OTP_CODE_PATTERN } from "@/lib/validation-patterns";

const SMTP_CONNECTION_ERROR_CODES = new Set([
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ESOCKET",
  "ETIMEDOUT",
]);

function gmailConfig() {
  const user = String(process.env.GMAIL_SMTP_USER ?? "").trim().toLowerCase();
  const appPassword = String(process.env.GMAIL_SMTP_APP_PASSWORD ?? "").replace(/\s+/g, "");
  const fromName = String(process.env.GMAIL_FROM_NAME ?? "Whale").trim() || "Whale";

  if (!user || !appPassword) {
    throw new Error("Gmail SMTP is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.");
  }

  return { user, appPassword, fromName };
}

function smtpErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String(error.code ?? "").toUpperCase();
}

function createGmailTransport(
  auth: { user: string; pass: string },
  connection: { port: number; secure: boolean }
) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    ...connection,
    auth,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function sendAuthOtpEmail(input: {
  email: string;
  code: string;
  expiresInMinutes: number;
}) {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error("Invalid OTP recipient email.");
  if (!OTP_CODE_PATTERN.test(input.code)) throw new Error("Invalid OTP code.");

  const { user, appPassword, fromName } = gmailConfig();
  const subject = "کد ورود به فروشگاه وال";
  const text = `به فروشگاه وال خوش آمدید.\nکد ورود شما: ${input.code}\nاین کد تا ${input.expiresInMinutes} دقیقه معتبر است. اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.`;
  const html = `
    <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#172033">
      <div style="font-size:18px;font-weight:700">به فروشگاه وال خوش آمدید</div>
      <div style="margin-top:16px">کد یک‌بارمصرف شما:</div>
      <div dir="ltr" style="margin-top:8px;font-size:32px;font-weight:800;letter-spacing:8px">${input.code}</div>
      <div style="margin-top:16px">این کد تا ${input.expiresInMinutes} دقیقه معتبر است.</div>
      <div style="margin-top:8px;color:#667085">اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.</div>
    </div>
  `;

  const message = {
    from: { address: user, name: fromName },
    to: email,
    subject,
    text,
    html,
  };
  const connections = [
    { port: 465, secure: true },
    { port: 587, secure: false },
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
