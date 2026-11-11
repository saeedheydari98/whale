"use client";

import { collectionCardClasses } from "@/app/design-system/variants/collection-card.variant";

import { useStructurePagedCollection } from "@/hooks/use-structure-paged-collection";
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
  const page = useStructurePagedCollection<WalletCode>({ endpoint: "/api/user/wallet", params: "scope=discounts", itemKey: "codes", totalCount });
  const { items: activeCodes, loading } = page;
  const notification = useAppNotification();
  useTransientAppMessage(page.error);

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
        {...page.collectionProps}
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
    <div data-card-family="discount" className={collectionCardClasses("discount", "flex flex-col gap-1 overflow-hidden rounded-md border border-primary-border bg-primary-base p-2")}>
      <AppHeading level={3} className="truncate text-sm font-bold text-primary-text">{code.name}</AppHeading>
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span dir="ltr" translate="no" className="min-w-0 truncate text-lg font-bold tracking-[0.3em] text-primary">{code.code}</span>
        <CustomButton size="xs" variant="neutral" icon={<IoCopyOutline aria-hidden="true" />} onClick={onCopy}>
          <span>کپی</span>
        </CustomButton>
      </span>
      <span className="text-xs text-secondary-text">{code.type === "free_shipping" ? "ارسال رایگان" : `${code.percent ?? 0}٪ تخفیف`}</span>
      <span className="text-xs text-secondary-text">معتبر تا {formatPersianDate(code.expiresAt)}</span>
    </div>
  );
}
