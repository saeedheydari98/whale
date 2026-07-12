import { resolveColor, semanticThemeMap, Theme, ThemeColorKey, ThemeStyle } from "../theme/theme";

export type UICommonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "edit"
  | "accent";

export type VariantColorStyle = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

export function strengthenBorderColor(color: string): string {
  const match = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);

  if (!match) {
    return color;
  }

  const darken = (value: string) => {
    const next = Math.round(Number.parseInt(value, 16) * 0.72);
    return next.toString(16).padStart(2, "0");
  };

  return `#${darken(match[1])}${darken(match[2])}${darken(match[3])}`;
}

function createVariantStyle(backgroundColor: string, color: string): VariantColorStyle {
  return {
    backgroundColor,
    color,
    borderColor: strengthenBorderColor(backgroundColor),
  };
}

function getAdminThemeTextSource(theme: Theme) {
  return {
    color: theme.admin?.primary ?? "gray",
    style: theme.admin?.style ?? theme.state.style,
  };
}

function getAdminThemeStyle(theme: Theme) {
  return theme.admin?.style ?? theme.state.style;
}

export function resolveThemeTextColor(
  theme: Theme,
  tone: 50 | 200 | 300 | 700 | 800 | 950
) {
  const themeSource = getAdminThemeTextSource(theme);

  return resolveColor(
    themeSource.color as ThemeColorKey,
    themeSource.style as ThemeStyle,
    tone
  );
}

export function resolveSemanticTextColor(
  theme: Theme,
  color: ThemeColorKey,
  tone: 50 | 200 | 300 | 700 | 800 | 950
) {
  return resolveColor(color, getAdminThemeStyle(theme), tone);
}

export function resolveTokenTextColor(
  theme: Theme,
  token: string,
  tone: 50 | 200 | 300 | 700 | 800 | 950
) {
  return token.includes("-admin-")
    ? resolveThemeTextColor(theme, tone)
    : resolveSemanticTextColor(theme, semanticThemeMap.neutral, tone);
}

export function resolveVariantColors(
  variant: UICommonVariant,
  theme: Theme
): VariantColorStyle {
  if (variant === "neutral") {
    const darkMode = theme.state.mode === "dark";

    return {
      backgroundColor: resolveColor("gray", darkMode ? "dark" : "light", darkMode ? 800 : 100),
      color: resolveColor("gray", darkMode ? "dark" : "light", darkMode ? 50 : 950),
      borderColor: resolveColor("gray", darkMode ? "dark" : "light", darkMode ? 600 : 300),
    };
  }

  const colorVariantMap: Partial<Record<UICommonVariant, ThemeColorKey>> = {
    secondary: "gray",
    success: "green",
    danger: "red",
    warning: "yellow",
    info: "blue",
    edit: "orange",
    accent: "purple",
  };
  const staticColor = colorVariantMap[variant];

  if (staticColor) {
    return createVariantStyle(
      theme.tokens.colors.ui[variant],
      resolveSemanticTextColor(theme, staticColor, staticColor === "yellow" ? 950 : 50)
    );
  }

  switch (variant) {
    case "primary":
    default:
      return createVariantStyle(theme.tokens.colors.ui.primary, resolveThemeTextColor(theme, 50));
  }
}
