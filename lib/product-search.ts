function collectSearchValues(value: unknown, seen = new WeakSet<object>()): string[] {
  if (value === null || value === undefined) return [];

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (value instanceof Date) {
    return [value.toISOString()];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSearchValues(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return [];
    seen.add(value);

    return Object.entries(value).flatMap(([key, nestedValue]) => [
      key,
      ...collectSearchValues(nestedValue, seen),
    ]);
  }

  return [];
}

export function matchesSearchQuery(value: unknown, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return collectSearchValues(value)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}
