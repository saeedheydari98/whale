const localizedDigits: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export function toLatinDigits(value?: string | number | null) {
  return String(value ?? "").replace(/[۰-۹٠-٩]/g, (digit) => localizedDigits[digit] ?? digit);
}

export function readFormattedPriceNumber(value?: string | number | null) {
  const normalized = toLatinDigits(value).replace(/[^0-9.]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function numericTextValue(value?: string | number | null) {
  const normalized = toLatinDigits(value).replace(/[^0-9.]/g, "");
  return normalized || undefined;
}

export function readPriceNumberWithFallback(value?: string | number | null, fallback = 0) {
  const normalized = numericTextValue(value);
  if (!normalized) return fallback;

  const parsed = readFormattedPriceNumber(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

export type FormatAmountOptions = {
  prefix?: string;
  suffix?: string;
  fallback?: string;
};

/** Canonical formatter for every monetary value shown in the application. */
export function formatAmount(
  value?: string | number | null,
  options: FormatAmountOptions = {}
) {
  const rawValue = toLatinDigits(value).trim();
  const isNegative = rawValue.startsWith("-");
  const normalized = rawValue.replace(/[^0-9.]/g, "");
  if (!normalized) return options.fallback ?? "";

  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const integerDigits = integerPart.replace(/^0+(?=\d)/, "") || "0";
  const formattedInteger = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimalPart = decimalParts.join("");
  const formattedNumber = decimalParts.length > 0 ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  const signedNumber = isNegative && formattedNumber !== "0" ? `-${formattedNumber}` : formattedNumber;

  return `${options.prefix ?? ""}${signedNumber}${options.suffix ?? ""}`;
}

export type PriceLike = {
  price?: string | number | null;
  discountPrice?: string | number | null;
  originalPrice?: string | number | null;
  discountPercent?: string | number | null;
};

export function getFinalPriceValue(item: PriceLike) {
  return String(item.discountPrice ?? item.price ?? "");
}

export function getDiscountPercentValue(item: PriceLike) {
  const explicitPercent = Number(toLatinDigits(item.discountPercent));
  if (Number.isFinite(explicitPercent) && explicitPercent > 0) {
    return Math.round(explicitPercent);
  }

  const original = readFormattedPriceNumber(item.originalPrice);
  const final = readFormattedPriceNumber(getFinalPriceValue(item));
  if (original <= 0 || final <= 0 || final >= original) return 0;
  return Math.round(((original - final) / original) * 100);
}

export function calculateDiscountPercentValue(originalPrice?: string | number | null, discountPrice?: string | number | null) {
  const discountPercent = getDiscountPercentValue({
    originalPrice,
    discountPrice,
    price: discountPrice,
  });

  return discountPercent > 0 ? String(discountPercent) : "";
}
