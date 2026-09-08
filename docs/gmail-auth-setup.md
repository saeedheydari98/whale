# راه‌اندازی ورود بدون رمز با Gmail

کد ورود از **همان جیمیل خودتان** می‌رود (`GMAIL_SMTP_USER`). لوکال و Vercel هر دو از SMTP جیمیل استفاده می‌کنند (پورت ۴۶۵، در صورت نیاز ۵۸۷).

رمز اصلی Gmail را در پروژه نگذارید؛ از App Password استفاده کنید.

## لوکال

1. در حساب Google ورود دومرحله‌ای را فعال کنید.
2. در `App passwords` یک رمز مخصوص برنامه بسازید.
3. در `.env` بگذارید:

```env
GMAIL_SMTP_USER=your-account@gmail.com
GMAIL_SMTP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
GMAIL_FROM_NAME=Whale
JWT_SECRET=
DATABASE_URL=
```

## Vercel

همان سه مقدار جیمیل را در داشبورد پروژه بگذارید، بعد یک Redeploy بزنید. بدون Redeploy مقدار جدید به تابع‌ها نمی‌رسد.

1. در [Vercel](https://vercel.com) پروژه `whalestore` را باز کنید.
2. `Settings` → `Environment Variables`.
3. این کلیدها را برای محیط **Production** (و در صورت نیاز Preview) بگذارید یا اصلاح کنید:

| Key | مقدار |
| --- | --- |
| `GMAIL_SMTP_USER` | همان ایمیل جیمیل خودتان |
| `GMAIL_SMTP_APP_PASSWORD` | App Password (فاصله‌ها مهم نیستند) |
| `GMAIL_FROM_NAME` | مثلاً `Whale` |
| `JWT_SECRET` | یک رشتهٔ تصادفی و محرمانه؛ در پروداکشن اجباری است |
| `DATABASE_URL` | همان دیتابیس پروداکشن |

4. اگر `GMAIL_WEBHOOK_URL` را قبلاً برای آزمایش گذاشته‌اید و اسکریپت آماده نیست، آن را **حذف** کنید تا ارسال دوباره از SMTP جیمیل برود.
5. `Deployments` → آخرین دیپلوی → `Redeploy` (یا یک پوش جدید بعد از این تغییر کد). گزینهٔ «Use existing Build Cache» را خاموش کنید.
6. روی سایت پروداکشن یک بار «ارسال کد» را بزنید و اینباکس/اسپم همان ایمیلی که وارد کرده‌اید را چک کنید.

`AUTH_OTP_EXPOSE_CODE` را در پروداکشن نگذارید.

## دیتابیس

بیلد Vercel اسکریپت `vercel-build` را اجرا می‌کند و `prisma migrate deploy` می‌زند. لوکال:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

کدها پنج دقیقه اعتبار دارند، فقط هش در دیتابیس ذخیره می‌شود، پس از پنج تلاش ناموفق باطل می‌شوند و ارسال مجدد ۶۰ ثانیه فاصله دارد.
