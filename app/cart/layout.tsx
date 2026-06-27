import { ProductsCatalogProvider } from "@/lib/products-catalog-context";

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <ProductsCatalogProvider>{children}</ProductsCatalogProvider>;
}
