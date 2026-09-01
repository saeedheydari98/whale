import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "حساب کاربری",
  description: "ورود به پنل حساب کاربری و مدیریت فروشگاه وال.",
  path: "/panel",
  index: false,
  follow: false,
});

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
