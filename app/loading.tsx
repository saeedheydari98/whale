"use client";

import Loading from "./design-system/components/loading/loading";

export default function RouteLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80">
      <div className="flex w-full max-w-xs flex-col items-center justify-center p-6">
        <Loading loading="page" size="xl" />
      </div>
    </div>
  );
}
