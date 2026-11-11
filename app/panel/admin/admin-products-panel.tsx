"use client";
import { useState } from "react";
import type { AdminStorefrontStructure } from "@/lib/admin-structure";

import { AdminProductsPanelContent } from "./products-panel/components/admin-products-panel-content";
import { useAdminProductsPanel } from "./products-panel/hooks/use-admin-products-panel";
import type { AdminCatalogSection } from "./products-panel/types";
import { AdminStorefrontPanel } from "./products-panel/components/admin-storefront-panel";

type AdminProductsPanelProps = {
  section?: AdminCatalogSection;
  storefrontCounts?: AdminStorefrontStructure;
};

export function AdminProductsPanel({ section = "storefront", storefrontCounts }: AdminProductsPanelProps) {
  return section === "storefront" ? <AdminStorefrontPanel counts={storefrontCounts} /> : <AdminCatalogPanel section={section} />;
}

function AdminCatalogPanel({ section }: { section: AdminCatalogSection }) {
  const [listOpen, setListOpen] = useState(false);
  const panel = useAdminProductsPanel(section, listOpen);

  return <AdminProductsPanelContent section={section} panel={panel} listOpen={listOpen} onListOpenChange={setListOpen} />;
}

export type { AdminCatalogSection };
