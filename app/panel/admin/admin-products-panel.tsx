"use client";

import { AdminProductsPanelContent } from "./products-panel/components/admin-products-panel-content";
import { useAdminProductsPanel } from "./products-panel/hooks/use-admin-products-panel";
import type { AdminCatalogSection } from "./products-panel/types";

type AdminProductsPanelProps = {
  section?: AdminCatalogSection;
};

export function AdminProductsPanel({ section = "storefront" }: AdminProductsPanelProps) {
  const panel = useAdminProductsPanel();

  return <AdminProductsPanelContent section={section} panel={panel} />;
}

export type { AdminCatalogSection };
