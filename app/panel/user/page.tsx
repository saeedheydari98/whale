"use client";

import { useTheme } from "@/app/design-system/theme/provider";
import { UserThemePanel } from "./user-theme-panel";

export default function UserPanelPage() {
  const { theme } = useTheme();

  return (
    <main
      className="min-h-screen p-6"
      style={{
        backgroundColor: theme.tokens.colors.background.base,
        color: theme.tokens.colors.text.primary,
      }}
    >
      <h1 className="mb-4 text-2xl text-user-user-user font-bold">User Theme Control</h1>
      <UserThemePanel />
    </main>
  );
}
