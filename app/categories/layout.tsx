import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "دسته‌بندی محصولات",
  description: "دسته‌بندی محصولات فروشگاه وال را ببینید و سریع‌تر کالای موردنظر را پیدا کنید و سفارش دهید.",
  path: "/categories",
});

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
