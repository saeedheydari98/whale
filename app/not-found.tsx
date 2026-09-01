import { CustomButton } from "@/app/design-system/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 bg-primary-base p-6 text-primary-text">
      <div className="text-2xl font-bold">صفحه پیدا نشد</div>
      <div className="text-sm text-secondary-text">این مسیر در فروشگاه وال وجود ندارد.</div>
      <CustomButton href="/" size="sm">بازگشت به صفحه اصلی</CustomButton>
    </main>
  );
}
