"use client";

import { useEffect, useState } from "react";
import { IoCopyOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { useAppNotification, useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { formatPersianDate } from "@/lib/date-format";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { AppHeading } from "@/app/design-system/components/ui/text";

type WalletCode = { id: string; name: string; code: string; type: string; percent?: number | null; expiresAt: string; usedAt?: string | null };

const loadingCode: WalletCode = {
  id: "loading-code",
  name: "کد تخفیف",
  code: "CODE",
  type: "percent",
  percent: 0,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

export function UserDiscountsPanel({ totalCount }: { totalCount?: number }) {
  const [codes, setCodes] = useState<WalletCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [, setCapacity] = useState(0);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const notification = useAppNotification();
  useTransientAppMessage(message);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/user/wallet", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) throw new Error(data?.message || "دریافت کدهای تخفیف انجام نشد.");
      const nextCodes = Array.isArray(data?.data?.wallet?.discountCodes) ? data.data.wallet.discountCodes as WalletCode[] : [];
      setCodes(nextCodes);
      setLoadedAt(Date.now());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "دریافت کدهای تخفیف انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeCodes = codes.filter((code) => !code.usedAt && new Date(code.expiresAt).getTime() > loadedAt);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notification.success("کد تخفیف کپی شد.");
    } catch {
      notification.error("کپی کد تخفیف انجام نشد.");
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
      <div className="flex flex-col gap-1">
        <Loading loading="skeleton-item" isLoading={loading}>
          <AppHeading level={2} className="text-base font-bold text-primary-text">کدهای تخفیف</AppHeading>
        </Loading>
        <Loading loading="skeleton-item" isLoading={loading}>
          <span className="text-sm text-secondary-text">کدهای فعال را کپی کنید و هنگام پرداخت استفاده کنید.</span>
        </Loading>
      </div>
      {!loading && activeCodes.length === 0 ? <CustomEmptyState description="کد تخفیف فعالی ندارید." size="sm" /> : null}
      <DynamicLoadingCollection
        items={activeCodes}
        isLoading={loading}
        totalCount={totalCount}
        onCapacityChange={totalCount === undefined ? undefined : setCapacity}
        className="flex flex-wrap gap-2"
        getKey={(code) => code.id}
        lazy
        renderItem={(code) => <DiscountCodeCard code={code} onCopy={() => void copyCode(code.code)} />}
        renderSkeleton={() => (
          <Loading loading="skeleton-structure" isLoading>
            <DiscountCodeCard code={loadingCode} onCopy={() => undefined} />
          </Loading>
        )}
      />
    </section>
  );
}

function DiscountCodeCard({ code, onCopy }: { code: WalletCode; onCopy: () => void }) {
  return (
    <div className="flex min-w-56 flex-col gap-1 rounded-md border border-primary-border bg-primary-base p-3">
      <AppHeading level={3} className="truncate text-sm font-bold text-primary-text">{code.name}</AppHeading>
      <span className="flex items-center justify-between gap-2">
        <span dir="ltr" translate="no" className="text-lg font-bold tracking-[0.3em] text-primary">{code.code}</span>
        <CustomButton size="sm" variant="neutral" icon={<IoCopyOutline aria-hidden="true" />} onClick={onCopy}>
          <span>کپی</span>
        </CustomButton>
      </span>
      <span className="text-xs text-secondary-text">{code.type === "free_shipping" ? "ارسال رایگان" : `${code.percent ?? 0}٪ تخفیف`}</span>
      <span className="text-xs text-secondary-text">معتبر تا {formatPersianDate(code.expiresAt)}</span>
    </div>
  );
}
