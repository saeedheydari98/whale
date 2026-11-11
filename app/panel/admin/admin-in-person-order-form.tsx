"use client";

import { collectionCardClasses } from "@/app/design-system/variants/collection-card.variant";

import { ColorQuantityPicker } from "@/app/design-system/components/ui/color-quantity-picker";
import { updateColorSelection } from "@/lib/cart-color-selection";

import { CustomActionButton } from "@/app/design-system/components/ui/action";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoAddOutline, IoCheckmarkCircleOutline, IoCloseOutline, IoSearchOutline, IoTrashOutline } from "react-icons/io5";
import { CustomButton } from "@/app/design-system/components/ui/button";
import { CustomEmptyState } from "@/app/design-system/components/ui/empty-state";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { CustomSwitch } from "@/app/design-system/components/ui/switch";
import { AppImage } from "@/app/design-system/components/ui/app-image";
import { normalizeStockEntries } from "@/app/design-system/components/ui/color-stock-dots";
import { AppHeading } from "@/app/design-system/components/ui/text";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { colorSelectionTotal, serializeColorSelection } from "@/lib/cart-color-selection";
import { formatAmount, readFormattedPriceNumber } from "@/lib/price-format";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getAdminPanelStructure } from "@/lib/admin-structure";
import { CustomModalSection } from "@/app/design-system/components/ui/modal-section";
import { CustomTabs } from "@/app/design-system/components/ui/tabs";

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

const IN_PERSON_OPTIONS_URL = "/api/admin/orders/in-person/options";
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

type InPersonOptionsPage<T> = { items: T[]; total: number; nextOffset: number | null };

function useInPersonOptions<T>(kind: "products" | "customers", search: string, count: number | undefined, enabled = true) {
  const [capacity, setCapacity] = useState(0);
  const [query, setQuery] = useState(search.trim());
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const pendingSearch = query !== search.trim();
  const empty = !query && count === 0;
  const result = useInfiniteQuery<InPersonOptionsPage<T>>({
    queryKey: ["admin", "in-person-options", kind, query, capacity],
    enabled: enabled && count !== undefined && capacity > 0 && !empty && !pendingSearch,
    initialPageParam: 0,
    // Keep the matching count while a resize changes the measured page size.
    // Otherwise a small search result can oscillate between its count and the viewport capacity.
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[3] === query ? previous : undefined,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ kind, q: query, limit: String(capacity), offset: String(pageParam) });
      const response = await fetch(`${IN_PERSON_OPTIONS_URL}?${params}`, { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.showMessage || "دریافت اطلاعات سفارش حضوری انجام نشد.");
      }
      return payload.data as InPersonOptionsPage<T>;
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const items = useMemo(() => !enabled || empty || pendingSearch ? [] : result.data?.pages.flatMap((page) => page.items) ?? [],
    [enabled, empty, pendingSearch, result.data]);
  return {
    items,
    capacity,
    total: !enabled ? 0 : pendingSearch ? undefined : result.data?.pages[0]?.total ?? (query ? undefined : count),
    isLoading: enabled && !empty && (pendingSearch || result.isPending || result.isPlaceholderData),
    isLoadingMore: result.isFetchingNextPage,
    hasMore: enabled && !pendingSearch && result.hasNextPage && !result.isError,
    error: result.error?.message ?? "",
    onCapacityChange: !enabled || count === undefined ? undefined : setCapacity,
    onLoadMore: () => {
      if (enabled && !pendingSearch && result.hasNextPage && !result.isFetching) void result.fetchNextPage();
    },
  };
}

