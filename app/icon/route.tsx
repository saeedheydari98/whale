import { ImageResponse } from "next/og";
import { GiSpermWhale } from "react-icons/gi";
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const theme = {
    primary: asThemeColor(url.searchParams.get("primary") ?? url.searchParams.get("theme")) ?? defaultTheme.primary,
    style: asThemeStyle(url.searchParams.get("style")) ?? defaultTheme.style,
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
