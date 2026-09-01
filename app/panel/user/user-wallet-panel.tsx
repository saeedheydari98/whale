"use client";

import { useEffect, useState } from "react";
import { IoCopyOutline, IoReloadOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { useAppNotification, useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { formatPersianDate } from "@/lib/date-format";
import { formatAmount } from "@/lib/price-format";
import Loading from "@/app/design-system/components/loading/loading";

type WalletCode = { id: string; name: string; code: string; type: string; percent?: number | null; expiresAt: string; usedAt?: string | null };
type WalletTransaction = { id: string; amount: number; type: string; createdAt: string };
type WalletData = { balance: number; discountCodes: WalletCode[]; transactions: WalletTransaction[] };

const loadingWallet: WalletData = {
  balance: 0,
  discountCodes: [{ id: "loading-code", name: "کد تخفیف", code: "CODE", type: "percent", percent: 0, expiresAt: new Date(Date.now() + 86_400_000).toISOString() }],
  transactions: [{ id: "loading-transaction", amount: 0, type: "cashback", createdAt: new Date(0).toISOString() }],
};

export function UserWalletPanel() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [loadedAt, setLoadedAt] = useState(0);
  const notification = useAppNotification();
  useTransientAppMessage(message);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/user/wallet", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) throw new Error(data?.message || "دریافت کیف پول انجام نشد.");
      setWallet(data.data.wallet);
      setLoadedAt(Date.now());
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
  const activeCodes = displayWallet.discountCodes.filter((code) => !code.usedAt && new Date(code.expiresAt).getTime() > loadedAt);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notification.success("کد تخفیف کپی شد.");
    } catch {
      notification.error("کپی کد تخفیف انجام نشد.");
    }
  };

  return (
    <Loading loading="skeleton-structure" isLoading={loading && !wallet}>
      <section className="flex flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-4 text-primary-text">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold text-primary-text">کیف پول</div>
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
      <div className="flex flex-col gap-2">
        <div className="text-sm font-bold"><span>کدهای قابل استفاده</span></div>
        {!loading && activeCodes.length === 0 ? <CustomEmptyState description="کد تخفیف فعالی ندارید." size="sm" /> : (
          <div className="flex flex-wrap gap-2">
            {activeCodes.map((code) => (
              <div key={code.id} className="flex min-w-56 flex-col gap-1 rounded-md border border-primary-border bg-primary-base p-3">
                <span className="truncate text-sm font-bold text-primary-text">{code.name}</span>
                <span className="flex items-center justify-between gap-2">
                  <span dir="ltr" translate="no" className="text-lg font-bold tracking-[0.3em] text-primary">{code.code}</span>
                  <CustomButton size="sm" variant="neutral" icon={<IoCopyOutline aria-hidden="true" />} onClick={() => void copyCode(code.code)}>
                    <span>کپی</span>
                  </CustomButton>
                </span>
                <span className="text-xs text-secondary-text">{code.type === "free_shipping" ? "ارسال رایگان" : `${code.percent ?? 0}٪ تخفیف`}</span>
                <span className="text-xs text-secondary-text">معتبر تا {formatPersianDate(code.expiresAt)}</span>
              </div>
            ))}
          </div>
        )}
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
