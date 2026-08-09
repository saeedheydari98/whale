export type ColorCountMap = Record<string, number>;

export function normalizeColorCountMap(value: unknown, options?: { positiveOnly?: boolean }): ColorCountMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([color, count]) => [
        color.trim(),
        Math.max(0, Math.round(Number(count))),
      ] as const)
      .filter(([color, count]) => color && Number.isFinite(count) && (!options?.positiveOnly || count > 0))
  );
}

export function normalizeColorStock(value: unknown) {
  return normalizeColorCountMap(value);
}
