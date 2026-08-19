"use client";

import { useEffect, useState } from "react";
import Loading from "@/app/design-system/components/loading/loading";
import { resolveExactLoadingItemCount } from "@/app/design-system/components/loading/loading-count";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { STOREFRONT_TABS } from "../constants";
import type { BannerForm, ShowcaseForm, StorefrontDisplayEntry, StorefrontLayoutTab } from "../types";
import { storefrontKey } from "../utils";

type StorefrontSectionProps = {
  displaySections: StorefrontDisplayEntry[];
  tab: StorefrontLayoutTab;
  draggingKey: string | null;
  setTab: (tab: StorefrontLayoutTab) => void;
  setDraggingKey: (key: string | null) => void;
  onReorder: (sourceKey: string, targetKey: string) => void;
  onUpdateBannerPlacement: (banner: BannerForm, sortOrder: number) => void | Promise<void>;
  onUpdateShowcasePlacement: (showcase: ShowcaseForm, sortOrder: number) => void | Promise<void>;
  onUpdateCategoryGroupPlacement: (groupId: string, sortOrder: number) => void | Promise<void>;
  onUpdateBrandGroupPlacement: (groupId: string, sortOrder: number) => void | Promise<void>;
  isLoading?: boolean;
  loadingCountHint?: number;
};

function createLoadingStorefrontEntries(count: number): StorefrontDisplayEntry[] {
  const entries: StorefrontDisplayEntry[] = [
    {
      type: "banner",
      sortOrder: 1,
      item: {
        id: "loading-storefront-banner",
        title: "بنر",
        showcaseId: "",
        imageUrls: [""],
        active: true,
        showOnHome: true,
        showOnShowcase: false,
        showOnCategories: false,
        showOnProducts: false,
        intervalSeconds: 5,
        heightPercent: 28,
        homeSortOrder: 1,
        showcaseSortOrder: 1,
        categorySortOrder: 1,
        productSortOrder: 1,
        sortOrder: 1,
      },
    },
    {
      type: "showcase",
      sortOrder: 2,
      item: {
        id: "loading-storefront-showcase",
        title: "ویترین",
        active: true,
        mode: "manual",
        autoSort: "newest",
        limit: 8,
        categoryId: "",
        manualProductIds: [],
        sortOrder: 2,
      },
    },
    {
      type: "categoryGroup",
      sortOrder: 3,
      item: {
        id: "loading-storefront-category-group",
        title: "دسته‌بندی",
        sortOrder: 3,
      },
    },
    {
      type: "brandGroup",
      sortOrder: 4,
      item: {
        id: "loading-storefront-brand-group",
        title: "برند",
        sortOrder: 4,
      },
    },
  ];

  return Array.from({ length: count }, (_, index) => {
    const entry = entries[index % entries.length];
    const sortOrder = index + 1;

    return {
      ...entry,
      sortOrder,
      item: {
        ...entry.item,
        id: `${entry.item.id}-${sortOrder}`,
        sortOrder,
      },
    } as StorefrontDisplayEntry;
  });
}

