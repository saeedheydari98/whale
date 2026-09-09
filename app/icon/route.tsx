import { ImageResponse } from "next/og";
import { GiSpermWhale } from "react-icons/gi";
import { prisma } from "@/lib/prisma";
import { resolveColor, type ThemeColorKey, type ThemeStyle } from "@/app/design-system/theme/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const size = {
  width: 32,
  height: 32,
};

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

function asThemeColor(value: string | null): ThemeColorKey | null {
  return value && themeColorKeys.has(value as ThemeColorKey) ? value as ThemeColorKey : null;
}

function asThemeStyle(value: string | null): ThemeStyle | null {
  return value && themeStyleKeys.has(value as ThemeStyle) ? value as ThemeStyle : null;
}

async function readThemeForIcon() {
  try {
    const model = (prisma as { adminTheme?: { findFirst?: () => Promise<unknown> } }).adminTheme;
    if (!model || typeof model.findFirst !== "function") {
      return defaultTheme;
    }

    const record = await model.findFirst();
    if (!record || typeof record !== "object") {
      return defaultTheme;
    }

    const themeRecord = record as { primary?: unknown; style?: unknown };
    const primary = asThemeColor(typeof themeRecord.primary === "string" ? themeRecord.primary : null)
      ?? defaultTheme.primary;
    const style = asThemeStyle(typeof themeRecord.style === "string" ? themeRecord.style : null)
      ?? defaultTheme.style;

    return { primary, style };
  } catch {
    return defaultTheme;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storedTheme = await readThemeForIcon();
  const theme = {
    primary: asThemeColor(url.searchParams.get("primary") ?? url.searchParams.get("theme")) ?? storedTheme.primary,
    style: asThemeStyle(url.searchParams.get("style")) ?? storedTheme.style,
  };
  const backgroundColor = resolveColor(theme.primary, theme.style, 500);
  const iconColor = resolveColor(theme.primary, theme.style, 50);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor,
          borderRadius: 8,
        }}
      >
        <GiSpermWhale size={28} color={iconColor} aria-hidden="true" />
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "image/png",
      },
    }
  );
}
