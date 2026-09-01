"use client";

export async function getPageBootstrap<TPage>(
  loadPageStructure: () => Promise<TPage>
) {
  return { page: await loadPageStructure() };
}
