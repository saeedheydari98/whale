"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  findProductById,
  findShowcaseById,
  getProducts,
  type BannerRecord,
  type CatalogTree,
  type CategoryRecord,
  type ProductRecord,
  type ShowcaseRecord,
} from "@/lib/products-client";

type ProductsCatalogContextValue = {
  products: ProductRecord[];
  showcases: ShowcaseRecord[];
  categories: CategoryRecord[];
  banners: BannerRecord[];
  tree: CatalogTree;
  loading: boolean;
  getProductById: (id: string | number) => ProductRecord | null;
  getShowcaseById: (id: string | number) => ShowcaseRecord | null;
  refresh: () => Promise<void>;
};

const ProductsCatalogContext = createContext<ProductsCatalogContextValue | null>(null);
const MIN_LOADING_MS = 350;

function waitForMinimumLoading(startedAt: number) {
  const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
  return remaining > 0
    ? new Promise((resolve) => window.setTimeout(resolve, remaining))
    : Promise.resolve();
}

export function ProductsCatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [tree, setTree] = useState<CatalogTree>({ sections: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    const startedAt = Date.now();
    if (!force) setLoading(true);
    try {
      const data = await getProducts({ force });
      setProducts(data.products);
      setShowcases(data.showcases);
      setCategories(data.categories);
      setBanners(data.banners);
      setTree(data.tree);
      await waitForMinimumLoading(startedAt);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const startedAt = Date.now();
      const data = await getProducts();
      if (cancelled) return;
      setProducts(data.products);
      setShowcases(data.showcases);
      setCategories(data.categories);
      setBanners(data.banners);
      setTree(data.tree);
      await waitForMinimumLoading(startedAt);
      if (cancelled) return;
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
      banners,
      tree,
      loading,
      getProductById,
      getShowcaseById,
      refresh: () => load(true),
    }),
    [products, showcases, categories, banners, tree, loading, getProductById, getShowcaseById, load]
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
