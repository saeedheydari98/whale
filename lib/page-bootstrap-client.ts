"use client";

import { fetchAppGlobal } from "@/lib/app-global-client";

export async function getPageBootstrap<TPage>(
  loadPageStructure: () => Promise<TPage>,
  options?: { forceGlobal?: boolean }
) {
  const [global, page] = await Promise.all([
    fetchAppGlobal({ force: options?.forceGlobal }),
    loadPageStructure(),
  ]);

  return { global, page };
}
