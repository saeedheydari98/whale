import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { slugifyCatalogValue } from "@/lib/api/catalog-layer-service";
import { sitePath, siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl(), lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: sitePath("/products"), lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: sitePath("/categories"), lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: sitePath("/about-wahle"), changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const [products, categories, brands, showcases, categoryGroups] = await Promise.all([
      prisma.product.findMany({
        where: { active: true, isActive: true, deletedAt: null },
        select: { id: true, slug: true, title: true, updatedAt: true },
      }),
      prisma.category.findMany({
        where: { active: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.brand.findMany({
        where: { active: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.showcase.findMany({
        where: { active: true },
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.categoryGroup.findMany({
        where: { active: true },
        select: { id: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...products.map((product) => ({
        url: sitePath(`/products/${encodeURIComponent(slugifyCatalogValue(product.slug || product.title || product.id))}`),
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...categories.map((category) => ({
        url: sitePath(`/categories/${encodeURIComponent(category.slug)}`),
        lastModified: category.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...brands.map((brand) => ({
        url: sitePath(`/brand/${encodeURIComponent(brand.slug)}`),
        lastModified: brand.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
      ...showcases.map((showcase) => ({
        url: sitePath(`/showcase/${encodeURIComponent(slugifyCatalogValue(showcase.title || showcase.id))}`),
        lastModified: showcase.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...categoryGroups.map((group) => ({
        url: sitePath(`/categories/group/${encodeURIComponent(group.id)}`),
        lastModified: group.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
