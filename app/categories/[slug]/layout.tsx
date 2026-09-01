import type { Metadata } from "next";
import { JsonLd } from "@/app/design-system/components/seo/json-ld";
import { catalogBreadcrumbs, categorySeo } from "@/lib/seo-catalog";
import { pageMetadata, parseSlugParam } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const slug = parseSlugParam((await params).slug);
  const category = slug ? await categorySeo(slug) : null;
  const title = category?.title || "دسته‌بندی";
  return pageMetadata({
    title,
    description: `محصولات دسته ${title} را در فروشگاه وال ببینید، مقایسه کنید و با ارسال منظم سفارش دهید.`,
    path: `/categories/${category?.slug || slug}`,
    image: category?.imageUrl,
  });
}

export default async function CategorySlugLayout({ children, params }: LayoutProps) {
  const slug = parseSlugParam((await params).slug);
  const category = slug ? await categorySeo(slug) : null;
  return (
    <>
      {category ? <JsonLd data={catalogBreadcrumbs({ name: category.title, path: `/categories/${category.slug || slug}` })} /> : null}
      {children}
    </>
  );
}
