"use client";

import { AdminThemePanel } from "@/app/design-system/components/admin-theme-panel";

export default function AdminPanelPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary p-6">
      <h1 className="mb-4 text-2xl font-bold">Admin Theme Control</h1>
      <AdminThemePanel />
    </main>
  );
}
