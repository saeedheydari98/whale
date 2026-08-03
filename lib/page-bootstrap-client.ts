"use client";

import { fetchAppUser } from "@/lib/app-user-client";

export async function getPageBootstrap<TPage>(
  loadPageStructure: () => Promise<TPage>,
  options?: { forceUser?: boolean }
) {
  const [user, page] = await Promise.all([
    fetchAppUser({ force: options?.forceUser }),
    loadPageStructure(),
  ]);

  return { user, page };
}
