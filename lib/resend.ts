const RESEND_EMAILS_URL = "https://api.resend.com/emails";

type ResendErrorPayload = {
  message?: string;
  name?: string;
};

function resendConfig() {
  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL ?? "").trim();
  const fromName = String(process.env.RESEND_FROM_NAME ?? "Whale").trim() || "Whale";
  if (!apiKey || !fromEmail) {
    throw new Error("Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }
  return { apiKey, fromEmail, fromName };
}

export async function sendAuthOtpEmail(input: {
  email: string;
  code: string;
  expiresInMinutes: number;
  idempotencyKey: string;
}) {
  const { apiKey, fromEmail, fromName } = resendConfig();
  const subject = "کد ورود به حساب کاربری";
  const text = `کد ورود شما: ${input.code}\nاین کد تا ${input.expiresInMinutes} دقیقه معتبر است. اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.`;
  const html = `
    <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#172033">
      <div style="font-size:18px;font-weight:700">کد ورود به حساب کاربری</div>
      <div style="margin-top:16px">کد یک‌بارمصرف شما:</div>
      <div dir="ltr" style="margin-top:8px;font-size:32px;font-weight:800;letter-spacing:8px">${input.code}</div>
      <div style="margin-top:16px">این کد تا ${input.expiresInMinutes} دقیقه معتبر است.</div>
      <div style="margin-top:8px;color:#667085">اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.</div>
    </div>
  `;
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [input.email],
      subject,
      html,
      text,
      tags: [{ name: "category", value: "auth_otp" }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null) as ResendErrorPayload | null;
  if (!response.ok) {
    throw new Error(payload?.message || payload?.name || `Resend request failed (${response.status}).`);
  }
}
