"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AdminStorefrontStructure } from "@/lib/admin-structure";
import { useAdminPagedCollection } from "@/hooks/use-admin-paged-collection";
import { useTransientAppMessage } from "@/app/design-system/components/feedback/notification-provider";
import { AppHeading } from "@/app/design-system/components/ui/text";
import { moveStorefrontEntry } from "@/lib/storefront-order";
import { createBanner, createShowcase } from "../factories";
import type { StorefrontDisplayEntry, StorefrontLayoutTab } from "../types";
import { StorefrontSection } from "./storefront-section";

type LayoutItem = { type: StorefrontDisplayEntry["type"]; id: string; title: string; sortOrder: number };
type Layout = Record<StorefrontLayoutTab, LayoutItem[]>;
const ENDPOINT = "/api/admin/catalog/storefront";
const itemKey = (item: LayoutItem) => `${item.type}:${item.id}`;

function displayEntry(item: LayoutItem): StorefrontDisplayEntry {
  if (item.type === "banner") return { type: "banner", item: { ...createBanner(), ...item }, sortOrder: item.sortOrder };
  if (item.type === "showcase") return { type: "showcase", item: { ...createShowcase(), ...item }, sortOrder: item.sortOrder };
  return { type: item.type, item, sortOrder: item.sortOrder };
}

export function AdminStorefrontPanel({ counts }: { counts?: AdminStorefrontStructure }) {
  const [listOpen, setListOpen] = useState(false);
  const [tab, setTab] = useState<StorefrontLayoutTab>("home");
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const page = useAdminPagedCollection<LayoutItem>({ endpoint: ENDPOINT, itemKey: "entries", params: new URLSearchParams({ tab }).toString(), enabled: listOpen, totalCount: counts?.[tab] });
  useTransientAppMessage(page.error || message);
  const move = async (source: string, position?: number, target?: string) => {
    if (busy.current || source === target) return;
    busy.current = true;
    setSaving(true);
    setMessage("");
    try {
      // Mutations need the complete current order, including records beyond loaded pages.
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) throw new Error(payload?.showMessage || "دریافت چیدمان انجام نشد.");
      const stored = payload.data.storefront;
      const layout: Layout = { home: stored.home ?? [], categories: stored.categories ?? [], products: stored.products ?? stored.showcases ?? [] };
      const items = layout[tab];
      const sourceIndex = items.findIndex((item) => itemKey(item) === source);
      const destination = target ? items.findIndex((item) => itemKey(item) === target) + 1 : position;
      if (sourceIndex < 0 || !destination) return;
      const next = moveStorefrontEntry(items, sourceIndex, destination).map((item, index) => ({ ...item, sortOrder: index + 1 }));
      const saved = await fetch(ENDPOINT, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storefront: { ...layout, [tab]: next } }) });
      const result = await saved.json();
      if (!saved.ok || result?.ok === false) throw new Error(result?.showMessage || "ذخیره چیدمان انجام نشد.");
      await queryClient.invalidateQueries({ queryKey: ["admin-list", ENDPOINT] });
      setMessage("چیدمان ذخیره شد.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ذخیره چیدمان انجام نشد."); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section className="flex flex-col gap-4">
    <AppHeading level={2} className="text-base font-bold text-primary-text">چیدمان فروشگاه</AppHeading>
    <StorefrontSection displaySections={page.items.map(displayEntry)} tab={tab} setTab={(next) => { setTab(next); setListOpen(false); }} draggingKey={draggingKey} setDraggingKey={setDraggingKey}
      listOpen={listOpen} onListOpenChange={setListOpen}
      isLoading={page.loading} isSaving={saving} {...page.collectionProps}
      onReorder={(source, target) => void move(source, undefined, target)}
      onUpdateBannerPlacement={(item, position) => move(`banner:${item.id}`, position)}
      onUpdateShowcasePlacement={(item, position) => move(`showcase:${item.id}`, position)}
      onUpdateCategoryGroupPlacement={(id, position) => move(`categoryGroup:${id}`, position)}
      onUpdateBrandGroupPlacement={(id, position) => move(`brandGroup:${id}`, position)} />
  </section>;
}
