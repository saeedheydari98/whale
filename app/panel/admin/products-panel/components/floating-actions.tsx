"use client";

import { IoAdd } from "react-icons/io5";
import { FloatButton } from "@/app/design-system/components/ui/float-button";
import type { AdminCatalogSection } from "../types";

type FloatingActionsProps = {
  section: AdminCatalogSection;
  onCreateProduct: () => void;
  onCreateShowcase: () => void;
  onCreateCategoryGroup: () => void;
  onCreateBrandGroup: () => void;
  onCreateBanner: () => void;
};

export function FloatingActions({
  section,
  onCreateProduct,
  onCreateShowcase,
  onCreateCategoryGroup,
  onCreateBrandGroup,
  onCreateBanner,
}: FloatingActionsProps) {
  if (section === "products") return <FloatButton label="محصول جدید" icon={<IoAdd />} position="bottom-right" shadow="lg" onClick={onCreateProduct} />;
  if (section === "showcases") return <FloatButton label="ویترین جدید" icon={<IoAdd />} position="bottom-right" shadow="lg" onClick={onCreateShowcase} />;
  if (section === "categories") return <FloatButton label="بخش دسته‌بندی جدید" icon={<IoAdd />} position="bottom-right" shadow="lg" onClick={onCreateCategoryGroup} />;
  if (section === "brands") return <FloatButton label="بخش برند جدید" icon={<IoAdd />} position="bottom-right" shadow="lg" onClick={onCreateBrandGroup} />;
  if (section === "banners") return <FloatButton label="بنر جدید" icon={<IoAdd />} position="bottom-right" shadow="lg" onClick={onCreateBanner} />;

  return null;
}
