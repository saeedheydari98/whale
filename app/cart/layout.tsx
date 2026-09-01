import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "سبد خرید",
  description: "سبد خرید فروشگاه وال برای بررسی سفارش، انتخاب ارسال و تکمیل پرداخت شما.",
  path: "/cart",
  index: false,
  follow: false,
});

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
