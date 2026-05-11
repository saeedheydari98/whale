"use client";

import { AdminThemePanel } from "@/app/panel/admin/admin-theme-panel";
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
      <h1 className="mb-4 text-admin-admin-admin text-2xl font-bold">Admin Theme Control</h1>
      <AdminThemePanel />
    </main>
  );
}
