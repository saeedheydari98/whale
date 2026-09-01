import type { Metadata } from "next";
import { JsonLd } from "@/app/design-system/components/seo/json-ld";
import { slugifyCatalogValue } from "@/lib/api/catalog-layer-service";
import { catalogBreadcrumbs, showcaseSeo } from "@/lib/seo-catalog";
import { pageMetadata, parseSlugParam } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const slug = parseSlugParam((await params).slug);
  const showcase = slug ? await showcaseSeo(slug) : null;
  const title = showcase?.title || "ویترین";
  const path = `/products/showcase/${slugifyCatalogValue(showcase?.title || showcase?.id || slug)}`;
  return pageMetadata({
    title,
    description: showcase?.description || `محصولات ویترین ${title} را در فروشگاه وال مشاهده کنید و سفارش دهید.`,
    path,
    image: showcase?.imageUrl,
  });
}

export default async function ProductsShowcaseLayout({ children, params }: LayoutProps) {
  const slug = parseSlugParam((await params).slug);
  const showcase = slug ? await showcaseSeo(slug) : null;
  const path = `/products/showcase/${slugifyCatalogValue(showcase?.title || showcase?.id || slug)}`;
  return (
    <>
      {showcase ? <JsonLd data={catalogBreadcrumbs({ name: showcase.title || "ویترین", path })} /> : null}
      {children}
    </>
  );
}
