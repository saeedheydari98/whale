"use client";

import { AdminThemePanel } from "@/app/panel/admin/admin-theme-panel";
import { AdminProductsPanel } from "@/app/panel/admin/admin-products-panel";
import { useTheme } from "@/app/design-system/theme/provider";

export default function AdminPanelPage() {
  const { theme } = useTheme();

  return (
    <main
      className="min-h-screen p-6"
      style={{
        backgroundColor: theme.tokens.colors.background.base,
        color: theme.tokens.colors.text.primary,
      }}
    >
      <div className="mx-auto flex w-full flex-col gap-6">
        <section>
          <h1 className="mb-4 text-admin-admin-admin text-2xl font-bold">Admin Control</h1>
          <AdminThemePanel />
        </section>
        <div className="h-0.5  bg-ui-primary/30"></div>
        <AdminProductsPanel />
      </div>
    </main>
  );
}
