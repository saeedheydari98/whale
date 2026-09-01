import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "پنل مدیریت",
  description: "پنل مدیریت فروشگاه وال برای محصولات، سفارش‌ها و تنظیمات.",
  path: "/panel/admin",
  index: false,
  follow: false,
});

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
