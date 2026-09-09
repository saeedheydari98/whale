import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT_NAME } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { resolveColor, type ThemeColorKey, type ThemeStyle } from "@/app/design-system/theme/theme";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const themeColorKeys = new Set<ThemeColorKey>([
  "green",
  "red",
  "blue",
  "yellow",
  "gray",
  "orange",
  "purple",
]);

const themeStyleKeys = new Set<ThemeStyle>([
  "light",
  "dark",
  "fantasy",
]);

const defaultTheme = {
  primary: "gray" as ThemeColorKey,
  style: "light" as ThemeStyle,
};

async function readThemeForManifest() {
  try {
    const model = (prisma as any).adminTheme;
    if (!model || typeof model.findFirst !== "function") {
      return defaultTheme;
    }

    const record = await model.findFirst();
    if (!record || typeof record !== "object") {
      return defaultTheme;
    }

    const primary = typeof record.primary === "string" && themeColorKeys.has(record.primary as ThemeColorKey)
      ? (record.primary as ThemeColorKey)
      : defaultTheme.primary;

    const style = typeof record.style === "string" && themeStyleKeys.has(record.style as ThemeStyle)
      ? (record.style as ThemeStyle)
      : defaultTheme.style;

    return { primary, style };
  } catch {
    return defaultTheme;
  }
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const theme = await readThemeForManifest();
  const backgroundColor = resolveColor(theme.primary, theme.style, 50);
  const themeColor = resolveColor(theme.primary, theme.style, 500);

  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: "???? ?????? ?? ??????? ???",
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