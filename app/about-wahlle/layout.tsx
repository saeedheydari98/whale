import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "درباره وال",
  description:
    "وال یک فروشگاه کاملاً پویا با Next.js، لودینگ داینامیک، تم ادمین، SEO ساختاریافته، امنیت API و پنل مدیریت کامل است؛ خلاصهٔ معماری برای ارائه به‌عنوان رزومهٔ فنی.",
  path: "/about-wall",
});

export default function AboutWallLayout({ children }: { children: React.ReactNode }) {
  return children;
}
