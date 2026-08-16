"use client";

import { fetchAppTheme } from "@/lib/app-theme-client";

export async function getPageBootstrap<TPage>(
  loadPageStructure: () => Promise<TPage>
) {
  await fetchAppTheme();
  return { page: await loadPageStructure() };
}
