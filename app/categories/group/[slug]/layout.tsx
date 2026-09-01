import type { Metadata } from "next";
import { JsonLd } from "@/app/design-system/components/seo/json-ld";
import { catalogBreadcrumbs, categoryGroupSeo } from "@/lib/seo-catalog";
import { pageMetadata, parseSlugParam } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const slug = parseSlugParam((await params).slug);
  const group = slug ? await categoryGroupSeo(slug) : null;
  const title = group?.title || "گروه دسته‌بندی";
  return pageMetadata({
    title,
    description: `محصولات گروه ${title} را در فروشگاه وال مشاهده کنید و سفارش خود را ثبت کنید.`,
    path: `/categories/group/${group?.id || slug}`,
  });
}

export default async function CategoryGroupLayout({ children, params }: LayoutProps) {
  const slug = parseSlugParam((await params).slug);
  const group = slug ? await categoryGroupSeo(slug) : null;
  return (
    <>
      {group ? <JsonLd data={catalogBreadcrumbs({ name: group.title, path: `/categories/group/${group.id}` })} /> : null}
      {children}
    </>
  );
}
