"use client";

import Loading from "./loading";

type FullPageLoadingProps = {
  activeStep?: 1 | 2 | 3;
  title?: string;
};

export function FullPageLoading({
  activeStep: _activeStep = 1,
  title: _title = "در حال بارگذاری",
}: FullPageLoadingProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
      style={{
        backgroundColor: "color-mix(in srgb, var(--primary-base) 88%, var(--bg-base))",
      }}
    >
      <div className="flex w-full max-w-xs flex-col items-center justify-center gap-4 px-6">
        <Loading loading="page" isLoading />
      </div>
    </div>
  );
}
