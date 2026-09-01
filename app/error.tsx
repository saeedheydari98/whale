"use client";

import { CustomButton } from "@/app/design-system/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 bg-primary-base p-6 text-primary-text">
      <div className="text-2xl font-bold">خطایی رخ داد</div>
      <div className="text-sm text-secondary-text">لطفاً دوباره تلاش کنید.</div>
      <CustomButton size="sm" onClick={() => reset()}>تلاش دوباره</CustomButton>
    </main>
  );
}
