"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoAddOutline, IoCheckmarkCircleOutline, IoCloseOutline, IoSearchOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { AppImage } from "@/app/design-system/components/ui/app-image";
import { colorLabel, getStockColorValue, normalizeStockEntries } from "@/app/design-system/components/ui/color-stock-dots";
import { AppHeading } from "@/app/design-system/components/ui/text";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { colorSelectionTotal, serializeColorSelection } from "@/lib/cart-color-selection";
import { formatAmount, readFormattedPriceNumber } from "@/lib/price-format";
import { fetchJsonDeduped } from "@/lib/fetch-json";

export type AdminInPersonProduct = {
  id: number;
  title: string;
  description?: string | null;
  price: string;
  originalPrice?: string | null;
  discountPrice?: string | null;
  discountPercent?: number | null;
  imageUrl?: string | null;
  stockQuantity: number;
  active?: boolean;
  isActive?: boolean;
  isAvailable?: boolean;
  colorStock?: unknown;
};

export type AdminInPersonCustomer = {
  id: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
  walletBalance: number;
  profiles: Array<{ firstName: string; lastName: string; phone: string; email?: string | null }>;
};

type InPersonQuote = {
  subtotal: number;
  discountAmount: number;
  walletAmount: number;
  shippingAmount: number;
  total: number;
  cashbackEarned: number;
  cashbackPercent: number;
  walletBalance: number;
  discountCode: string | null;
  discountType: "percentage" | "free_shipping" | null;
  discountPercent: number | null;
};

type InPersonQuoteState = {
  inputKey: string;
  value: InPersonQuote;
};

type InPersonLine = {
  key: string;
  product: AdminInPersonProduct;
  colorCounts: Record<string, number>;
  quantity: number;
};

type NewCustomerForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
};

const ADMIN_PRODUCTS_URL = "/api/admin/products";
const ADMIN_USERS_URL = "/api/admin/users";
const IN_PERSON_ORDERS_URL = "/api/admin/orders/in-person";
const IN_PERSON_QUOTE_URL = "/api/admin/orders/in-person/quote";

const loadingProduct: AdminInPersonProduct = {
  id: 0,
  title: "محصول",
  description: "",
  price: "0",
  stockQuantity: 0,
  colorStock: {},
};

const loadingCustomer: AdminInPersonCustomer = {
  id: 0,
  name: "کاربر",
  username: "user",
  email: "user@example.com",
  role: "user",
  walletBalance: 0,
  profiles: [{ firstName: "نام", lastName: "کاربر", phone: "09" }],
};

function customerLabel(customer: AdminInPersonCustomer) {
  const profile = customer.profiles?.[0];
  const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
  return name || customer.name || customer.username || `کاربر ${customer.id}`;
}

function customerSearchText(customer: AdminInPersonCustomer) {
  const profile = customer.profiles?.[0];
  return [
    customer.id,
    customer.name,
    customer.username,
    customer.email,
    profile?.firstName,
    profile?.lastName,
    profile?.phone,
    profile?.email,
  ].filter(Boolean).join(" ").toLowerCase();
}

function productSearchText(product: AdminInPersonProduct) {
  return [product.id, product.title, product.description].filter(Boolean).join(" ").toLowerCase();
}

function unitPrice(product: AdminInPersonProduct) {
  return readFormattedPriceNumber(product.discountPrice || product.price);
}

function createLine(product: AdminInPersonProduct): InPersonLine {
  const hasColors = normalizeStockEntries(product.colorStock).length > 0;
  return {
    key: `line-${product.id}`,
    product,
    colorCounts: {},
    quantity: hasColors ? 0 : 1,
  };
}

function buildPayloadLines(lines: InPersonLine[]) {
  return lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      productId: line.product.id,
      title: line.product.title,
      description: line.product.description ?? "",
      price: line.product.price,
      originalPrice: line.product.originalPrice ?? null,
      discountPrice: line.product.discountPrice ?? null,
      discountPercent: line.product.discountPercent ?? null,
      imageUrl: line.product.imageUrl ?? null,
      selectedColor: serializeColorSelection(line.colorCounts) || null,
      quantity: line.quantity,
    }));
}

