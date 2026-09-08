# راه‌اندازی ورود بدون رمز با Gmail

این پروژه کد ورود شش‌رقمی را از حساب Gmail شما می‌فرستد. لوکال از SMTP استفاده می‌کند. دامنهٔ Vercel پورت SMTP را می‌بندد، بنابراین پروداکشن باید از HTTPS بفرستد.

## لوکال (SMTP)

1. در حساب Google ورود دومرحله‌ای را فعال کنید.
2. در `App passwords` یک رمز مخصوص برنامه بسازید.
3. در `.env` بگذارید:

```env
GMAIL_SMTP_USER=your-account@gmail.com
GMAIL_SMTP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
GMAIL_FROM_NAME=Whale
JWT_SECRET=
```

رمز اصلی Gmail را در پروژه نگذارید.

## Vercel (HTTPS، الزامی)

SMTP روی `whalestore.vercel.app` کار نمی‌کند و `/api/auth/request-otp` با `503` برمی‌گردد. یکی از دو روش HTTPS را اضافه کنید، بعد دیپلوی کنید.

### روش ۱ — Apps Script (یک آدرس وب‌هوک)

1. به [Google Apps Script](https://script.google.com) بروید و یک پروژه بسازید.
2. این کد را جایگزین `Code.gs` کنید:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");
  const expected = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "";
  if (expected && data.secret !== expected) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }
  MailApp.sendEmail({
    to: String(data.to || ""),
    subject: String(data.subject || ""),
    body: String(data.text || ""),
    htmlBody: String(data.html || data.text || ""),
    name: String(data.fromName || "Whale"),
  });
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
```

3. `Project Settings > Script properties`: کلید `WEBHOOK_SECRET` با یک رشتهٔ تصادفی.
4. `Deploy > New deployment > Web app`: Execute as **Me**، Who has access **Anyone**.
5. URL را در Vercel بگذارید:

```env
GMAIL_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
GMAIL_WEBHOOK_SECRET=همان-مقدار-اسکریپت
GMAIL_FROM_NAME=Whale
JWT_SECRET=
DATABASE_URL=
```

ایمیل از همان حساب گوگلِ صاحب اسکریپت می‌رود.

### روش ۲ — Gmail API (OAuth)

اگر ترجیح می‌دهید Cloud Console:

1. Gmail API را روشن کنید و OAuth Client بسازید.
2. Refresh token با اسکوپ `https://www.googleapis.com/auth/gmail.send` بگیرید.
3. در Vercel:

```env
GMAIL_SMTP_USER=your-account@gmail.com
GMAIL_FROM_NAME=Whale
GMAIL_OAUTH_CLIENT_ID=
GMAIL_OAUTH_CLIENT_SECRET=
GMAIL_OAUTH_REFRESH_TOKEN=
JWT_SECRET=
DATABASE_URL=
```

## دیتابیس

بیلد Vercel اسکریپت `vercel-build` را اجرا می‌کند و `prisma migrate deploy` می‌زند. لوکال:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

کدها پنج دقیقه اعتبار دارند، فقط هش در دیتابیس ذخیره می‌شود، پس از پنج تلاش ناموفق باطل می‌شوند و ارسال مجدد ۶۰ ثانیه فاصله دارد. `AUTH_OTP_EXPOSE_CODE` فقط برای توسعهٔ محلی است.