export function AdminInPersonOrderForm({ productsCount, usersCount, onCreated, onClose }: AdminInPersonOrderFormProps) {
  const [productQuery, setProductQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customer, setCustomer] = useState<AdminInPersonCustomer | null>(null);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("new");
  const [customerOpen, setCustomerOpen] = useState(true);
  const [productsOpen, setProductsOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
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

  const productSearchEnabled = productsOpen && (showAllProducts || productQuery.trim().length > 0);
  const customerSearchEnabled = customerOpen && customerMode === "existing" && !customer && (showAllCustomers || customerQuery.trim().length > 0);
  const optionsStructure = useQuery({
    queryKey: ["admin", "in-person-structure"],
    queryFn: () => getAdminPanelStructure({ force: true }),
    enabled: productSearchEnabled || customerSearchEnabled,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  useTransientAppMessage(optionsStructure.isError ? "دریافت ساختار سفارش حضوری انجام نشد." : "");
  const optionProductsCount = optionsStructure.isPending ? undefined : optionsStructure.data?.products ?? productsCount;
  const optionUsersCount = optionsStructure.isPending ? undefined : optionsStructure.data?.users ?? usersCount;
  const productOptions = useInPersonOptions<AdminInPersonProduct>("products", productQuery, optionProductsCount, productSearchEnabled);
  const customerOptions = useInPersonOptions<AdminInPersonCustomer>("customers", customerQuery, optionUsersCount, customerSearchEnabled);
  useTransientAppMessage(productOptions.error);
  useTransientAppMessage(customerOptions.error);

  const payloadLines = useMemo(() => buildPayloadLines(lines), [lines]);
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + unitPrice(line.product) * line.quantity, 0),
    [lines]
  );

  const addProduct = useCallback((product: AdminInPersonProduct) => {
    if (product.stockQuantity <= 0) return;
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (!existing) return [...current, createLine(product)];
      if (normalizeStockEntries(product.colorStock).length > 0) return current;
      return current.map((line) => (line.product.id === product.id
        ? { ...line, quantity: Math.min(line.quantity + 1, line.product.stockQuantity) }
        : line));
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
      const colorCounts = updateColorSelection(line.colorCounts, color, count, line.product.colorStock, line.product.stockQuantity);
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
    if (!paymentOpen) return;
    const timer = window.setTimeout(() => void requestQuote(), 400);
    return () => window.clearTimeout(timer);
  }, [paymentOpen, requestQuote]);

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
      <CustomModalSection
        title="مشتری"
        status={customerMode === "new" ? newCustomerReady ? "complete" : "incomplete" : customer ? "complete" : "optional"}
        meta={customerMode === "new" ? "مشتری جدید" : customer ? customerLabel(customer) : "مشتری انتخاب نشده؛ سفارش بدون حساب"}
        open={customerOpen}
        onOpenChange={setCustomerOpen}
      >
        <CustomTabs<"existing" | "new">
          variant="tertiary"
          ariaLabel="نوع مشتری"
          items={[{ id: "existing", label: "مشتری موجود" }, { id: "new", label: "مشتری جدید" }]}
          value={customerMode}
          onChange={(mode) => {
            setCustomerMode(mode);
            if (mode === "existing") setNewCustomer({ firstName: "", lastName: "", phone: "", email: "", address: "" });
            else { setCustomer(null); setUseWallet(false); setDiscountCode(""); }
          }}
        />
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
                  placeholder="شماره موبایل"
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
                  placeholder="ایمیل"
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
            <CustomSwitch checked={showAllCustomers} onChange={setShowAllCustomers} label="نمایش همه مشتری‌ها" />
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
            {!customerSearchEnabled ? <span data-text-wrap className="text-xs text-secondary-text">برای یافتن مشتری جست‌وجو کنید یا نمایش همه مشتری‌ها را فعال کنید.</span> : null}
            {customerSearchEnabled && !customerOptions.isLoading && customerOptions.items.length === 0 ? (
              <CustomEmptyState description="مشتری مطابق جست‌وجو پیدا نشد." size="sm" />
            ) : null}
            <div className={`flex max-h-56 w-full flex-col overflow-y-auto ${customerOptions.total !== 0 && (customerOptions.total ?? Infinity) > customerOptions.capacity ? "h-56" : ""}`}>
              <DynamicLoadingCollection
                items={customerOptions.items}
                isLoading={customerOptions.isLoading}
                totalCount={customerOptions.total}
                onCapacityChange={customerOptions.onCapacityChange}
                hasMore={customerOptions.hasMore}
                isLoadingMore={customerOptions.isLoadingMore}
                onLoadMore={customerOptions.onLoadMore}
                lazy
                className="flex w-full flex-col gap-1.5"
                getKey={(entry) => entry.id}
                renderItem={(entry) => (
                  <CustomActionButton
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
                  </CustomActionButton>
                )}
                renderSkeleton={() => (
                  <Loading loading="skeleton-structure" isLoading>
                    <CustomActionButton
                      type="button"
                      disabled
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-card p-2 text-start"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-bold text-primary-text">{customerLabel(loadingCustomer)}</span>
                        <span className="truncate text-xs text-secondary-text">{loadingCustomer.profiles[0].phone}</span>
                      </span>
                      <span className="shrink-0 text-xs text-secondary-text">کیف پول: {formatAmount(loadingCustomer.walletBalance)}</span>
                    </CustomActionButton>
                  </Loading>
                )}
              />
            </div>
          </>
        )}

      </CustomModalSection>

      <CustomModalSection
        title="محصولات"
        status={lines.length > 0 ? "complete" : "incomplete"}
        meta={lines.length > 0 ? `${lines.length.toLocaleString("fa-IR")} محصول انتخاب شده` : "محصولی انتخاب نشده"}
        open={productsOpen}
        onOpenChange={setProductsOpen}
      >
        <CustomSwitch checked={showAllProducts} onChange={setShowAllProducts} label="نمایش همه محصولات" />
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
        {!productSearchEnabled ? <span data-text-wrap className="text-xs text-secondary-text">برای یافتن محصول جست‌وجو کنید یا نمایش همه محصولات را فعال کنید.</span> : null}
        {productSearchEnabled && !productOptions.isLoading && productOptions.items.length === 0 ? (
          <CustomEmptyState description="محصولی مطابق جست‌وجو پیدا نشد." size="sm" />
        ) : null}
        <div className={`flex max-h-64 w-full flex-col overflow-y-auto ${productOptions.total !== 0 && (productOptions.total ?? Infinity) > productOptions.capacity ? "h-64" : ""}`}>
          <DynamicLoadingCollection
            items={productOptions.items}
            isLoading={productOptions.isLoading}
            totalCount={productOptions.total}
            onCapacityChange={productOptions.onCapacityChange}
            hasMore={productOptions.hasMore}
            isLoadingMore={productOptions.isLoadingMore}
            onLoadMore={productOptions.onLoadMore}
            lazy
            className="flex w-full flex-col gap-1.5"
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
        </div>
      </CustomModalSection>

      <CustomModalSection
        title="سبد خرید"
        status={payloadLines.length > 0 && !incompleteColorLine ? "complete" : "incomplete"}
        meta={incompleteColorLine ? "تعداد رنگ‌ها را تکمیل کنید" : payloadLines.length > 0 ? `${lines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString("fa-IR")} عدد کالا` : "سبد خرید خالی است"}
        defaultOpen={false}
      >
        {lines.length === 0 ? (
          <CustomEmptyState description="هنوز محصولی به سبد خرید اضافه نشده است." size="sm" />
        ) : (
          <div className="flex flex-col gap-2">
            {lines.map((line) => {
              const colorEntries = normalizeStockEntries(line.product.colorStock);
              return (
                <div key={line.key} data-card-family="inPersonLine" className={collectionCardClasses("inPersonLine", "flex flex-col gap-2 rounded-md border border-primary-border bg-primary-card p-2")}>
                  <div className="flex shrink-0 items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <AppHeading level={3} className="truncate text-sm font-bold text-primary-text">{line.product.title}</AppHeading>
                      <span className="truncate text-xs text-secondary-text">
                        {formatAmount(line.product.discountPrice || line.product.price)} · موجودی: {line.product.stockQuantity}
                      </span>
                    </div>
                    <CustomButton size="sm" variant="danger" icon={<IoTrashOutline />} onClick={() => removeLine(line.key)} aria-label={`حذف ${line.product.title}`}>
                      <span>حذف</span>
                    </CustomButton>
                  </div>

                  {colorEntries.length > 0 ? (
                    <div className="flex flex-col">
                      <ColorQuantityPicker layout="rows" colorStock={line.product.colorStock} selection={line.colorCounts} stockQuantity={line.product.stockQuantity}
                        onChange={(color, count) => setLineColorCount(line.key, color, count)} />
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

                  <div className="flex shrink-0 items-center justify-between gap-2 border-t border-primary-border pt-2">
                    <span className="text-xs text-secondary-text">تعداد کل: {line.quantity}</span>
                    <span className="text-sm font-bold text-primary">{formatAmount(unitPrice(line.product) * line.quantity)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CustomModalSection>

      <CustomModalSection
        title="پرداخت و تخفیف"
        status={activeQuote && !quoteDataLoading && !incompleteColorLine ? "complete" : "incomplete"}
        meta={discountCode.trim() ? `کد تخفیف: ${discountCode.trim()}` : "بدون کد تخفیف"}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      >
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

      </CustomModalSection>

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
    </div>
  );
}
