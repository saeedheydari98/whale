"use client";

import { useState } from "react";
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
      "وال یک فروشگاه دیجیتال یکپارچه است که مسیر معرفی محصول، انتخاب و خرید، ثبت سفارش و مدیریت فروشگاه را در کنار هم قرار می‌دهد. ویترین عمومی، حساب کاربری و پنل مدیریت به یک کاتالوگ و مجموعه قواعد مشترک متصل‌اند. بخش مهمی از کار، طراحی جزئیاتی بوده که در استفادهٔ روزمره دیده می‌شوند: نمایش مرحله‌ای محتوا، هماهنگی رنگ‌ها از اولین نمایش، مدیریت موجودی هر رنگ محصول و محاسبهٔ تخفیف و کیف پول. در ادامه، قابلیت‌های پیاده‌شده و ایده‌های پشت آن‌ها را با کاربرد و شیوهٔ اجرای هر بخش مرور می‌کنیم.",
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
          "مسیرهای صفحه، نمایش رابط و منطق کسب‌وکار از هم جدا شده‌اند: مسیرها در app، اجزای مشترک در design-system و سرویس‌های داده در lib قرار دارند. این جداسازی کمک می‌کند یک قانون، مثل محاسبهٔ سفارش، در چند مسیر با رفتار یکسان استفاده شود.",
          "مدل‌های Prisma ارتباط محصول، تنوع رنگ، سبد، سفارش، تراکنش کیف پول و تخفیف را تعریف می‌کنند. رابط کاربری اطلاعات را از API می‌گیرد و بررسی قواعد خرید در سمت سرور انجام می‌شود.",
        ],
      },
      {
        title: "سیستم لودینگ داینامیک",
        items: [
          "ایدهٔ لودینگ داینامیک از پویا بودن خود صفحات شکل گرفت: ترتیب و ترکیب بخش‌ها و حتی اندازهٔ آن‌ها، مثل ارتفاع بنرها، با تنظیمات فروشگاه تغییر می‌کند. به همین دلیل، لایهٔ بارگذاری باید با چیدمان و ابعاد واقعی همان صفحه هماهنگ شود تا هنگام نمایش محتوا، جای عناصر و اندازهٔ بخش‌ها تا حد امکان ثابت بماند.",
          "یک زیرسیستم مرکزی در loading.tsx: whale برای ناوبری/رفرش، skeleton-structure برای UI مرکب، DynamicLoadingCollection برای لیست‌ها.",
          "تعداد اسکلتون از totalCount / structure.count واقعی می‌آید؛ نه عدد هاردکد ۸ یا ۳۰.",
          "ظرفیت viewport با probe واقعی کارت اندازه‌گیری می‌شود؛ کارت‌های wrap با عرض ذاتی می‌مانند و فضای خالی با اسکلتون اضافه پر نمی‌شود.",
          "صفحهٔ «مشاهده همه» گروه دسته‌بندی، لیست محصولات، ویترین‌ها، برند و جزئیات محصول همه از همین قرارداد پیروی می‌کنند.",
          "LazyViewport بخش‌های خارج از دید را با همان footprint نهایی رزرو می‌کند تا بعد از ظاهر شدن، لایه‌بندی جابه‌جا نشود.",
          "ایدهٔ اصلی، اندازه‌گیری همان جزء نهایی به‌جای ساخت یک اسکلتون جداگانه است. عنوان، تصویر، ورودی و دکمه جای خود را در صفحه دارند و لایهٔ بارگذاری بر اساس هندسهٔ آن‌ها ساخته می‌شود؛ هدف، کاهش تغییر اندازه و جابه‌جایی هنگام رسیدن داده است.",
          "در فهرست‌های صفحه‌بندی‌شده، ظرفیت قابل‌نمایش به اندازهٔ درخواست داده تبدیل می‌شود و ادامهٔ فهرست با اسکرول دریافت می‌شود. ویترین‌های افقی مسیر جداگانه‌ای دارند و با اسکرول طبیعی، محصولات همان ویترین را نشان می‌دهند.",
          "لودر وال برای ورود و جابه‌جایی مسیر استفاده می‌شود؛ دریافت داده در همان صفحه، مانند باز کردن یک تب، روی محتوای همان بخش اسکلتون نشان می‌دهد. این تفکیک، زمینهٔ کار کاربر را هنگام انتظار حفظ می‌کند.",
        ],
      },
      {
        title: "UI و Design System",
        items: [
          "کامپوننت‌های محلی: CustomButton، CustomInput، CustomModal، CustomSwitch، AppHeading، AppImage، EmptyState و اعلان‌ها.",
          "تایپوگرافی معنایی با AppHeading؛ یک h1 در هر صفحه؛ بدنه فقط در div/span.",
          "تم ادمین رنگ primary کل فروشگاه را عوض می‌کند؛ favicon و theme-color همزمان با CSS variables به‌روز می‌شوند.",
          "حالت روشن/تاریک کاربر جدا از پالت ادمین است و روی توکن‌های معنایی اعمال می‌شود.",
          "رنگ متن، پس‌زمینه، کادر و حالت‌های تعاملی از توکن‌های مشترک می‌آیند. در نتیجه تغییر پالت فقط یک دکمه را عوض نمی‌کند و اجزای فروشگاه و پنل‌ها از همان زبان بصری پیروی می‌کنند.",
          "کامپوننت‌های مشترک حالت‌های غیرفعال، بارگذاری و تعامل را در خود دارند؛ فرم‌ها و عملیات مختلف می‌توانند بدون تکرار پیاده‌سازی، بازخورد مشابهی به کاربر بدهند. Storybook هم برای مشاهده و بررسی مستقل اجزای رابط در پروژه قرار دارد.",
        ],
      },
      {
        title: "کاتالوگ و چیدمان فروشگاه",
        items: [
          "محصول، برند، دسته‌بندی، گروه دسته‌بندی، ویترین (showcase)، بنر و چیدمان storefront از پنل ادمین مدیریت می‌شوند.",
          "ویترین دستی و خودکار، فیلتر/مرتب‌سازی، جستجو، امتیاز، موجودی رنگی و گالری چندتصویری.",
          "صفحات structure فقط count و متادیتای سبک می‌دهند؛ دادهٔ کامل در درخواست بعدی می‌آید.",
          "چیدمان فروشگاه به داده تبدیل شده است: مدیر می‌تواند ترتیب بخش‌ها و محتوای گروه‌ها، ویترین‌ها و بنرها را مدیریت کند. این ساختار اجازه می‌دهد ترکیب صفحه با تغییر اطلاعات مدیریتی به‌روز شود.",
          "موجودی رنگ‌ها در انتخاب کالا و سفارش نقش دارد؛ گالری، مشخصات، نظرات و امتیاز محصول نیز در صفحهٔ جزئیات کنار هم قرار می‌گیرند تا انتخاب کاربر بر اساس اطلاعات همان کالا باشد.",
        ],
      },
      {
        title: "سفارش، کیف پول و تخفیف",
        items: [
          "سبد خرید مهمان و کاربر، checkout، وضعیت سفارش در پنل ادمین و تاریخچه در پنل کاربر.",
          "قوانین تخفیف، کش‌بک، ارسال پستی و کدهای شخصی‌سازی‌شده با نشان unseen برای کاربر.",
          "کیف پول کاربر و اعمال موجودی در مسیر خرید.",
          "قبل از ثبت سفارش، پیش‌نمایش مبلغ از سمت سرور محاسبه می‌شود: جمع کالاها، تخفیف، سهم کیف پول، هزینهٔ ارسال، مبلغ نهایی و کش‌بک جداگانه مشخص می‌شوند. اعتبار کد تخفیف، مالک آن، تاریخ انقضا و استفادهٔ قبلی نیز بررسی می‌شود.",
          "ثبت سفارش در تراکنش پایگاه داده انجام می‌شود تا مصرف تخفیف، کسر موجودی کالا، برداشت کیف پول و ایجاد سفارش به هم وابسته باشند. این هماهنگی برای جلوگیری از ثبت ناقص عملیات خرید طراحی شده است.",
        ],
      },
      {
        title: "احراز هویت و امنیت",
        items: [
          "ورود بدون رمز با OTP ایمیلی از Gmail (SMTP لوکال؛ HTTPS/SMTP روی پروداکشن).",
          "JWT access/refresh، کوکی httpOnly و sameSite=lax، الزام JWT_SECRET در پروداکشن.",
          "هدرهای امنیتی در proxy.ts و next.config، sanitize HTML، اعتبارسنجی Zod روی APIها، rate-limit.",
          "پنل ادمین با قفل دسترسی و نقش superadmin برای بخش‌های حساس.",
          "دسترسی فقط با مخفی کردن گزینه‌های رابط کنترل نمی‌شود؛ APIهای مدیریتی نیز دسترسی درخواست را بررسی می‌کنند. ورودی‌های فرم و درخواست‌ها پیش از اجرای عملیات اعتبارسنجی می‌شوند و خطاها با پاسخ قابل‌فهم به رابط برمی‌گردند.",
        ],
      },
      {
        title: "SEO و قابلیت کشف",
        items: [
          "metadata / generateMetadata برای صفحات عمومی با title، description حدود ۱۵۰–۱۶۰ کاراکتر، canonical، Open Graph و Twitter.",
          "JSON-LD: Organization، WebSite، BreadcrumbList و Product در مسیرهای مرتبط.",
          "URLهای slug-محور، تصویر با next/image و alt، لینک داخلی با next/link.",
          "sitemap و robots برای ایندکس کنترل‌شده.",
          "اطلاعات اشتراک‌گذاری و داده‌های ساختاریافته در کنار محتوای قابل‌مشاهده تعریف شده‌اند. برای نمونه، صفحهٔ محصول می‌تواند هم عنوان و تصویر مناسب اشتراک‌گذاری داشته باشد و هم اطلاعات Product و مسیر BreadcrumbList را در اختیار موتور جستجو بگذارد.",
        ],
      },
      {
        title: "تم، بوت و تجربهٔ اول بازدید",
        items: [
          "رنگ favicon، همان آیکون وال در تب مرورگر، نیز داینامیک است و با رنگ تم فروشگاه و حالت روشن یا تاریک هماهنگ می‌شود. با تغییر تم، رنگ آیکون هم به‌روز می‌شود تا هویت بصری وال در صفحه و تب مرورگر یکپارچه بماند.",
          "pipeline تم: SSR خاکستری → اعمال رنگ واقعی → نمایش whale → آماده شدن structure → اسکلتون داده.",
          "کش تم در sessionStorage تا رفرش همان تب سریع باشد؛ بستن تب کش را پاک می‌کند تا تم جدید ادمین دیده شود.",
          "بازبینی تم هر ۳۰ دقیقه و هنگام برگشت به تب، بدون نیاز به پاک کردن دستی localStorage.",
          "برای جلوگیری از چشمک رنگ خاکستری، نمایش وال تا اعمال رنگ واقعی یا کش معتبر تم منتظر می‌ماند. آماده بودن رنگ و آماده بودن پوسته دو وضعیت جدا هستند تا در فاصلهٔ راه‌اندازی، محتوای صفحه زودتر از موعد ظاهر نشود.",
          "این ترتیب، هویت بصری فروشگاه را از لحظهٔ نمایش لودر حفظ می‌کند؛ پس از آماده شدن ساختار، محتوای واقعی صفحه همراه با اسکلتون داده‌ها جای آن را می‌گیرد.",
        ],
      },
      {
        title: "همگام‌سازی کاتالوگ و تازگی اطلاعات",
        items: [
          "کلاینت برای تغییرات کاتالوگ اعلان دریافت می‌کند: در صورت تنظیم آدرس WebSocket از آن استفاده می‌شود و در حالت دیگر، اتصال رویدادهای سرور یا SSE برقرار می‌شود.",
          "رویداد تغییر کاتالوگ به لایهٔ داده خبر می‌دهد که کش مرتبط باید بازبینی شود. این ارتباط، تغییرات مدیریتی را به مسیر به‌روزرسانی اطلاعات فروشگاه وصل می‌کند.",
          "ترکیب کش و اعلان تغییر برای حفظ سرعت مراجعهٔ دوباره و فراهم کردن امکان دریافت اطلاعات تازه طراحی شده است؛ دریافت مجدد داده به وضعیت و نیاز بخش مصرف‌کننده وابسته می‌ماند.",
        ],
      },
      {
        title: "ثبت فروش حضوری با قواعد مشترک فروشگاه",
        items: [
          "پنل مدیریت امکان ثبت سفارش حضوری را هم دارد. فروش می‌تواند برای مشتری ثبت‌شده، مشتری جدیدی که همان لحظه ایجاد می‌شود یا مراجعه‌کنندهٔ بدون حساب ثبت شود.",
          "سفارش حضوری و خرید آنلاین از منطق مشترک موجودی، جمع مبالغ، تخفیف و تراکنش کیف پول استفاده می‌کنند. برای مشتری انتخاب‌شده، استفاده از موجودی کیف پول نیز در مسیر ثبت فروش پیش‌بینی شده است.",
          "پیش‌نمایش سفارش پیش از ثبت نهایی، اثر انتخاب کالا، تعداد، تخفیف و کیف پول را نشان می‌دهد. این قابلیت، فروش حضوری را به همان داده‌های کالا و مشتری متصل نگه می‌دارد.",
        ],
      },
      {
        title: "کیفیت مهندسی",
        items: [
          "TypeScript سخت‌گیرانه، قراردادهای پروژه در AGENTS.md و skill لودینگ/SEO/امنیت.",
          "جداسازی مسئولیت: lib برای سرویس و کلاینت داده، design-system برای UI، app برای مسیرها.",
          "دیپلوی روی Vercel با prisma generate/migrate و binary target مناسب Neon.",
          "قرارداد API با OpenAPI در دسترس است و ابزار Swagger برای مرور آن وجود دارد. این مستندات، شکل درخواست و پاسخ را برای بررسی و توسعهٔ کلاینت روشن می‌کنند.",
          "مسیرهای اجرای محلی، ساخت تولید و Docker در پروژه تعریف شده‌اند. بررسی TypeScript و ساخت Next.js نیز بخشی از اعتبارسنجی تغییرات هستند تا ناسازگاری نوع‌ها و خطاهای ساخت پیش از انتشار مشخص شوند.",
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
      "Wahlle connects product discovery, shopping, order creation, and store management in one application. The storefront, customer account, and admin panel share a catalog and business rules. Much of the implementation focuses on everyday details: staged content loading, consistent colors from the first visible frame, stock per product color, and coordinated discount and wallet calculations. The sections below explain the implemented capabilities, the ideas behind them, and how each part works.",
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
          "Routes live in app, reusable interface components in design-system, and data services in lib. This separation lets flows such as online and in-person orders reuse the same business calculations.",
          "Prisma models connect products, color variants, carts, orders, wallet transactions, and discounts. The interface consumes API data while purchase rules are checked on the server.",
        ],
      },
      {
        title: "Dynamic loading system",
        items: [
          "Dynamic loading grew out of the pages themselves being dynamic: store configuration can change the order and combination of sections, as well as their dimensions, such as banner height. The loading layer therefore needs to follow the actual layout and dimensions of each page to keep element positions and section sizes as stable as possible when content appears.",
          "One central loading subsystem: whale for navigation, skeleton-structure for compound UI, DynamicLoadingCollection for lists.",
          "Skeleton counts come from real totalCount / structure.count — never hardcoded 8/30 defaults.",
          "Viewport capacity is measured from a real card probe; wrap cards keep intrinsic width.",
          "Category-group “view all”, product lists, showcases, brands, and product detail follow the same contract.",
          "LazyViewport reserves the final footprint for off-screen sections.",
          "The central idea is to measure the final component instead of maintaining a separate skeleton layout. Loading surfaces follow the geometry of headings, images, inputs, and buttons to reduce movement when data arrives.",
          "Paginated lists use measured viewport capacity to determine request size and fetch more as the user scrolls. Horizontal showcases use native scrolling to reveal the products in that showcase.",
          "The whale handles entry and route navigation. Data fetching within the current page, including opening a tab, uses skeletons over that section so the user keeps their context.",
        ],
      },
      {
        title: "UI and design system",
        items: [
          "Local primitives: CustomButton, CustomInput, CustomModal, CustomSwitch, AppHeading, AppImage, EmptyState, notifications.",
          "Semantic headings via AppHeading; one h1 per page; body copy stays in div/span.",
          "Admin theme recolors the storefront; favicon and theme-color update with CSS variables.",
          "User light/dark mode is independent of the admin palette.",
          "Text, surfaces, borders, and interaction states use shared tokens. A palette change therefore carries through storefront and panel components as a consistent visual language.",
          "Shared controls implement disabled, loading, and interaction states so forms can provide consistent feedback. Storybook is included to inspect interface components independently.",
        ],
      },
      {
        title: "Catalog and storefront layout",
        items: [
          "Products, brands, categories, category groups, showcases, banners, and storefront layout are admin-managed.",
          "Manual/auto showcases, filters, sorting, search, ratings, color stock, and multi-image galleries.",
          "Structure endpoints return counts and light metadata; detail payloads follow.",
          "Storefront composition is represented as data: administrators manage section order, groups, showcases, and banners. Updating that configuration changes how store content is presented.",
          "Color-specific stock connects product selection to ordering. Galleries, specifications, comments, and ratings bring the product information together on its detail page.",
        ],
      },
      {
        title: "Orders, wallet, and discounts",
        items: [
          "Guest and authenticated carts, checkout, admin order status, and user order history.",
          "Discount rules, cashback, postal shipping, and personal codes with unseen badges.",
          "User wallet balance applied in the purchase flow.",
          "A server-calculated quote separates subtotal, discount, wallet contribution, shipping, final total, and cashback before an order is placed. Discount ownership, expiration, and previous use are checked as part of this flow.",
          "Order creation runs inside a database transaction, coordinating discount redemption, stock reduction, wallet debit, and order records to avoid partially recorded purchases.",
        ],
      },
      {
        title: "Auth and security",
        items: [
          "Passwordless email OTP via Gmail.",
          "JWT access/refresh with httpOnly cookies; JWT_SECRET required in production.",
          "Security headers, HTML sanitization, Zod validation, and API rate limits.",
          "Admin lock and superadmin role for sensitive surfaces.",
          "Management APIs check access on the server as well as restricting interface controls. Form and request inputs are validated before operations run, with controlled errors returned to the interface.",
        ],
      },
      {
        title: "SEO and discoverability",
        items: [
          "Public metadata with title, 150–160 char descriptions, canonical, Open Graph, and Twitter.",
          "JSON-LD for Organization, WebSite, BreadcrumbList, and Product.",
          "Slug-based URLs, next/image with alt, internal next/link navigation.",
          "Sitemap and robots for controlled indexing.",
          "Sharing metadata and structured data complement visible content. A product page can provide a sharing title and image alongside Product details and a BreadcrumbList for search engines.",
        ],
      },
      {
        title: "Theme boot and first paint",
        items: [
          "The favicon, the whale icon in the browser tab, also has dynamic colors that follow the store palette and light or dark mode. Theme changes update the icon colors as well, keeping the page and browser tab visually consistent.",
          "Theme pipeline: gray SSR → real colors → whale → structure ready → data skeletons.",
          "Theme cache in sessionStorage for same-tab refresh; closing the tab clears it so admin theme changes appear.",
          "Theme revalidation every 30 minutes and on tab focus.",
          "The whale stays hidden until the actual palette or a valid cached theme has been applied, avoiding a gray color flash. Color readiness and shell readiness are separate states so page content does not appear prematurely during startup.",
          "This sequence carries the store identity into the loader itself. Once structure is ready, the real page subtree takes over with skeletons for pending data.",
        ],
      },
      {
        title: "Catalog synchronization and fresh data",
        items: [
          "The client receives catalog change events through WebSocket when an endpoint is configured, or through Server-Sent Events otherwise.",
          "Catalog invalidation events tell the data layer to revisit related caches, connecting administrative changes to the storefront refresh flow.",
          "Caching supports fast return visits while change notifications enable fresh data to be retrieved. Refetching remains tied to the state and needs of the consuming interface.",
        ],
      },
      {
        title: "In-person sales with shared store rules",
        items: [
          "Administrators can record an in-person order for an existing customer, a customer created during the sale, or a walk-in customer without an account.",
          "Online and in-person orders share stock handling, totals, discounts, and wallet transaction logic. The flow can also apply the selected customer's wallet balance.",
          "A quote shows how products, quantities, discounts, and wallet usage affect the order before submission, keeping in-person sales connected to the same product and customer data.",
        ],
      },
      {
        title: "Engineering quality",
        items: [
          "Strict TypeScript plus project contracts for loading, SEO, and security.",
          "Clear layering: lib for data/services, design-system for UI, app for routes.",
          "Vercel deploy with Prisma generate/migrate and Neon-compatible binaries.",
          "An OpenAPI contract and a Swagger tool describe request and response shapes for inspection and client development.",
          "The project includes local development, production build, and Docker workflows. TypeScript checking and Next.js builds help identify type incompatibilities and build errors before release.",
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
    <main
      lang={language}
      dir={language === "fa" ? "rtl" : "ltr"}
      data-overflow-tooltip="off"
      className="flex min-h-full w-full flex-col items-center bg-primary-base px-4 py-10 text-start text-primary-text"
    >
      <section className="flex w-full max-w-5xl flex-col gap-6 rounded-3xl border border-primary-border bg-primary-soft p-6 shadow-lg">
        <div dir="rtl" className="flex flex-wrap items-start justify-between gap-4">
          <div dir={language === "fa" ? "rtl" : "ltr"} className="flex min-w-0 flex-1 flex-col gap-2">
            <span data-text-wrap className="wrap-anywhere text-xs font-bold text-secondary-text">{doc.kicker}</span>
            <AppHeading level={1} data-text-wrap className="wrap-anywhere text-3xl font-black text-primary-text md:text-5xl">
              {doc.title}
            </AppHeading>
          </div>
          <div className="flex items-center gap-2">
            <span data-text-wrap className="text-xs font-bold text-secondary-text">EN</span>
            <CustomSwitch checked={language === "en"} onChange={(next) => setLanguage(next ? "en" : "fa")} />
            <span data-text-wrap className="text-xs font-bold text-secondary-text">فا</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-primary-border bg-primary-soft p-5">
          <span data-text-wrap className="wrap-anywhere text-sm font-bold leading-7 text-secondary-text">{doc.intro}</span>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-primary-border bg-primary-card p-5">
          <AppHeading level={2} data-text-wrap className="wrap-anywhere text-lg font-black text-primary-text">{doc.stackLabel}</AppHeading>
          <div className="flex flex-wrap gap-2">
            {doc.stack.map((item) => (
              <span
                key={item}
                data-text-wrap
                className="wrap-anywhere rounded-full border border-primary-border bg-primary-soft px-3 py-1 text-xs font-bold text-primary-text"
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
              <AppHeading level={2} data-text-wrap className="wrap-anywhere text-base font-black text-primary">
                {index + 1}. {section.title}
              </AppHeading>
              <div className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <div key={item} className="flex gap-2 text-sm font-medium leading-7 text-secondary-text">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span data-text-wrap className="wrap-anywhere">{item}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-primary-border pt-4">
          <span data-text-wrap className="text-sm font-black text-secondary-text">{doc.language}</span>
          <CustomButton href="/" size="sm" variant="primary">
            <span data-text-wrap>{doc.cta}</span>
          </CustomButton>
        </div>
      </section>
    </main>
  );
}
