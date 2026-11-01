import { ImageResponse } from "next/og";
import { GiSpermWhale } from "react-icons/gi";
import { resolveColor, type ThemeColorKey, type ThemeStyle } from "@/app/design-system/theme/theme";
import { loadServerTheme } from "@/lib/app-theme-server";

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

function asThemeColor(value: string | null): ThemeColorKey | null {
  return value && themeColorKeys.has(value as ThemeColorKey) ? value as ThemeColorKey : null;
}

function asThemeStyle(value: string | null): ThemeStyle | null {
  return value && themeStyleKeys.has(value as ThemeStyle) ? value as ThemeStyle : null;
}

function asThemeMode(value: string | null): "light" | "dark" | null {
  return value === "dark" ? "dark" : value === "light" ? "light" : null;
}

/** Reads the mode the visitor picked so the icon background matches the app. */
function readModeCookie(request: Request): "light" | "dark" | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)theme-mode=(light|dark)(?:;|$)/);
  return match ? (match[1] as "light" | "dark") : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedPrimary = asThemeColor(url.searchParams.get("primary") ?? url.searchParams.get("theme"));
  const requestedStyle = asThemeStyle(url.searchParams.get("style"));
  const mode = asThemeMode(url.searchParams.get("mode")) ?? readModeCookie(request) ?? "light";

  // Without explicit parameters the active admin theme is read from the database so
  // the first favicon request already carries the real brand color. The gray
  // fallback is only used when the theme itself is gray.
  const theme = requestedPrimary && requestedStyle
    ? { primary: requestedPrimary, style: requestedStyle }
    : await loadServerTheme();

  const backgroundColor = resolveColor(theme.primary, theme.style, mode === "dark" ? 900 : 500);
  const iconColor = resolveColor(theme.primary, theme.style, mode === "dark" ? 100 : 50);

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
