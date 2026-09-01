import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "حساب کاربری",
  description: "حساب کاربری فروشگاه وال برای سفارش‌ها، تخفیف‌ها و کیف پول.",
  path: "/panel/user",
  index: false,
  follow: false,
});

export default function UserPanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
