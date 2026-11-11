"use client";

import { useQuery } from "@tanstack/react-query";
import { useStructurePagedCollection } from "@/hooks/use-structure-paged-collection";
import { useAppUser } from "@/lib/app-user-context";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { formatPersianDate } from "@/lib/date-format";
import { formatAmount } from "@/lib/price-format";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { AppHeading } from "@/app/design-system/components/ui/text";

type WalletTransaction = { id: string; amount: number; type: string; createdAt: string };
const loadingTransaction: WalletTransaction = { id: "loading", amount: 0, type: "cashback", createdAt: new Date(0).toISOString() };

function WalletTransactionRow({ transaction }: { transaction: WalletTransaction }) {
  return <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-primary-border pb-2">
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
      <span className="text-sm font-semibold">{transaction.type === "cashback" ? "بازگشت وجه خرید" : "استفاده در خرید"}</span>
      <span className="text-xs tabular-nums text-secondary-text">{formatPersianDate(transaction.createdAt)}</span>
    </div>
    <span className={`text-sm font-bold ${transaction.amount >= 0 ? "text-success-text" : "text-danger-text-nomode"}`}>
      {transaction.amount >= 0 ? "+" : "−"}{formatAmount(Math.abs(transaction.amount))}
    </span>
  </div>;
}

export function UserWalletPanel({ totalCount }: { totalCount?: number }) {
  const { data: appUser } = useAppUser();
  const summary = useQuery({
    queryKey: ["wallet-summary", appUser?.user?.id],
    enabled: Boolean(appUser?.user),
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/user/wallet?scope=summary", { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) throw new Error(payload?.showMessage || "دریافت کیف پول انجام نشد.");
      return Number(payload.data.wallet.balance) || 0;
    },
    staleTime: 30_000, refetchOnWindowFocus: false, retry: false,
  });
  const page = useStructurePagedCollection<WalletTransaction>({ endpoint: "/api/user/wallet", params: "scope=transactions", itemKey: "transactions", totalCount });
  useTransientAppMessage(summary.error?.message || page.error);
  return <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
    <div className="flex flex-col gap-1">
      <AppHeading level={2} className="text-base font-bold text-primary-text">کیف پول</AppHeading>
      <span data-text-wrap className="text-sm text-secondary-text">اعتبار کیف پول هنگام پرداخت به‌صورت خودکار از مبلغ کم می‌شود.</span>
    </div>
    <Loading loading="skeleton-structure" isLoading={Boolean(appUser?.user) && summary.isPending}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-base p-3">
        <span className="text-xs text-secondary-text">موجودی قابل استفاده</span>
        <span className="text-2xl font-bold text-primary">{formatAmount(summary.data ?? 0)}</span>
      </div>
    </Loading>
    <div className="flex flex-col gap-2 border-t border-primary-border pt-3">
      <AppHeading level={3} className="text-sm font-bold">گردش کیف پول</AppHeading>
      {!page.loading && page.items.length === 0 ? <CustomEmptyState description="هنوز تراکنشی ثبت نشده است." size="sm" /> : null}
      <DynamicLoadingCollection items={page.items} isLoading={page.loading} {...page.collectionProps} lazy className="flex flex-col gap-2" getKey={(item) => item.id}
        renderItem={(transaction) => <WalletTransactionRow transaction={transaction} />}
        renderSkeleton={() => <Loading loading="skeleton-structure" isLoading><WalletTransactionRow transaction={loadingTransaction} /></Loading>} />
    </div>
  </section>;
}
