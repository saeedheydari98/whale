"use client";

import { ThemeProvider } from "@/app/design-system/theme/provider";
import { useAppGlobal } from "@/lib/app-global-context";
import type { ReactNode } from "react";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { data } = useAppGlobal();

  return (
    <ThemeProvider initialAdminTheme={data?.theme}>
      {children}
    </ThemeProvider>
  );
}
