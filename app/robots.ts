import type { MetadataRoute } from "next";
import { sitePath, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Crawlers must be able to read the cart's noindex metadata.
        disallow: ["/panel/", "/api/", "/swagger"],
      },
    ],
    sitemap: sitePath("/sitemap.xml"),
    host: siteUrl(),
  };
}
