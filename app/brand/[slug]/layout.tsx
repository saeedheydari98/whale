import type { Metadata } from "next";
import { JsonLd } from "@/app/design-system/components/seo/json-ld";
import { brandSeo, catalogBreadcrumbs } from "@/lib/seo-catalog";
import { pageMetadata, parseSlugParam } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const slug = parseSlugParam((await params).slug);
  const brand = slug ? await brandSeo(slug) : null;
  const title = brand?.title || "برند";
  return pageMetadata({
    title,
    description: `محصولات برند ${title} را در فروشگاه وال ببینید و با قیمت شفاف سفارش دهید.`,
    path: `/brand/${brand?.slug || slug}`,
    image: brand?.imageUrl,
  });
}

export default async function BrandLayout({ children, params }: LayoutProps) {
  const slug = parseSlugParam((await params).slug);
  const brand = slug ? await brandSeo(slug) : null;
  return (
    <>
      {brand ? <JsonLd data={catalogBreadcrumbs({ name: brand.title, path: `/brand/${brand.slug || slug}` })} /> : null}
      {children}
    </>
  );
}
