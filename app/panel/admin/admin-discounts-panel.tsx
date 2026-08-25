"use client";

import { useEffect, useMemo, useState } from "react";
import { IoCreateOutline, IoFlashOutline, IoGiftOutline, IoPeopleOutline, IoReloadOutline, IoSaveOutline, IoSearchOutline, IoTrashOutline, IoWalletOutline } from "react-icons/io5";
import { CustomAccordion } from "@/app/design-system/components/ui/accordion";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomModal } from "@/app/design-system/components/ui/modal";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { AdminUserCompactRow, adminUserMatchesSearch, getAdminUserTitle } from "@/app/panel/admin/admin-user-compact-row";
import { formatPersianDate } from "@/lib/date-format";
import { formatAmount, readFormattedPriceNumber } from "@/lib/price-format";
import { NOTIFICATION_SILENT_HEADER } from "@/lib/app-notifications";

type AudienceType = "new_users" | "purchase_count" | "purchase_amount";
type DiscountType = "percentage" | "free_shipping";
type DiscountRule = {
  id: string;
  name: string;
  audienceType: AudienceType;
  minimumValue: number;
  lookbackDays: number;
  discountType: DiscountType;
  percent?: number | null;
  validDays: number;
  active: boolean;
  lastRunAt?: string | null;
  _count: { discountCodes: number };
};
type DiscountRuleDraft = Pick<DiscountRule, "name" | "audienceType" | "minimumValue" | "lookbackDays" | "discountType" | "validDays"> & {
  percent: number;
};
type DiscountUser = {
  id: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  profiles: Array<{ firstName: string; lastName: string; phone: string }>;
};

function audienceLabel(rule: DiscountRule) {
  if (rule.audienceType === "new_users") return `کاربران عضو‌شده در ${rule.lookbackDays} روز اخیر`;
  if (rule.audienceType === "purchase_count") return `حداقل ${rule.minimumValue} خرید در ${rule.lookbackDays} روز اخیر`;
  return `حداقل ${formatAmount(rule.minimumValue)} مبلغ خرید در ${rule.lookbackDays} روز اخیر`;
}

const DEFAULT_DISCOUNT_RULE: DiscountRuleDraft = {
  name: "",
  audienceType: "purchase_count",
  minimumValue: 2,
  lookbackDays: 30,
  discountType: "percentage",
  percent: 10,
  validDays: 30,
};

function toDiscountRuleDraft(rule: DiscountRule): DiscountRuleDraft {
  return {
    name: rule.name,
    audienceType: rule.audienceType,
    minimumValue: rule.minimumValue,
    lookbackDays: rule.lookbackDays,
    discountType: rule.discountType,
    percent: rule.percent ?? 10,
    validDays: rule.validDays,
  };
}

type DiscountRuleFieldsProps = {
  namePrefix: string;
  value: DiscountRuleDraft;
  nameInvalid: boolean;
  onChange: (patch: Partial<DiscountRuleDraft>) => void;
};

function DiscountRuleFields({ namePrefix, value, nameInvalid, onChange }: DiscountRuleFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <CustomInput
        name={`${namePrefix}-name`}
        autoComplete="off"
        spellCheck={false}
        required
        invalid={nameInvalid}
        value={value.name}
        label="نام کد تخفیف"
        placeholder="نام کد تخفیف"
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <CustomButton size="sm" variant={value.audienceType === "new_users" ? "primary" : "neutral"} onClick={() => onChange({ audienceType: "new_users" })}><span>کاربران جدید</span></CustomButton>
        <CustomButton size="sm" variant={value.audienceType === "purchase_count" ? "primary" : "neutral"} onClick={() => onChange({ audienceType: "purchase_count" })}><span>تعداد خرید</span></CustomButton>
        <CustomButton size="sm" variant={value.audienceType === "purchase_amount" ? "primary" : "neutral"} onClick={() => onChange({ audienceType: "purchase_amount" })}><span>مبلغ خرید</span></CustomButton>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.audienceType === "purchase_count" ? <CustomInput name={`${namePrefix}-minimum-purchase-count`} type="number" min={1} value={value.minimumValue} label="حداقل تعداد خرید" fullWidth={false} className="w-48" onChange={(event) => onChange({ minimumValue: Number(event.target.value) })} /> : null}
        {value.audienceType === "purchase_amount" ? <CustomInput name={`${namePrefix}-minimum-purchase-amount`} inputMode="numeric" value={formatAmount(value.minimumValue)} label="حداقل مبلغ خرید" fullWidth={false} className="w-48" onChange={(event) => onChange({ minimumValue: readFormattedPriceNumber(event.target.value) })} /> : null}
        <CustomInput name={`${namePrefix}-lookback-days`} type="number" min={1} max={3650} value={value.lookbackDays} label="بازه بررسی (روز)" fullWidth={false} className="w-48" onChange={(event) => onChange({ lookbackDays: Number(event.target.value) })} />
        <CustomInput name={`${namePrefix}-valid-days`} type="number" min={1} max={3650} value={value.validDays} label="اعتبار کد (روز)" fullWidth={false} className="w-48" onChange={(event) => onChange({ validDays: Number(event.target.value) })} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <CustomButton size="sm" variant={value.discountType === "percentage" ? "primary" : "neutral"} onClick={() => onChange({ discountType: "percentage" })}><span>تخفیف درصدی</span></CustomButton>
        <CustomButton size="sm" variant={value.discountType === "free_shipping" ? "primary" : "neutral"} onClick={() => onChange({ discountType: "free_shipping" })}><span>ارسال رایگان</span></CustomButton>
        {value.discountType === "percentage" ? <CustomInput name={`${namePrefix}-discount-percent`} type="number" min={1} max={100} value={value.percent} label="درصد تخفیف" fullWidth={false} className="w-40" onChange={(event) => onChange({ percent: Number(event.target.value) })} /> : null}
      </div>
    </div>
  );
}

