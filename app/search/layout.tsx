import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "جست‌وجوی محصولات",
  description: "در فروشگاه وال جست‌وجو کنید، محصولات مرتبط را پیدا کنید و سفارش خود را سریع ثبت کنید.",
  path: "/search",
  index: false,
  follow: true,
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
