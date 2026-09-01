"use client";

import { useEffect, useState } from "react";
import { IoReloadOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { formatPersianDate } from "@/lib/date-format";
import { formatAmount } from "@/lib/price-format";
import Loading from "@/app/design-system/components/loading/loading";
import { AppHeading } from "@/app/design-system/components/ui/text";

type WalletTransaction = { id: string; amount: number; type: string; createdAt: string };
type WalletData = { balance: number; transactions: WalletTransaction[] };

const loadingWallet: WalletData = {
  balance: 0,
  transactions: [{ id: "loading-transaction", amount: 0, type: "cashback", createdAt: new Date(0).toISOString() }],
};

export function UserWalletPanel() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useTransientAppMessage(message);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/user/wallet", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) throw new Error(data?.message || "دریافت کیف پول انجام نشد.");
      setWallet({
        balance: Number(data.data.wallet?.balance) || 0,
        transactions: Array.isArray(data.data.wallet?.transactions) ? data.data.wallet.transactions : [],
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "دریافت کیف پول انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const displayWallet = wallet ?? loadingWallet;

  return (
    <Loading loading="skeleton-structure" isLoading={loading && !wallet}>
      <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <AppHeading level={2} className="text-base font-bold text-primary-text">کیف پول</AppHeading>
          <span className="text-sm text-secondary-text">اعتبار کیف پول هنگام پرداخت به‌صورت خودکار از مبلغ کم می‌شود.</span>
        </div>
        <CustomButton size="sm" variant="neutral" icon={<IoReloadOutline />} onClick={() => void load()} isLoading={loading}>
          <span>به‌روزرسانی</span>
        </CustomButton>
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-primary-border bg-primary-base p-4">
        <span className="text-xs text-secondary-text">موجودی قابل استفاده</span>
        <span className="text-2xl font-bold text-primary">{formatAmount(displayWallet.balance)}</span>
      </div>

      <div className="flex flex-col gap-2 border-t border-primary-border pt-3">
        <div className="text-sm font-bold"><span>گردش کیف پول</span></div>
        {!loading && displayWallet.transactions.length === 0 ? <CustomEmptyState description="هنوز تراکنشی ثبت نشده است." size="sm" /> : (
          <div className="flex flex-col gap-2">
            {displayWallet.transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-3 border-b border-primary-border pb-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{transaction.type === "cashback" ? "بازگشت وجه خرید" : "استفاده در خرید"}</span>
                  <span className="text-xs text-secondary-text">{formatPersianDate(transaction.createdAt)}</span>
                </div>
                <span className={`text-sm font-bold ${transaction.amount >= 0 ? "text-success-text" : "text-danger-text-nomode"}`}>
                  {transaction.amount >= 0 ? "+" : "−"}{formatAmount(Math.abs(transaction.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      </section>
    </Loading>
  );
}
