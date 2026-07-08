"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  findProductById,
  findShowcaseById,
  getCatalogStructure,
  PRODUCTS_CATALOG_UPDATED_EVENT,
  type BannerRecord,
  type BrandRecord,
  type CatalogLinkGroupRecord,
  type CatalogTree,
  type CategoryRecord,
  type ProductRecord,
  type ShowcaseRecord,
} from "@/lib/products-client";

type ProductsCatalogContextValue = {
  products: ProductRecord[];
  showcases: ShowcaseRecord[];
  categories: CategoryRecord[];
  categoryGroups: CatalogLinkGroupRecord[];
  brands: BrandRecord[];
  brandGroups: CatalogLinkGroupRecord[];
  banners: BannerRecord[];
  tree: CatalogTree;
  loading: boolean;
  getProductById: (id: string | number) => ProductRecord | null;
  getShowcaseById: (id: string | number) => ShowcaseRecord | null;
  refresh: () => Promise<void>;
};

const ProductsCatalogContext = createContext<ProductsCatalogContextValue | null>(null);

const EMPTY_TREE: CatalogTree = { sections: [] };

export function ProductsCatalogProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const structureQuery = useQuery({
    queryKey: ["catalog", "structure"],
    queryFn: () => getCatalogStructure(),
  });
  const catalog = structureQuery.data;
  const products = catalog?.products ?? [];
  const showcases = catalog?.showcases ?? [];
  const categories = catalog?.categories ?? [];
  const categoryGroups = catalog?.categoryGroups ?? [];
  const brands = catalog?.brands ?? [];
  const brandGroups = catalog?.brandGroups ?? [];
  const banners = catalog?.banners ?? [];
  const tree = catalog?.tree ?? EMPTY_TREE;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    window.dispatchEvent(new Event(PRODUCTS_CATALOG_UPDATED_EVENT));
  }, [queryClient]);

  const getProductById = useCallback(
    (id: string | number) => findProductById(products, id),
    [products]
  );

  const getShowcaseById = useCallback(
    (id: string | number) => findShowcaseById(products, showcases, id),
    [products, showcases]
  );

  const value = useMemo(
    () => ({
      products,
      showcases,
      categories,
      categoryGroups,
      brands,
      brandGroups,
      banners,
      tree,
      loading: structureQuery.isLoading,
      getProductById,
      getShowcaseById,
      refresh,
    }),
    [products, showcases, categories, categoryGroups, brands, brandGroups, banners, tree, structureQuery.isLoading, getProductById, getShowcaseById, refresh]
  );

  return (
    <ProductsCatalogContext.Provider value={value}>{children}</ProductsCatalogContext.Provider>
  );
}

export function useProductsCatalog() {
  const context = useContext(ProductsCatalogContext);
  if (!context) {
    throw new Error("useProductsCatalog must be used within ProductsCatalogProvider");
  }
  return context;
}
