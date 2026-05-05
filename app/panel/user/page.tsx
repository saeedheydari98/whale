"use client";

import { UserThemePanel } from "@/app/design-system/components/user-theme-panel";

export default function UserPanelPage() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary p-6">
      <h1 className="mb-4 text-2xl text-admin-admin-admin font-bold">User Theme Control</h1>
      <UserThemePanel />
    </main>
  );
}
