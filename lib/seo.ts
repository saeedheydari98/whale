import type { Metadata } from "next";
import { z } from "zod";
import { DEFAULT_KEYWORDS, SITE_LOCALE, SITE_NAME, sitePath, siteUrl } from "@/lib/site";

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(220).refine((value) => !value.includes("/") && !value.includes(".."), {
    message: "شناسه مسیر معتبر نیست.",
  }),
});

export function parseSlugParam(value: unknown) {
  const parsed = slugParamSchema.safeParse({ slug: String(value ?? "").trim() });
  return parsed.success ? parsed.data.slug : "";
}

export function seoDescription(value: string, fallback: string) {
  const text = String(value || fallback).replace(/\s+/g, " ").trim();
  if (text.length < 150) {
    const padded = `${text} ${fallback}`.replace(/\s+/g, " ").trim();
    return padded.slice(0, 160);
  }
  if (text.length <= 160) return text;
  const sliced = text.slice(0, 160);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > 120 ? sliced.slice(0, lastSpace) : sliced).trim();
}

export function seoKeywords(value?: string | string[] | null) {
  const fromList = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[،,]+/);
  const merged = [...fromList.map((item) => item.trim()).filter(Boolean), ...DEFAULT_KEYWORDS];
  return [...new Set(merged)].slice(0, 10);
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  keywords?: string | string[] | null;
  index?: boolean;
  follow?: boolean;
  type?: "website" | "article";
};

export function pageMetadata({
  title,
  description,
  path,
  image,
  keywords,
  index = true,
  follow = true,
  type = "website",
}: PageMetadataInput): Metadata {
  const url = sitePath(path);
  const desc = seoDescription(description, DEFAULT_HOME_DESCRIPTION);
  const images = image ? [{ url: image.startsWith("http") ? image : sitePath(image) }] : [{ url: sitePath("/icon") }];

  return {
    title,
    description: desc,
    keywords: seoKeywords(keywords),
    robots: { index, follow },
    alternates: { canonical: url },
    openGraph: {
      title: title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`,
      description: desc,
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`,
      description: desc,
      images: images.map((item) => item.url),
    },
  };
}

export const DEFAULT_HOME_DESCRIPTION =
  "فروشگاه وال برای خرید آنلاین محصولات، مشاهده ویترین و دسته‌بندی‌ها، مقایسه قیمت و ثبت سفارش با ارسال منظم در ایران.";

export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: sitePath(item.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl(),
    logo: sitePath("/icon"),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${sitePath("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