export function AdminDiscountsPanel() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [users, setUsers] = useState<DiscountUser[]>([]);
  const [cashbackPercent, setCashbackPercent] = useState(0);
  const [ruleDraft, setRuleDraft] = useState<DiscountRuleDraft>(DEFAULT_DISCOUNT_RULE);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [editDraft, setEditDraft] = useState<DiscountRuleDraft | null>(null);
  const [editNameInvalid, setEditNameInvalid] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DiscountUser | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualNameInvalid, setManualNameInvalid] = useState(false);
  const [manualType, setManualType] = useState<DiscountType>("percentage");
  const [manualPercent, setManualPercent] = useState(10);
  const [manualValidDays, setManualValidDays] = useState(30);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useTransientAppMessage(message);
  const filteredUsers = useMemo(
    () => users.filter((user) => adminUserMatchesSearch(user, userSearchQuery)),
    [userSearchQuery, users]
  );

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/discounts", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) throw new Error(data?.message || "دریافت تخفیف‌ها انجام نشد.");
      setRules(Array.isArray(data?.data?.rules) ? data.data.rules : []);
      setUsers(Array.isArray(data?.data?.users) ? data.data.users : []);
      setCashbackPercent(Number(data?.data?.settings?.cashbackPercent) || 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "دریافت تخفیف‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const request = async (method: string, body: Record<string, unknown>) => {
    const response = await fetch("/api/admin/discounts", {
      method,
      headers: { "Content-Type": "application/json", [NOTIFICATION_SILENT_HEADER]: "true" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) throw new Error(data?.message || "عملیات انجام نشد.");
    return data;
  };

  const saveCashback = async () => {
    setSaving(true);
    setMessage("");
    try {
      const data = await request("PATCH", { action: "settings", cashbackPercent });
      setCashbackPercent(data.data.settings.cashbackPercent);
      setMessage("درصد بازگشت وجه ذخیره شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ذخیره تنظیمات انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  const createRule = async () => {
    if (!ruleDraft.name.trim()) {
      setNameInvalid(true);
      setMessage("نام کد تخفیف الزامی است.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await request("POST", ruleDraft);
      setRuleDraft(DEFAULT_DISCOUNT_RULE);
      setNameInvalid(false);
      setMessage("کد تخفیف خودکار ساخته شد.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ساخت کد تخفیف انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  const openRuleEditor = (rule: DiscountRule) => {
    setEditingRule(rule);
    setEditDraft(toDiscountRuleDraft(rule));
    setEditNameInvalid(false);
  };

  const closeRuleEditor = () => {
    if (saving) return;
    setEditingRule(null);
    setEditDraft(null);
    setEditNameInvalid(false);
  };

  const saveRule = async () => {
    if (!editingRule || !editDraft) return;
    if (!editDraft.name.trim()) {
      setEditNameInvalid(true);
      setMessage("نام کد تخفیف الزامی است.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const data = await request("PATCH", { action: "update_rule", id: editingRule.id, ...editDraft });
      setRules((current) => current.map((rule) => rule.id === editingRule.id ? data.data.rule : rule));
      setEditingRule(null);
      setEditDraft(null);
      setEditNameInvalid(false);
      setMessage("کد تخفیف ویرایش شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ویرایش کد تخفیف انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: DiscountRule, active: boolean) => {
    setSaving(true);
    try {
      await request("PATCH", { id: rule.id, active });
      setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active } : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ویرایش کد تخفیف انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (rule: DiscountRule) => {
    if (!window.confirm(`کد تخفیف «${rule.name}» حذف شود؟ کدهای صادرشده کاربران حفظ می‌شوند.`)) return;
    setSaving(true);
    try {
      await request("DELETE", { id: rule.id });
      setRules((current) => current.filter((item) => item.id !== rule.id));
      setMessage("کد تخفیف حذف شد؛ کدهای صادرشده کاربران حفظ شدند.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حذف کد تخفیف انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  const issueManual = async () => {
    if (!selectedUser) return;
    if (!manualName.trim()) {
      setManualNameInvalid(true);
      setMessage("نام کد تخفیف الزامی است.");
      return;
    }
    setSaving(true);
    try {
      const data = await request("POST", { action: "issue_manual", name: manualName, userId: selectedUser.id, discountType: manualType, percent: manualPercent, validDays: manualValidDays });
      setSelectedUser(null);
      setManualName("");
      setManualNameInvalid(false);
      setMessage(`کد ${data.data.discountCode.code} برای کاربر صادر شد.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "صدور کد انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex w-full flex-col gap-3 rounded-lg border border-primary-border bg-primary-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold">تخفیف‌ها</div>
          <span className="text-xs text-secondary-text">تنظیم بازگشت وجه، کدهای خودکار و کدهای اختصاصی</span>
        </div>
        <CustomButton size="sm" variant="neutral" icon={<IoReloadOutline aria-hidden="true" />} onClick={() => void load()} isLoading={loading}>
          <span>به‌روزرسانی</span>
        </CustomButton>
      </div>
      <CustomAccordion
        title="بازگشت وجه کیف پول"
        leading={<IoWalletOutline aria-hidden="true" />}
        meta={`${cashbackPercent}٪ از هر خرید`}
        defaultOpen={false}
        showStatusLabel={false}
        contentClassName="p-2"
      >
        <div className="flex flex-wrap items-end gap-2">
          <CustomInput name="cashback-percent" type="number" min={0} max={100} value={cashbackPercent} label="درصد بازگشت وجه" fullWidth={false} className="w-44" onChange={(event) => setCashbackPercent(Number(event.target.value))} />
          <CustomButton icon={<IoSaveOutline aria-hidden="true" />} isLoading={saving} onClick={() => void saveCashback()}><span>ذخیره درصد</span></CustomButton>
        </div>
      </CustomAccordion>

      <CustomAccordion
        title="کدهای تخفیف خودکار"
        leading={<IoFlashOutline aria-hidden="true" />}
        meta={`${rules.length} کد تخفیف`}
        defaultOpen={false}
        showStatusLabel={false}
        contentClassName="gap-3 p-2"
      >
        <div className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-2.5">
          <span className="text-xs font-bold">ساخت کد تخفیف خودکار</span>
          <DiscountRuleFields
            namePrefix="create-discount-code"
            value={ruleDraft}
            nameInvalid={nameInvalid}
            onChange={(patch) => {
              setRuleDraft((current) => ({ ...current, ...patch }));
              if (patch.name !== undefined) setNameInvalid(false);
            }}
          />
          <CustomButton icon={<IoGiftOutline aria-hidden="true" />} isLoading={saving} onClick={() => void createRule()}><span>ساخت کد تخفیف</span></CustomButton>
        </div>

        <CustomAccordion
          title="کدهای تخفیف ایجادشده"
          leading={<IoGiftOutline aria-hidden="true" />}
          meta={`${rules.length} کد تخفیف`}
          defaultOpen={false}
          showStatusLabel={false}
          contentClassName="gap-1.5 p-1"
        >
          {rules.length === 0 && !loading ? <CustomEmptyState description="هنوز کد تخفیف خودکاری ساخته نشده است." size="sm" /> : null}
          <div className="flex w-full flex-col gap-1.5">
            {rules.map((rule) => (
              <div key={rule.id} className="flex w-full flex-wrap items-center gap-2 rounded-md border border-primary-border bg-primary-card px-2.5 py-2">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-xs font-bold">{rule.name}</span>
                  <span className="truncate text-[11px] text-secondary-text">{audienceLabel(rule)} · {rule.discountType === "free_shipping" ? "ارسال رایگان" : `${rule.percent ?? 0}٪ تخفیف`} · اعتبار {rule.validDays} روز</span>
                  <span className="truncate text-[10px] text-secondary-text">{rule._count.discountCodes} کد صادرشده{rule.lastRunAt ? ` · آخرین اجرا ${formatPersianDate(rule.lastRunAt)}` : ""}</span>
                </span>
                <CustomSwitch checked={rule.active} onChange={(active) => void toggleRule(rule, active)} disabled={saving} />
                <CustomButton size="sm" variant="neutral" icon={<IoCreateOutline aria-hidden="true" />} disabled={saving} onClick={() => openRuleEditor(rule)}><span>ویرایش</span></CustomButton>
                <CustomButton size="sm" variant="danger" icon={<IoTrashOutline aria-hidden="true" />} disabled={saving} onClick={() => void deleteRule(rule)}><span>حذف</span></CustomButton>
              </div>
            ))}
          </div>
        </CustomAccordion>
      </CustomAccordion>

      <CustomAccordion
        title="صدور دستی کد"
        leading={<IoPeopleOutline aria-hidden="true" />}
        meta={`${filteredUsers.length} از ${users.length} کاربر`}
        defaultOpen={false}
        showStatusLabel={false}
        contentClassName="gap-2 p-2"
      >
        <CustomInput
          type="search"
          name="discount-user-search"
          autoComplete="off"
          spellCheck={false}
          value={userSearchQuery}
          label="جست‌وجوی کاربران برای صدور کد"
          aria-label="جست‌وجوی کاربران با نام، موبایل یا ایمیل"
          placeholder="نام، موبایل یا ایمیل…"
          icon={<IoSearchOutline aria-hidden="true" />}
          onChange={(event) => setUserSearchQuery(event.target.value)}
        />
        {!loading && users.length === 0 ? <CustomEmptyState description="کاربری برای صدور کد پیدا نشد." size="sm" /> : null}
        {!loading && users.length > 0 && filteredUsers.length === 0 ? <CustomEmptyState description="کاربری مطابق جست‌وجو پیدا نشد." size="sm" /> : null}
        <div className="flex w-full flex-col gap-1.5" aria-live="polite">
          {filteredUsers.map((user) => (
            <AdminUserCompactRow
              key={user.id}
              user={user}
              trailing={<span>انتخاب</span>}
              onSelect={() => setSelectedUser(user)}
            />
          ))}
        </div>
      </CustomAccordion>

      <CustomModal open={Boolean(editingRule && editDraft)} onClose={closeRuleEditor} title="ویرایش کد تخفیف" isLoading={saving} closeOnBackdrop={!saving}>
        {editDraft ? (
          <div className="flex flex-col gap-3">
            <DiscountRuleFields
              namePrefix="edit-discount-code"
              value={editDraft}
              nameInvalid={editNameInvalid}
              onChange={(patch) => {
                setEditDraft((current) => current ? { ...current, ...patch } : current);
                if (patch.name !== undefined) setEditNameInvalid(false);
              }}
            />
            <CustomButton icon={<IoSaveOutline aria-hidden="true" />} isLoading={saving} onClick={() => void saveRule()}><span>ذخیره تغییرات</span></CustomButton>
          </div>
        ) : null}
      </CustomModal>

      <CustomModal open={Boolean(selectedUser)} onClose={() => { setSelectedUser(null); setManualNameInvalid(false); }} title="صدور کد دستی" isLoading={saving} closeOnBackdrop={!saving}>
        <div className="flex flex-col gap-3">
          <span className="text-sm font-bold">{selectedUser ? getAdminUserTitle(selectedUser) : ""}</span>
          <CustomInput name="manual-discount-name" autoComplete="off" spellCheck={false} required invalid={manualNameInvalid} value={manualName} label="نام کد تخفیف" placeholder="مثلاً تخفیف خرید سوم" onChange={(event) => { setManualName(event.target.value); setManualNameInvalid(false); }} />
          <div className="flex gap-2"><CustomButton fullWidth variant={manualType === "percentage" ? "primary" : "neutral"} onClick={() => setManualType("percentage")}><span>درصدی</span></CustomButton><CustomButton fullWidth variant={manualType === "free_shipping" ? "primary" : "neutral"} onClick={() => setManualType("free_shipping")}><span>ارسال رایگان</span></CustomButton></div>
          {manualType === "percentage" ? <CustomInput name="manual-discount-percent" type="number" min={1} max={100} value={manualPercent} label="درصد تخفیف" onChange={(event) => setManualPercent(Number(event.target.value))} /> : null}
          <CustomInput name="manual-discount-valid-days" type="number" min={1} max={3650} value={manualValidDays} label="اعتبار کد (روز)" onChange={(event) => setManualValidDays(Number(event.target.value))} />
          <CustomButton icon={<IoGiftOutline aria-hidden="true" />} isLoading={saving} onClick={() => void issueManual()}><span>صدور کد ۶ کاراکتری</span></CustomButton>
        </div>
      </CustomModal>
    </section>
  );
}
