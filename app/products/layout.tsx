import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "ویترین محصولات",
  description: "ویترین محصولات فروشگاه وال را ببینید، قیمت‌ها را مقایسه کنید و سفارش خود را با ارسال منظم ثبت کنید.",
  path: "/products",
});

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