export function StorefrontSection({
  displaySections,
  tab,
  draggingKey,
  setTab,
  setDraggingKey,
  onReorder,
  onUpdateBannerPlacement,
  onUpdateShowcasePlacement,
  onUpdateCategoryGroupPlacement,
  onUpdateBrandGroupPlacement,
  isLoading = false,
  loadingCountHint,
}: StorefrontSectionProps) {
  const hintedRowCount = Number(loadingCountHint);
  const hasLoadingCountHint = Number.isFinite(hintedRowCount);
  const useHintedPlaceholders = isLoading && hasLoadingCountHint && (hintedRowCount === 0 || displaySections.length < hintedRowCount);
  const loadingRowCount = resolveExactLoadingItemCount(useHintedPlaceholders ? hintedRowCount : displaySections.length || loadingCountHint);
  const visibleDisplaySections = useHintedPlaceholders || (isLoading && displaySections.length === 0)
    ? createLoadingStorefrontEntries(loadingRowCount)
    : isLoading
      ? displaySections.slice(0, loadingRowCount)
      : displaySections;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-primary-border">
        {STOREFRONT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={isLoading}
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-primary-soft ${
              tab === item.id ? "border-primary text-primary-text" : "border-transparent text-secondary-text"
            }`}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {visibleDisplaySections.map((entry) => {
        const key = storefrontKey(entry);
        const entrySortOrder = getEntrySortOrder(entry, tab);

        return (
          <div
            key={key}
            draggable={!isLoading}
            onDragStart={(event) => {
              if (isLoading) return;
              setDraggingKey(key);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", key);
            }}
            onDragOver={(event) => {
              if (isLoading) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              if (isLoading) return;
              event.preventDefault();
              const sourceKey = event.dataTransfer.getData("text/plain") || draggingKey;
              if (sourceKey) void onReorder(sourceKey, key);
              setDraggingKey(null);
            }}
            onDragEnd={() => setDraggingKey(null)}
            className={`flex flex-col gap-3 rounded-lg border bg-primary-card p-3 sm:flex-row sm:items-center sm:justify-between ${
              isLoading
                ? "cursor-default border-border-default"
                : draggingKey === key
                  ? "cursor-grab border-primary opacity-70 active:cursor-grabbing"
                  : "cursor-grab border-primary-border active:cursor-grabbing"
            }`}
          >
            <div className="flex flex-col gap-1">
              <Loading loading="skeleton-item" isLoading={isLoading}>
                <div className="text-sm font-bold text-primary-text">{entry.item?.title || entryFallbackTitle(entry.type)}</div>
              </Loading>
              <Loading loading="skeleton-item" isLoading={isLoading}>
                <span className="text-xs text-secondary-text">{entryFallbackTitle(entry.type)}</span>
              </Loading>
            </div>
            <Loading loading="skeleton-item" isLoading={isLoading} className="w-full sm:w-auto">
              <StorefrontOrderInput
                value={entrySortOrder}
                disabled={isLoading}
                onCommit={(sortOrder) => {
                  if (entry.type === "banner") return onUpdateBannerPlacement(entry.item, sortOrder);
                  if (entry.type === "brandGroup") return onUpdateBrandGroupPlacement(entry.item.id, sortOrder);
                  if (entry.type === "categoryGroup") return onUpdateCategoryGroupPlacement(entry.item.id, sortOrder);
                  if (entry.type === "showcase") return onUpdateShowcasePlacement(entry.item, sortOrder);
                }}
              />
            </Loading>
          </div>
        );
      })}

      {!isLoading ? <span className="text-xs font-semibold text-secondary-text">تغییرات چیدمان به‌صورت خودکار ذخیره می‌شوند.</span> : null}
    </div>
  );
}

type StorefrontOrderInputProps = {
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void | Promise<void>;
};

function StorefrontOrderInput({ value, disabled, onCommit }: StorefrontOrderInputProps) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  const commit = () => {
    const parsedValue = Number(draftValue);
    if (!Number.isFinite(parsedValue)) {
      setDraftValue(String(value));
      return;
    }

    const nextValue = Math.max(1, Math.round(parsedValue));
    setDraftValue(String(nextValue));
    if (nextValue !== value) void onCommit(nextValue);
  };

  return (
    <CustomInput
      type="number"
      min={1}
      step={1}
      value={draftValue}
      disabled={disabled}
      placeholder="ترتیب"
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function getEntrySortOrder(entry: StorefrontDisplayEntry, tab: StorefrontLayoutTab) {
  if (entry.type === "banner") {
    if (tab === "categories") return entry.item.categorySortOrder;
    if (tab === "products") return entry.item.productSortOrder;
    return entry.item.homeSortOrder;
  }

  return entry.item.sortOrder;
}

function entryFallbackTitle(type: StorefrontDisplayEntry["type"]) {
  if (type === "banner") return "بنر";
  if (type === "categoryGroup") return "دسته‌بندی";
  if (type === "brandGroup") return "برند";
  return "ویترین";
}
