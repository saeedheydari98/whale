"use client";

import { useEffect, useState } from "react";
import Loading, { DynamicLoadingCollection } from "@/app/design-system/components/loading/loading";
import { CustomInput } from "@/app/design-system/components/ui/input";
import { AppHeading } from "@/app/design-system/components/ui/text";
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
  totalCount?: number;
};

const loadingStorefrontEntry: StorefrontDisplayEntry = {
  type: "showcase",
  item: {
    id: "loading-showcase",
    title: "ویترین",
    active: true,
    mode: "manual",
    autoSort: "",
    limit: 1,
    categoryId: "",
    manualProductIds: [],
    productCount: undefined,
    sortOrder: 0,
  },
  sortOrder: 0,
};

function StorefrontEntryRow({
  entry,
  tab,
  draggingKey,
  isLoading,
  setDraggingKey,
  onReorder,
  onUpdateBannerPlacement,
  onUpdateShowcasePlacement,
  onUpdateCategoryGroupPlacement,
  onUpdateBrandGroupPlacement,
}: {
  entry: StorefrontDisplayEntry;
  tab: StorefrontLayoutTab;
  draggingKey: string | null;
  isLoading: boolean;
  setDraggingKey: (key: string | null) => void;
  onReorder: (sourceKey: string, targetKey: string) => void;
  onUpdateBannerPlacement: (banner: BannerForm, sortOrder: number) => void | Promise<void>;
  onUpdateShowcasePlacement: (showcase: ShowcaseForm, sortOrder: number) => void | Promise<void>;
  onUpdateCategoryGroupPlacement: (groupId: string, sortOrder: number) => void | Promise<void>;
  onUpdateBrandGroupPlacement: (groupId: string, sortOrder: number) => void | Promise<void>;
}) {
  const key = storefrontKey(entry);
  const entrySortOrder = getEntrySortOrder(entry, tab);

  return (
    <div
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
        <AppHeading level={3} className="text-sm font-bold text-primary-text">{entry.item?.title || entryFallbackTitle(entry.type)}</AppHeading>
        <span className="text-xs text-secondary-text">{entryFallbackTitle(entry.type)}</span>
      </div>
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
    </div>
  );
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
  totalCount,
}: StorefrontSectionProps) {
  const visibleDisplaySections = displaySections;

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

      <DynamicLoadingCollection
        items={visibleDisplaySections}
        isLoading={isLoading && visibleDisplaySections.length === 0}
        totalCount={totalCount}
        className="flex flex-col gap-4"
        getKey={(entry) => storefrontKey(entry)}
        lazy
        renderItem={(entry) => (
          <StorefrontEntryRow
            entry={entry}
            tab={tab}
            draggingKey={draggingKey}
            isLoading={false}
            setDraggingKey={setDraggingKey}
            onReorder={onReorder}
            onUpdateBannerPlacement={onUpdateBannerPlacement}
            onUpdateShowcasePlacement={onUpdateShowcasePlacement}
            onUpdateCategoryGroupPlacement={onUpdateCategoryGroupPlacement}
            onUpdateBrandGroupPlacement={onUpdateBrandGroupPlacement}
          />
        )}
        renderSkeleton={() => (
          <Loading loading="skeleton-structure" isLoading>
            <StorefrontEntryRow
              entry={loadingStorefrontEntry}
              tab={tab}
              draggingKey={null}
              isLoading
              setDraggingKey={() => undefined}
              onReorder={() => undefined}
              onUpdateBannerPlacement={() => undefined}
              onUpdateShowcasePlacement={() => undefined}
              onUpdateCategoryGroupPlacement={() => undefined}
              onUpdateBrandGroupPlacement={() => undefined}
            />
          </Loading>
        )}
      />

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
