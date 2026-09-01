import type { MetadataRoute } from "next";
import { sitePath, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel/", "/api/", "/cart", "/swagger"],
      },
    ],
    sitemap: sitePath("/sitemap.xml"),
    host: siteUrl(),
  };
}
