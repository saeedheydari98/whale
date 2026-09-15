import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT_NAME } from "@/lib/site";
import { resolveColor } from "@/app/design-system/theme/theme";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const backgroundColor = resolveColor("gray", "light", 50);
  const themeColor = resolveColor("gray", "light", 500);

  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: "فروشگاه محصولات وال",
    start_url: "/",
    display: "standalone",
    lang: "fa",
    dir: "rtl",
    background_color: backgroundColor,
    theme_color: themeColor,
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}