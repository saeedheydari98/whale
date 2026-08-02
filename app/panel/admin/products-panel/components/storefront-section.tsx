"use client";

import { IoSaveOutline } from "react-icons/io5";
import Loading from "@/app/design-system/components/loading/loading";
import { resolveExactLoadingItemCount } from "@/app/design-system/components/loading/loading-count";
import { CustomButton } from "@/app/design-system/components/ui/button";
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
  onUpdateBannerPlacement: (banner: BannerForm, sortOrder: number) => void;
  onUpdateShowcasePlacement: (showcase: ShowcaseForm, sortOrder: number) => void;
  onUpdateCategoryGroupPlacement: (groupId: string, sortOrder: number) => void;
  onUpdateBrandGroupPlacement: (groupId: string, sortOrder: number) => void;
  onSave: () => void;
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
  onSave,
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
              <CustomInput
                type="number"
                value={entrySortOrder}
                disabled={isLoading}
                placeholder="ترتیب"
                onChange={(event) => {
                  if (isLoading) return;
                  const sortOrder = Number(event.target.value);
                  if (entry.type === "banner") onUpdateBannerPlacement(entry.item, sortOrder);
                  else if (entry.type === "brandGroup") onUpdateBrandGroupPlacement(entry.item.id, sortOrder);
                  else if (entry.type === "categoryGroup") onUpdateCategoryGroupPlacement(entry.item.id, sortOrder);
                  else if (entry.type === "showcase") onUpdateShowcasePlacement(entry.item, sortOrder);
                }}
              />
            </Loading>
          </div>
        );
      })}

      <Loading loading="skeleton-item" isLoading={isLoading}>
        <CustomButton icon={<IoSaveOutline />} disabled={isLoading} onClick={() => void onSave()}>
          <span>ذخیره چیدمان</span>
        </CustomButton>
      </Loading>
    </div>
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