type AdminInPersonOrderFormProps = {
  productsCount?: number;
  usersCount?: number;
  onCreated: (orderId: string) => void;
  onClose: () => void;
};

export function AdminInPersonOrderForm({ productsCount, usersCount, onCreated, onClose }: AdminInPersonOrderFormProps) {
  const [products, setProducts] = useState<AdminInPersonProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productQuery, setProductQuery] = useState("");
  const [customers, setCustomers] = useState<AdminInPersonCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customer, setCustomer] = useState<AdminInPersonCustomer | null>(null);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({ firstName: "", lastName: "", phone: "", email: "", address: "" });
  const [lines, setLines] = useState<InPersonLine[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [quote, setQuote] = useState<InPersonQuoteState | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErrorKey, setQuoteErrorKey] = useState<string | null>(null);
  const quoteRequestId = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  useTransientAppMessage(message);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetchJsonDeduped<{ ok?: boolean; showMessage?: string; data?: { products?: AdminInPersonProduct[] } }>(ADMIN_PRODUCTS_URL, { force: true });
        if (cancelled) return;
        if (response?.ok === false) throw new Error(response.showMessage || "دریافت اطلاعات ناموفق بود.");
        setProducts(Array.isArray(response?.data?.products) ? response.data.products : []);
      } catch {
        if (!cancelled) {
          setProducts([]);
          setMessage("دریافت محصولات ممکن نشد.");
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(ADMIN_USERS_URL, { cache: "no-store" });
        const data = await response.json().catch(() => null) as { ok?: boolean; showMessage?: string; data?: { users?: AdminInPersonCustomer[] } } | null;
        if (cancelled) return;
        if (!response.ok || data?.ok === false) throw new Error(data?.showMessage || "دریافت کاربران ممکن نشد.");
        setCustomers(Array.isArray(data?.data?.users) ? data.data.users : []);
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setMessage("دریافت کاربران ممکن نشد.");
        }
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => productSearchText(product).includes(query));
  }, [productQuery, products]);

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((entry) => customerSearchText(entry).includes(query));
  }, [customerQuery, customers]);

  const payloadLines = useMemo(() => buildPayloadLines(lines), [lines]);
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + unitPrice(line.product) * line.quantity, 0),
    [lines]
  );

  const addProduct = useCallback((product: AdminInPersonProduct) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (!existing) return [...current, createLine(product)];
      if (normalizeStockEntries(product.colorStock).length > 0) return current;
      return current.map((line) => (line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line));
    });
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const setLineQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) => current.map((line) => (
      line.key === key
        ? { ...line, quantity: Math.max(0, Math.min(Math.round(Number(quantity) || 0), line.product.stockQuantity)) }
        : line
    )));
  }, []);

  const setLineColorCount = useCallback((key: string, color: string, count: number) => {
    setLines((current) => current.map((line) => {
      if (line.key !== key) return line;
      const colorCounts = { ...line.colorCounts };
      const next = Math.max(0, Math.round(Number(count) || 0));
      if (next > 0) colorCounts[color] = next;
      else delete colorCounts[color];
      return { ...line, colorCounts, quantity: colorSelectionTotal(colorCounts) };
    }));
  }, []);

  const newCustomerReady = useMemo(() => (
    newCustomer.firstName.trim().length > 0
    && newCustomer.lastName.trim().length > 0
    && newCustomer.phone.trim().length === 11
    && newCustomer.email.trim().includes("@")
    && newCustomer.address.trim().length >= 5
  ), [newCustomer]);

  const customerPayload = useMemo(() => {
    if (customerMode === "new") {
      return {
        customerUserId: null,
        newCustomer: {
          firstName: newCustomer.firstName.trim(),
          lastName: newCustomer.lastName.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email.trim().toLowerCase(),
          address: newCustomer.address.trim(),
        },
      };
    }
    return { customerUserId: customer?.id ?? null, newCustomer: null };
  }, [customer?.id, customerMode, newCustomer]);

  const quoteInputKey = useMemo(() => JSON.stringify({
    ...customerPayload,
    discountCode: discountCode.trim() || undefined,
    useWallet,
    lines: payloadLines,
  }), [customerPayload, discountCode, payloadLines, useWallet]);
  const activeQuote = quote?.inputKey === quoteInputKey ? quote.value : null;
  const quoteEligible = payloadLines.length > 0 && (customerMode !== "new" || newCustomerReady);
  const quoteDataLoading = quoteEligible
    && (quoteLoading || (!activeQuote && quoteErrorKey !== quoteInputKey));

  const requestQuote = useCallback(async () => {
    const requestId = quoteRequestId.current + 1;
    quoteRequestId.current = requestId;
    if (payloadLines.length === 0) {
      setQuote(null);
      setQuoteErrorKey(null);
      setQuoteLoading(false);
      return;
    }
    if (customerMode === "new" && !newCustomerReady) {
      setQuote(null);
      setQuoteErrorKey(null);
      setQuoteLoading(false);
      return;
    }
    setQuoteLoading(true);
    setQuoteErrorKey(null);
    setMessage("");
    try {
      const response = await fetch(IN_PERSON_QUOTE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customerPayload,
          discountCode: discountCode.trim() || undefined,
          useWallet,
          lines: payloadLines,
        }),
      });
      const data = await response.json().catch(() => null) as { ok?: boolean; showMessage?: string; data?: { quote?: InPersonQuote } } | null;
      if (!response.ok || data?.ok === false || !data?.data?.quote) {
        throw new Error(data?.showMessage || "استعلام مبلغ سفارش ممکن نشد.");
      }
      if (requestId === quoteRequestId.current) {
        setQuote({ inputKey: quoteInputKey, value: data.data.quote });
        setQuoteErrorKey(null);
      }
    } catch (error) {
      if (requestId === quoteRequestId.current) {
        setQuote(null);
        setQuoteErrorKey(quoteInputKey);
        setMessage(error instanceof Error ? error.message : "استعلام مبلغ سفارش ممکن نشد.");
      }
    } finally {
      if (requestId === quoteRequestId.current) setQuoteLoading(false);
    }
  }, [customerPayload, discountCode, newCustomerReady, customerMode, payloadLines, quoteInputKey, useWallet]);

  useEffect(() => {
    const timer = window.setTimeout(() => void requestQuote(), 400);
    return () => window.clearTimeout(timer);
  }, [requestQuote]);

  const submitOrder = async () => {
    if (payloadLines.length === 0) {
      setMessage("برای ثبت سفارش حداقل یک محصول انتخاب کنید.");
      return;
    }
    if (customerMode === "new" && !newCustomerReady) {
      setMessage("مشخصات کاربر جدید را کامل کنید.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(IN_PERSON_ORDERS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customerPayload,
          discountCode: discountCode.trim() || undefined,
          useWallet,
          lines: payloadLines,
        }),
      });
      const data = await response.json().catch(() => null) as { ok?: boolean; showMessage?: string; data?: { order?: { orderId?: string } } } | null;
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.showMessage || "ثبت سفارش حضوری انجام نشد.");
      }
      const orderId = data?.data?.order?.orderId ?? "";
      onCreated(orderId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ثبت سفارش حضوری انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  const incompleteColorLine = lines.find((line) => {
    if (normalizeStockEntries(line.product.colorStock).length === 0) return false;
    return line.quantity <= 0 || colorSelectionTotal(line.colorCounts) !== line.quantity;
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <AppHeading level={3} className="text-sm font-bold text-primary-text">مشتری</AppHeading>
        {customerMode === "new" ? (
          <div className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-2">
            <span className="text-xs font-bold text-secondary-text">اطلاعات کاربر جدید (همزمان اکانت ساخته می‌شود)</span>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-40 flex-1">
                <CustomInput
                  value={newCustomer.firstName}
                  label="نام"
                  placeholder="نام"
                  onChange={(event) => setNewCustomer((current) => ({ ...current, firstName: event.target.value }))}
                />
              </div>
              <div className="min-w-40 flex-1">
                <CustomInput
                  value={newCustomer.lastName}
                  label="نام خانوادگی"
                  placeholder="نام خانوادگی"
                  onChange={(event) => setNewCustomer((current) => ({ ...current, lastName: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-40 flex-1">
                <CustomInput
                  value={newCustomer.phone}
                  label="شماره موبایل"
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                  inputMode="tel"
                  maxLength={11}
                  onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div className="min-w-40 flex-1">
                <CustomInput
                  value={newCustomer.email}
                  type="email"
                  label="ایمیل"
                  placeholder="name@example.com"
                  onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
            </div>
            <CustomInput
              value={newCustomer.address}
              label="نشانی"
              placeholder="نشانی کامل برای ارسال سفارش"
              onChange={(event) => setNewCustomer((current) => ({ ...current, address: event.target.value }))}
            />
          </div>
        ) : customer ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-card p-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-bold text-primary-text">{customerLabel(customer)}</span>
              <span className="truncate text-xs text-secondary-text">
                {customer.profiles?.[0]?.phone || customer.username || customer.email || "بدون شماره"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary-text">کیف پول: {formatAmount(customer.walletBalance)}</span>
              <CustomButton size="sm" variant="neutral" icon={<IoCloseOutline />} onClick={() => { setCustomer(null); setUseWallet(false); }}>
                <span>حذف مشتری</span>
              </CustomButton>
            </div>
          </div>
        ) : (
          <>
            <CustomInput
              type="search"
              name="in-person-customer-search"
              autoComplete="off"
              spellCheck={false}
              value={customerQuery}
              label="جست‌وجوی مشتری"
              aria-label="جست‌وجوی مشتری با نام، موبایل یا ایمیل"
              placeholder="نام، موبایل یا ایمیل…"
              icon={<IoSearchOutline aria-hidden="true" />}
              onChange={(event) => setCustomerQuery(event.target.value)}
            />
            {!customersLoading && filteredCustomers.length === 0 ? (
              <CustomEmptyState description="مشتری مطابق جست‌وجو پیدا نشد." size="sm" />
            ) : null}
            <DynamicLoadingCollection
              items={filteredCustomers}
              isLoading={customersLoading && customers.length === 0}
              totalCount={customersLoading && customerQuery.trim()
                ? undefined
                : customersLoading
                  ? usersCount
                : customerQuery.trim() ? filteredCustomers.length : usersCount}
              className="flex max-h-56 w-full flex-col gap-1.5 overflow-y-auto"
              getKey={(entry) => entry.id}
              renderItem={(entry) => (
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-card p-2 text-start transition hover:border-primary"
                  onClick={() => { setCustomer(entry); setCustomerQuery(""); }}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-bold text-primary-text">{customerLabel(entry)}</span>
                    <span className="truncate text-xs text-secondary-text">
                      {entry.profiles?.[0]?.phone || entry.username || entry.email || "بدون شماره"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-secondary-text">کیف پول: {formatAmount(entry.walletBalance)}</span>
                </button>
              )}
              renderSkeleton={() => (
                <Loading loading="skeleton-structure" isLoading>
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-card p-2 text-start"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-bold text-primary-text">{customerLabel(loadingCustomer)}</span>
                      <span className="truncate text-xs text-secondary-text">{loadingCustomer.profiles[0].phone}</span>
                    </span>
                    <span className="shrink-0 text-xs text-secondary-text">کیف پول: {formatAmount(loadingCustomer.walletBalance)}</span>
                  </button>
                </Loading>
              )}
            />
          </>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <CustomButton
            size="sm"
            variant={customerMode === "existing" ? "primary" : "neutral"}
            onClick={() => { setCustomerMode("existing"); setNewCustomer({ firstName: "", lastName: "", phone: "", email: "", address: "" }); }}
          >
            <span>مشتری موجود</span>
          </CustomButton>
          <CustomButton
            size="sm"
            variant={customerMode === "new" ? "primary" : "neutral"}
            onClick={() => { setCustomerMode("new"); setCustomer(null); setUseWallet(false); setDiscountCode(""); }}
          >
            <span>کاربر جدید</span>
          </CustomButton>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <AppHeading level={3} className="text-sm font-bold text-primary-text">محصولات</AppHeading>
        <CustomInput
          type="search"
          name="in-person-product-search"
          autoComplete="off"
          spellCheck={false}
          value={productQuery}
          label="جست‌وجوی محصول"
          aria-label="جست‌وجوی محصول با نام یا شناسه"
          placeholder="نام محصول…"
          icon={<IoSearchOutline aria-hidden="true" />}
          onChange={(event) => setProductQuery(event.target.value)}
        />
        {!productsLoading && filteredProducts.length === 0 ? (
          <CustomEmptyState description="محصولی مطابق جست‌وجو پیدا نشد." size="sm" />
        ) : null}
        <DynamicLoadingCollection
          items={filteredProducts}
          isLoading={productsLoading && products.length === 0}
          totalCount={productsLoading && productQuery.trim()
            ? undefined
            : productsLoading
              ? productsCount
            : productQuery.trim() ? filteredProducts.length : productsCount}
          className="flex max-h-64 w-full flex-col gap-1.5 overflow-y-auto"
          getKey={(product) => product.id}
          renderItem={(product) => (
            <div className="flex w-full items-center gap-2 rounded-md border border-primary-border bg-primary-card p-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                {product.imageUrl ? (
                  <AppImage src={product.imageUrl} alt={product.title} width={80} height={80} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-secondary-text">بدون تصویر</span>
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-bold text-primary-text">{product.title}</span>
                <span className="truncate text-xs text-secondary-text">
                  {formatAmount(product.discountPrice || product.price)} · موجودی: {product.stockQuantity}
                </span>
              </span>
              <CustomButton
                size="sm"
                variant="neutral"
                icon={<IoAddOutline />}
                disabled={product.stockQuantity <= 0}
                onClick={() => addProduct(product)}
              >
                <span>افزودن</span>
              </CustomButton>
            </div>
          )}
          renderSkeleton={() => (
            <Loading loading="skeleton-structure" isLoading>
              <div className="flex w-full items-center gap-2 rounded-md border border-primary-border bg-primary-card p-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-media">
                  <span className="text-[10px] text-secondary-text">بدون تصویر</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-bold text-primary-text">{loadingProduct.title}</span>
                  <span className="truncate text-xs text-secondary-text">
                    {formatAmount(loadingProduct.price)} · موجودی: {loadingProduct.stockQuantity}
                  </span>
                </span>
                <CustomButton size="sm" variant="neutral" icon={<IoAddOutline />} disabled>
                  <span>افزودن</span>
                </CustomButton>
              </div>
            </Loading>
          )}
        />
      </section>

      <section className="flex flex-col gap-2">
        <AppHeading level={3} className="text-sm font-bold text-primary-text">سبد خرید</AppHeading>
        {lines.length === 0 ? (
          <CustomEmptyState description="هنوز محصولی به سبد خرید اضافه نشده است." size="sm" />
        ) : (
          <div className="flex flex-col gap-2">
            {lines.map((line) => {
              const colorEntries = normalizeStockEntries(line.product.colorStock);
              return (
                <div key={line.key} className="flex flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <AppHeading level={4} className="truncate text-sm font-bold text-primary-text">{line.product.title}</AppHeading>
                      <span className="truncate text-xs text-secondary-text">
                        {formatAmount(line.product.discountPrice || line.product.price)} · موجودی: {line.product.stockQuantity}
                      </span>
                    </div>
                    <CustomButton size="sm" variant="danger" icon={<IoTrashOutline />} onClick={() => removeLine(line.key)} aria-label={`حذف ${line.product.title}`}>
                      <span>حذف</span>
                    </CustomButton>
                  </div>

                  {colorEntries.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {colorEntries.map((entry) => (
                        <div key={entry.color} className="flex items-center gap-2">
                          <span
                            className="h-6 w-6 shrink-0 rounded-full border border-primary-border"
                            style={{ backgroundColor: getStockColorValue(entry.color) }}
                            aria-hidden="true"
                          />
                          <span className="w-16 shrink-0 truncate text-xs text-secondary-text">{colorLabel(entry.color)}</span>
                          <span className="w-14 shrink-0 truncate text-[11px] text-secondary-text">موجودی: {entry.count}</span>
                          <div className="w-20 shrink-0">
                            <CustomInput
                              type="number"
                              min={0}
                              max={entry.count}
                              step={1}
                              size="sm"
                              fullWidth={false}
                              value={line.colorCounts[entry.color] ?? 0}
                              aria-label={`تعداد رنگ ${colorLabel(entry.color)} برای ${line.product.title}`}
                              onChange={(event) => setLineColorCount(line.key, entry.color, Number(event.target.value))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CustomButton
                        size="sm"
                        variant="neutral"
                        disabled={line.quantity <= 0}
                        onClick={() => setLineQuantity(line.key, line.quantity - 1)}
                        aria-label={`کاهش تعداد ${line.product.title}`}
                      >
                        <span>−</span>
                      </CustomButton>
                      <span className="min-w-6 text-center text-sm font-bold text-primary-text">{line.quantity}</span>
                      <CustomButton
                        size="sm"
                        variant="neutral"
                        disabled={line.quantity >= line.product.stockQuantity}
                        onClick={() => setLineQuantity(line.key, line.quantity + 1)}
                        aria-label={`افزایش تعداد ${line.product.title}`}
                      >
                        <span>+</span>
                      </CustomButton>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-primary-border pt-2">
                    <span className="text-xs text-secondary-text">تعداد کل: {line.quantity}</span>
                    <span className="text-sm font-bold text-primary">{formatAmount(unitPrice(line.product) * line.quantity)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t border-primary-border pt-3">
        <AppHeading level={3} className="text-sm font-bold text-primary-text">پرداخت و تخفیف</AppHeading>
        <div className="flex flex-wrap items-end gap-2">
          <CustomInput
            value={discountCode}
            inputMode="text"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            label="کد تخفیف ۶ کاراکتری"
            fullWidth={false}
            className="w-40"
            onChange={(event) => {
              setDiscountCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
            }}
          />
          <CustomButton size="sm" variant="neutral" disabled={quoteLoading} onClick={() => void requestQuote()}>
            <span>استعلام</span>
          </CustomButton>
        </div>

        {customer ? (
          <CustomSwitch
            checked={useWallet}
            onChange={setUseWallet}
            disabled={customer.walletBalance <= 0}
            label={`پرداخت از کیف پول (موجودی: ${formatAmount(customer.walletBalance)})`}
          />
        ) : null}

        <Loading loading="skeleton-structure" isLoading={quoteDataLoading}>
          <div className="flex flex-col gap-1.5 rounded-md border border-primary-border bg-primary-card p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-secondary-text">مجموع کالاها</span>
              <span className="text-sm font-bold text-primary-text">{formatAmount(activeQuote?.subtotal ?? subtotal)}</span>
            </div>
            {discountCode.trim() ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-secondary-text">تخفیف ({discountCode.trim().toUpperCase()})</span>
                <span className="text-sm font-bold text-primary-text">{formatAmount(activeQuote?.discountAmount ?? 0)}</span>
              </div>
            ) : null}
            {useWallet ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-secondary-text">کیف پول</span>
                <span className="text-sm font-bold text-primary-text">{formatAmount(activeQuote?.walletAmount ?? 0)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 border-t border-primary-border pt-1.5">
              <span className="text-xs font-bold text-secondary-text">مبلغ نهایی</span>
              <span className="text-base font-bold text-primary">{formatAmount(activeQuote?.total ?? subtotal)}</span>
            </div>
            {customer ? (
              <span className="text-xs text-secondary-text">بازگشت وجه به کیف پول: {formatAmount(activeQuote?.cashbackEarned ?? 0)}</span>
            ) : null}
          </div>
        </Loading>

        {incompleteColorLine ? (
          <span className="text-xs font-semibold text-danger-text">
            برای «{incompleteColorLine.product.title}» تعداد هر رنگ را کامل مشخص کنید.
          </span>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <CustomButton
            variant="primary"
            icon={<IoCheckmarkCircleOutline />}
            isLoading={submitting}
            disabled={payloadLines.length === 0 || Boolean(incompleteColorLine)}
            onClick={() => void submitOrder()}
          >
            <span>ثبت سفارش حضوری</span>
          </CustomButton>
          <CustomButton variant="neutral" onClick={onClose}>
            <span>انصراف</span>
          </CustomButton>
        </div>
      </section>
    </div>
  );
}
