"use client";

import { IoSaveOutline } from "react-icons/io5";
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
};

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
}: StorefrontSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-primary-border">
        {STOREFRONT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-primary-soft ${
              tab === item.id ? "border-primary text-primary-text" : "border-transparent text-secondary-text"
            }`}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {displaySections.map((entry) => {
        const key = storefrontKey(entry);
        const entrySortOrder = getEntrySortOrder(entry, tab);

        return (
          <div
            key={key}
            draggable
            onDragStart={(event) => {
              setDraggingKey(key);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", key);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceKey = event.dataTransfer.getData("text/plain") || draggingKey;
              if (sourceKey) void onReorder(sourceKey, key);
              setDraggingKey(null);
            }}
            onDragEnd={() => setDraggingKey(null)}
            className={`flex cursor-grab flex-col gap-3 rounded-lg border bg-primary-card p-3 active:cursor-grabbing sm:flex-row sm:items-center sm:justify-between ${
              draggingKey === key ? "border-primary opacity-70" : "border-primary-border"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="text-sm font-bold text-primary-text">{entry.item?.title || entryFallbackTitle(entry.type)}</div>
              <span className="text-xs text-secondary-text">{entryFallbackTitle(entry.type)}</span>
            </div>
            <CustomInput
              type="number"
              value={entrySortOrder}
              placeholder="ترتیب"
              onChange={(event) => {
                const sortOrder = Number(event.target.value);
                if (entry.type === "banner") onUpdateBannerPlacement(entry.item, sortOrder);
                else if (entry.type === "brandGroup") onUpdateBrandGroupPlacement(entry.item.id, sortOrder);
                else if (entry.type === "categoryGroup") onUpdateCategoryGroupPlacement(entry.item.id, sortOrder);
                else if (entry.type === "showcase") onUpdateShowcasePlacement(entry.item, sortOrder);
              }}
            />
          </div>
        );
      })}

      <CustomButton icon={<IoSaveOutline />} onClick={() => void onSave()}>
        ذخیره چیدمان
      </CustomButton>
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
