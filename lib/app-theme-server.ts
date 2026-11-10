import { prisma } from "@/lib/prisma";
import type { ThemeColorKey, ThemeStyle } from "@/app/design-system/theme/theme";

export type ServerThemeConfig = {
  primary: ThemeColorKey;
  style: ThemeStyle;
};

export const FALLBACK_SERVER_THEME: ServerThemeConfig = {
  primary: "gray",
  style: "light",
};

export const SERVER_THEME_CACHE_MS = 30_000;

const themeColorKeys = new Set<ThemeColorKey>([
  "green",
  "red",
  "blue",
  "yellow",
  "gray",
  "orange",
  "purple",
]);

const themeStyleKeys = new Set<ThemeStyle>(["light", "dark", "fantasy"]);

// Shared across route bundles so saving the theme from the admin panel is picked
// up by the icon route immediately instead of after the cache window.
const themeGlobal = globalThis as unknown as { whaleThemeCache?: { at: number; theme: ServerThemeConfig } | null };

function currentCache() {
  if (!("whaleThemeCache" in themeGlobal)) themeGlobal.whaleThemeCache = null;
  return themeGlobal.whaleThemeCache;
}

export function normalizeServerTheme(
  value: { primary?: unknown; style?: unknown } | null | undefined
): ServerThemeConfig {
  const primary = String(value?.primary ?? "") as ThemeColorKey;
  const style = String(value?.style ?? "") as ThemeStyle;
  return {
    primary: themeColorKeys.has(primary) ? primary : FALLBACK_SERVER_THEME.primary,
    style: themeStyleKeys.has(style) ? style : FALLBACK_SERVER_THEME.style,
  };
}

export function readCachedServerTheme() {
  const cached = currentCache();
  return cached && Date.now() - cached.at < SERVER_THEME_CACHE_MS
    ? cached.theme
    : null;
}

export function writeCachedServerTheme(theme: ServerThemeConfig) {
  themeGlobal.whaleThemeCache = { at: Date.now(), theme };
}

export function invalidateServerThemeCache() {
  themeGlobal.whaleThemeCache = null;
}

/**
 * Reads the active admin theme for the icon route. `/api/theme` also updates this
 * cache whenever it loads or saves the theme.
 */
export async function loadServerTheme(): Promise<ServerThemeConfig> {
  const cached = readCachedServerTheme();
  if (cached) return cached;

  try {
    const record = await prisma.adminTheme.findFirst({ orderBy: { id: "asc" } });
    if (
      !record
      || !themeColorKeys.has(record.primary as ThemeColorKey)
      || !themeStyleKeys.has(record.style as ThemeStyle)
    ) {
      throw new Error("The active admin theme is missing or invalid.");
    }
    const theme = normalizeServerTheme(record);
    writeCachedServerTheme(theme);
    return theme;
  } catch (error) {
    const lastKnownTheme = currentCache()?.theme;
    if (lastKnownTheme) return lastKnownTheme;
    throw error;
  }
}
