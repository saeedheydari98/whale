# راه‌اندازی ورود بدون رمز با Gmail SMTP

این پروژه کد ورود شش‌رقمی را با SMTP حساب Gmail ارسال می‌کند. این روش به دامنه اختصاصی وابسته نیست و برای پروژه‌های کم‌حجم مناسب است.

## ساخت App Password

1. در حساب Google، ورود دومرحله‌ای را فعال کنید.
2. در بخش `App passwords` یک رمز مخصوص برنامه بسازید.
3. فایل `.env.gmail.example` را مبنا قرار دهید و مقادیر زیر را در `.env` یا secretهای محیط استقرار تنظیم کنید:

```env
GMAIL_SMTP_USER=your-account@gmail.com
GMAIL_SMTP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
GMAIL_FROM_NAME=Whale
```

رمز اصلی حساب Gmail را در پروژه قرار ندهید. فقط از App Password استفاده کنید و آن را در Git یا رابط کاربری منتشر نکنید.

## Vercel

همین سه متغیر را در `Project Settings > Environment Variables` پروژه Vercel اضافه و deployment را دوباره اجرا کنید. برنامه از `smtp.gmail.com` روی پورت امن ۴۶۵ استفاده می‌کند و تا پایان ارسال منتظر می‌ماند.

## دیتابیس و اجرا

پس از تنظیم متغیرها، برنامه را دوباره اجرا کنید:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

کدها پنج دقیقه اعتبار دارند، فقط هش آن‌ها در دیتابیس ذخیره می‌شود، پس از پنج تلاش ناموفق باطل می‌شوند و ارسال مجدد ۶۰ ثانیه زمان انتظار دارد. متغیر `AUTH_OTP_EXPOSE_CODE` فقط برای توسعه محلی است و در production باید خاموش بماند.
