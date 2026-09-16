"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { AppHeading } from "@/app/design-system/components/ui/text";

type Language = "fa" | "en";

type DocSection = {
  title: string;
  items: string[];
};

type DocCopy = {
  language: string;
  title: string;
  kicker: string;
  intro: string;
  stackLabel: string;
  stack: string[];
  sections: DocSection[];
  cta: string;
};

const copy: Record<Language, DocCopy> = {
  fa: {
    language: "فارسی",
    title: "وال؛ فروشگاه کاملاً پویا با معماری محصول‌محور",
    kicker: "درباره وال · رزومهٔ فنی پروژه",
    intro:
      "وال یک فروشگاه دیجیتال end-to-end است: ویترین عمومی، پنل ادمین، حساب کاربری، کاتالوگ، سفارش، تم پویا، لودینگ بدون پرش لایه‌بندی، SEO ساختاریافته و لایهٔ امنیت در یک سیستم هماهنگ. این صفحه خلاصهٔ معماری و تصمیم‌های فنی پروژه است تا به‌عنوان رزومهٔ پیاده‌سازی ارائه شود.",
    stackLabel: "فناوری‌های اصلی",
    stack: [
      "Next.js 16 App Router",
      "React 19",
      "TypeScript",
      "Prisma + Neon PostgreSQL",
      "TanStack Query",
      "Tailwind CSS 4",
      "Zod validation",
      "Nodemailer / Gmail OTP",
      "Motion",
      "Vercel deployment",
    ],
    sections: [
      {
        title: "معماری کلی",
        items: [
          "جداسازی مسیرهای فروشگاه، پنل کاربر و پنل ادمین با App Router و layoutهای اختصاصی.",
          "APIهای Route Handler با پاسخ پایدار، rate-limit، و خطای کنترل‌شده بدون نشت جزئیات داخلی.",
          "لایهٔ کاتالوگ با structure سبک برای اسکلتون و payload کامل برای داده؛ ساختار صفحه قبل از داده می‌آید تا CLS نزدیک صفر بماند.",
          "کش کلاینت برای ساختار صفحه، تم، کاربر و کاتالوگ با invalidation هدفمند پس از mutation.",
        ],
      },
      {
        title: "سیستم لودینگ داینامیک",
        items: [
          "یک زیرسیستم مرکزی در loading.tsx: whale برای ناوبری/رفرش، skeleton-structure برای UI مرکب، DynamicLoadingCollection برای لیست‌ها.",
          "تعداد اسکلتون از totalCount / structure.count واقعی می‌آید؛ نه عدد هاردکد ۸ یا ۳۰.",
          "ظرفیت viewport با probe واقعی کارت اندازه‌گیری می‌شود؛ کارت‌های wrap با عرض ذاتی می‌مانند و فضای خالی با اسکلتون اضافه پر نمی‌شود.",
          "صفحهٔ «مشاهده همه» گروه دسته‌بندی، لیست محصولات، ویترین‌ها، برند و جزئیات محصول همه از همین قرارداد پیروی می‌کنند.",
          "LazyViewport بخش‌های خارج از دید را با همان footprint نهایی رزرو می‌کند تا بعد از ظاهر شدن، لایه‌بندی جابه‌جا نشود.",
        ],
      },
      {
        title: "UI و Design System",
        items: [
          "کامپوننت‌های محلی: CustomButton، CustomInput، CustomModal، CustomSwitch، AppHeading، AppImage، EmptyState و اعلان‌ها.",
          "تایپوگرافی معنایی با AppHeading؛ یک h1 در هر صفحه؛ بدنه فقط در div/span.",
          "تم ادمین رنگ primary کل فروشگاه را عوض می‌کند؛ favicon و theme-color همزمان با CSS variables به‌روز می‌شوند.",
          "حالت روشن/تاریک کاربر جدا از پالت ادمین است و روی توکن‌های معنایی اعمال می‌شود.",
        ],
      },
      {
        title: "کاتالوگ و چیدمان فروشگاه",
        items: [
          "محصول، برند، دسته‌بندی، گروه دسته‌بندی، ویترین (showcase)، بنر و چیدمان storefront از پنل ادمین مدیریت می‌شوند.",
          "ویترین دستی و خودکار، فیلتر/مرتب‌سازی، جستجو، امتیاز، موجودی رنگی و گالری چندتصویری.",
          "صفحات structure فقط count و متادیتای سبک می‌دهند؛ دادهٔ کامل در درخواست بعدی می‌آید.",
        ],
      },
      {
        title: "سفارش، کیف پول و تخفیف",
        items: [
          "سبد خرید مهمان و کاربر، checkout، وضعیت سفارش در پنل ادمین و تاریخچه در پنل کاربر.",
          "قوانین تخفیف، کش‌بک، ارسال پستی و کدهای شخصی‌سازی‌شده با نشان unseen برای کاربر.",
          "کیف پول کاربر و اعمال موجودی در مسیر خرید.",
        ],
      },
      {
        title: "احراز هویت و امنیت",
        items: [
          "ورود بدون رمز با OTP ایمیلی از Gmail (SMTP لوکال؛ HTTPS/SMTP روی پروداکشن).",
          "JWT access/refresh، کوکی httpOnly و sameSite=lax، الزام JWT_SECRET در پروداکشن.",
          "هدرهای امنیتی در proxy.ts و next.config، sanitize HTML، اعتبارسنجی Zod روی APIها، rate-limit.",
          "پنل ادمین با قفل دسترسی و نقش superadmin برای بخش‌های حساس.",
        ],
      },
      {
        title: "SEO و قابلیت کشف",
        items: [
          "metadata / generateMetadata برای صفحات عمومی با title، description حدود ۱۵۰–۱۶۰ کاراکتر، canonical، Open Graph و Twitter.",
          "JSON-LD: Organization، WebSite، BreadcrumbList و Product در مسیرهای مرتبط.",
          "URLهای slug-محور، تصویر با next/image و alt، لینک داخلی با next/link.",
          "sitemap و robots برای ایندکس کنترل‌شده.",
        ],
      },
      {
        title: "تم، بوت و تجربهٔ اول بازدید",
        items: [
          "pipeline تم: SSR خاکستری → اعمال رنگ واقعی → نمایش whale → آماده شدن structure → اسکلتون داده.",
          "کش تم در sessionStorage تا رفرش همان تب سریع باشد؛ بستن تب کش را پاک می‌کند تا تم جدید ادمین دیده شود.",
          "بازبینی تم هر ۳۰ دقیقه و هنگام برگشت به تب، بدون نیاز به پاک کردن دستی localStorage.",
        ],
      },
      {
        title: "کیفیت مهندسی",
        items: [
          "TypeScript سخت‌گیرانه، قراردادهای پروژه در AGENTS.md و skill لودینگ/SEO/امنیت.",
          "جداسازی مسئولیت: lib برای سرویس و کلاینت داده، design-system برای UI، app برای مسیرها.",
          "دیپلوی روی Vercel با prisma generate/migrate و binary target مناسب Neon.",
        ],
      },
    ],
    cta: "بازگشت به فروشگاه",
  },
  en: {
    language: "English",
    title: "Wahlle: a fully dynamic commerce platform",
    kicker: "About Wahlle · technical resume",
    intro:
      "Wahlle is an end-to-end digital storefront: public catalog, admin panel, user account, orders, dynamic theme, zero-CLS loading pipeline, structured SEO, and a security layer in one coordinated system. This page summarizes the architecture as an implementation resume.",
    stackLabel: "Core stack",
    stack: [
      "Next.js 16 App Router",
      "React 19",
      "TypeScript",
      "Prisma + Neon PostgreSQL",
      "TanStack Query",
      "Tailwind CSS 4",
      "Zod validation",
      "Nodemailer / Gmail OTP",
      "Motion",
      "Vercel deployment",
    ],
    sections: [
      {
        title: "Architecture",
        items: [
          "Storefront, user panel, and admin panel are separated with App Router layouts.",
          "Route Handlers return stable payloads with rate limiting and controlled errors.",
          "Lightweight page structure drives skeletons; full data loads next to keep layout shift near zero.",
          "Client caches for structure, theme, user, and catalog invalidate after mutations.",
        ],
      },
      {
        title: "Dynamic loading system",
        items: [
          "One central loading subsystem: whale for navigation, skeleton-structure for compound UI, DynamicLoadingCollection for lists.",
          "Skeleton counts come from real totalCount / structure.count — never hardcoded 8/30 defaults.",
          "Viewport capacity is measured from a real card probe; wrap cards keep intrinsic width.",
          "Category-group “view all”, product lists, showcases, brands, and product detail follow the same contract.",
          "LazyViewport reserves the final footprint for off-screen sections.",
        ],
      },
      {
        title: "UI and design system",
        items: [
          "Local primitives: CustomButton, CustomInput, CustomModal, CustomSwitch, AppHeading, AppImage, EmptyState, notifications.",
          "Semantic headings via AppHeading; one h1 per page; body copy stays in div/span.",
          "Admin theme recolors the storefront; favicon and theme-color update with CSS variables.",
          "User light/dark mode is independent of the admin palette.",
        ],
      },
      {
        title: "Catalog and storefront layout",
        items: [
          "Products, brands, categories, category groups, showcases, banners, and storefront layout are admin-managed.",
          "Manual/auto showcases, filters, sorting, search, ratings, color stock, and multi-image galleries.",
          "Structure endpoints return counts and light metadata; detail payloads follow.",
        ],
      },
      {
        title: "Orders, wallet, and discounts",
        items: [
          "Guest and authenticated carts, checkout, admin order status, and user order history.",
          "Discount rules, cashback, postal shipping, and personal codes with unseen badges.",
          "User wallet balance applied in the purchase flow.",
        ],
      },
      {
        title: "Auth and security",
        items: [
          "Passwordless email OTP via Gmail.",
          "JWT access/refresh with httpOnly cookies; JWT_SECRET required in production.",
          "Security headers, HTML sanitization, Zod validation, and API rate limits.",
          "Admin lock and superadmin role for sensitive surfaces.",
        ],
      },
      {
        title: "SEO and discoverability",
        items: [
          "Public metadata with title, 150–160 char descriptions, canonical, Open Graph, and Twitter.",
          "JSON-LD for Organization, WebSite, BreadcrumbList, and Product.",
          "Slug-based URLs, next/image with alt, internal next/link navigation.",
          "Sitemap and robots for controlled indexing.",
        ],
      },
      {
        title: "Theme boot and first paint",
        items: [
          "Theme pipeline: gray SSR → real colors → whale → structure ready → data skeletons.",
          "Theme cache in sessionStorage for same-tab refresh; closing the tab clears it so admin theme changes appear.",
          "Theme revalidation every 30 minutes and on tab focus.",
        ],
      },
      {
        title: "Engineering quality",
        items: [
          "Strict TypeScript plus project contracts for loading, SEO, and security.",
          "Clear layering: lib for data/services, design-system for UI, app for routes.",
          "Vercel deploy with Prisma generate/migrate and Neon-compatible binaries.",
        ],
      },
    ],
    cta: "Back to store",
  },
};

