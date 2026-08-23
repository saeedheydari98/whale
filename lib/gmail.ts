import nodemailer from "nodemailer";
import { EMAIL_PATTERN, OTP_CODE_PATTERN } from "@/lib/validation-patterns";

function gmailConfig() {
  const user = String(process.env.GMAIL_SMTP_USER ?? "").trim().toLowerCase();
  const appPassword = String(process.env.GMAIL_SMTP_APP_PASSWORD ?? "").replace(/\s+/g, "");
  const fromName = String(process.env.GMAIL_FROM_NAME ?? "Whale").trim() || "Whale";

  if (!user || !appPassword) {
    throw new Error("Gmail SMTP is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.");
  }

  return { user, appPassword, fromName };
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
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: appPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
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

  await transporter.sendMail({
    from: { address: user, name: fromName },
    to: email,
    subject,
    text,
    html,
  });
}
