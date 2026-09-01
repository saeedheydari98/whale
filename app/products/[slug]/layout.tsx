import type { Metadata } from "next";
import { JsonLd } from "@/app/design-system/components/seo/json-ld";
import { catalogBreadcrumbs, productJsonLd, productSeo } from "@/lib/seo-catalog";
import { pageMetadata, parseSlugParam } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const slug = parseSlugParam((await params).slug);
  const product = slug ? await productSeo(slug) : null;
  const title = product?.metaTitle || product?.title || "محصول";
  const description = product?.metaDescription || product?.description || "جزئیات محصول را در فروشگاه وال ببینید و سفارش دهید.";
  return pageMetadata({
    title,
    description,
    path: `/products/${product?.slug || slug}`,
    image: product?.imageUrl,
    keywords: product?.metaKeywords,
  });
}

export default async function ProductSlugLayout({ children, params }: LayoutProps) {
  const slug = parseSlugParam((await params).slug);
  const product = slug ? await productSeo(slug) : null;
  return (
    <>
      {product ? <JsonLd data={productJsonLd(product)} /> : null}
      {product ? <JsonLd data={catalogBreadcrumbs({ name: product.title, path: `/products/${product.slug || slug}` })} /> : null}
      {children}
    </>
  );
}