export default function AboutWallPage() {
  const [language, setLanguage] = useState<Language>("fa");
  const doc = copy[language];

  return (
    <main className="flex min-h-full w-full flex-col items-center bg-primary-base px-4 py-10 text-primary-text">
      <section className="flex w-full max-w-5xl flex-col gap-6 rounded-3xl border border-primary-border bg-primary-soft p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-xs font-bold text-secondary-text">{doc.kicker}</span>
            <AppHeading level={1} className="text-3xl font-black text-primary-text md:text-5xl">
              {doc.title}
            </AppHeading>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-secondary-text">EN</span>
            <CustomSwitch checked={language === "en"} onChange={(next) => setLanguage(next ? "en" : "fa")} />
            <span className="text-xs font-bold text-secondary-text">فا</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-primary-border bg-primary-soft p-5">
          <span className="text-sm font-bold leading-7 text-secondary-text">{doc.intro}</span>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-primary-border bg-primary-card p-5">
          <AppHeading level={2} className="text-lg font-black text-primary-text">{doc.stackLabel}</AppHeading>
          <div className="flex flex-wrap gap-2">
            {doc.stack.map((item) => (
              <span
                key={item}
                className="rounded-full border border-primary-border bg-primary-soft px-3 py-1 text-xs font-bold text-primary-text"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {doc.sections.map((section, index) => (
            <article
              key={section.title}
              className="flex flex-col gap-3 rounded-2xl border border-primary-border bg-primary-card p-4"
            >
              <AppHeading level={2} className="text-base font-black text-primary">
                {index + 1}. {section.title}
              </AppHeading>
              <div className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <div key={item} className="flex gap-2 text-sm font-medium leading-7 text-secondary-text">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-primary-border pt-4">
          <span className="text-sm font-black text-secondary-text">{doc.language}</span>
          <Link href="/">
            <CustomButton size="sm" variant="primary">
              <span>{doc.cta}</span>
            </CustomButton>
          </Link>
        </div>
      </section>
    </main>
  );
}
