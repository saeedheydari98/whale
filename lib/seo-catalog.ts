import { prisma } from "@/lib/prisma";
import { decodeCatalogIdentifier, getProductSeoFields, slugifyCatalogValue } from "@/lib/api/catalog-layer-service";
import { readPriceNumberWithFallback } from "@/lib/price-format";
import { breadcrumbJsonLd, parseSlugParam } from "@/lib/seo";
import { SITE_NAME, sitePath } from "@/lib/site";

function identifier(value: string) {
  return decodeCatalogIdentifier(parseSlugParam(value));
}

export async function productSeo(slug: string) {
  const key = identifier(slug);
  if (!key) return null;
  return getProductSeoFields(key);
}

export async function categorySeo(slug: string) {
  const key = identifier(slug);
  if (!key) return null;
  const slugValue = slugifyCatalogValue(key);
  return prisma.category.findFirst({
    where: { active: true, OR: [{ slug: key }, { slug: slugValue }, { id: key }] },
    select: { title: true, slug: true, imageUrl: true, updatedAt: true },
  });
}

export async function brandSeo(slug: string) {
  const key = identifier(slug);
  if (!key) return null;
  const slugValue = slugifyCatalogValue(key);
  return prisma.brand.findFirst({
    where: { active: true, OR: [{ slug: key }, { slug: slugValue }, { id: key }] },
    select: { title: true, slug: true, imageUrl: true, updatedAt: true },
  });
}

export async function showcaseSeo(slug: string) {
  const key = identifier(slug);
  if (!key) return null;
  const slugValue = slugifyCatalogValue(key);
  const showcases = await prisma.showcase.findMany({
    where: { active: true },
    select: { id: true, title: true, description: true, imageUrl: true, updatedAt: true },
  });
  return showcases.find((item) => (
    item.id === key
    || slugifyCatalogValue(item.title || item.id) === slugValue
  )) ?? null;
}

export async function categoryGroupSeo(slug: string) {
  const key = identifier(slug);
  if (!key) return null;
  return prisma.categoryGroup.findFirst({
    where: { active: true, OR: [{ id: key }, { title: key }] },
    select: { id: true, title: true, updatedAt: true },
  });
}

export function productJsonLd(product: NonNullable<Awaited<ReturnType<typeof productSeo>>>) {
  const path = `/products/${product.slug || product.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.metaDescription || product.description,
    image: product.images.length > 0 ? product.images : undefined,
    sku: product.sku || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      url: sitePath(path),
      priceCurrency: "IRR",
      price: readPriceNumberWithFallback(product.price),
      availability: product.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    aggregateRating: Number(product.ratingCount) > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(product.ratingAverage || 0),
          reviewCount: Number(product.ratingCount || 0),
        }
      : undefined,
  };
}

export function catalogBreadcrumbs(leaf: { name: string; path: string }) {
  return breadcrumbJsonLd([
    { name: SITE_NAME, path: "/" },
    leaf,
  ]);
}
