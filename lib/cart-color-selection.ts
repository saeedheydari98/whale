import {
  normalizeColorCountMap,
  normalizeColorStock as normalizeCartColorStock,
  type ColorCountMap,
} from "@/lib/color-counts";

export const CART_COLOR_SELECTION_PREFIX = "colors:";

export type CartColorSelection = ColorCountMap;

export { normalizeCartColorStock };

export function normalizeColorSelection(value: unknown) {
  return normalizeColorCountMap(value, { positiveOnly: true });
}

export function parseSerializedColorSelection(value: unknown, quantity: number): CartColorSelection {
  const text = String(value ?? "").trim();
  if (!text) return {};

  if (text.startsWith(CART_COLOR_SELECTION_PREFIX)) {
    try {
      return normalizeColorSelection(JSON.parse(text.slice(CART_COLOR_SELECTION_PREFIX.length)));
    } catch {
      return {};
    }
  }

  return { [text]: Math.max(1, Math.round(Number(quantity) || 1)) };
}

export function readCartItemColorSelection(selectedColor: unknown, quantity: number, selectedColors?: unknown) {
  const fromObject = normalizeColorSelection(selectedColors);
  if (Object.keys(fromObject).length > 0) return fromObject;
  return parseSerializedColorSelection(selectedColor, quantity);
}

export function colorSelectionTotal(selection: CartColorSelection) {
  return Object.values(selection).reduce((sum, count) => sum + Math.max(0, Math.round(Number(count) || 0)), 0);
}

export function serializeColorSelection(selection: CartColorSelection) {
  const normalized = normalizeColorSelection(selection);
  const entries = Object.entries(normalized);
  if (entries.length === 0) return "";
  if (entries.length === 1) return entries[0][0];
  return `${CART_COLOR_SELECTION_PREFIX}${JSON.stringify(Object.fromEntries(entries))}`;
}
