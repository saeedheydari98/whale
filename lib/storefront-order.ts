type StorefrontEntry = { type: string; id?: string | number; item?: { id?: string | number }; sortOrder: number };

export function storefrontEntryKey(entry: Pick<StorefrontEntry, "type" | "id" | "item">) {
  return `${entry.item?.id ?? entry.id ?? ""}:${entry.type === "brands" ? "brandGroup" : entry.type === "categories" ? "categoryGroup" : entry.type}`;
}

/** Stable across separate API arrays, cache refreshes, and response arrival order. */
export function compareStorefrontEntries(a: StorefrontEntry, b: StorefrontEntry) {
  const difference = a.sortOrder - b.sortOrder;
  if (difference) return difference;
  const first = storefrontEntryKey(a);
  const second = storefrontEntryKey(b);
  return first < second ? -1 : first > second ? 1 : 0;
}

export function moveStorefrontEntry<T>(items: readonly T[], source: number, position: number) {
  const next = [...items];
  if (source < 0 || source >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, Math.round(position) - 1));
  const [moved] = next.splice(source, 1);
  next.splice(target, 0, moved);
  return next;
}
