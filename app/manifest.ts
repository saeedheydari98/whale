import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: "خرید آنلاین از فروشگاه وال",
    start_url: "/",
    display: "standalone",
    lang: "fa",
    dir: "rtl",
    background_color: "#ffffff",
    theme_color: "#196685",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}
