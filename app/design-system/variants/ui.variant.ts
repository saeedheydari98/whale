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

export function resolveVariantCssVars(variant: UICommonVariant): VariantColorStyle {
  if (variant === "neutral") {
    return {
      backgroundColor: "var(--neutral-bg)",
      color: "var(--neutral-text)",
      borderColor: "var(--neutral-border)",
    };
  }

  return {
    backgroundColor: `var(--${variant})`,
    color: `var(--${variant}-contrast)`,
    borderColor: `var(--${variant}-border)`,
  };
}

export function resolveControlCssVars(variant: UICommonVariant): Pick<VariantColorStyle, "backgroundColor" | "borderColor"> {
  const baseColor = variant === "neutral" ? "var(--neutral)" : `var(--${variant})`;
  const borderColor = variant === "neutral" ? "var(--neutral-border)" : `var(--${variant}-border)`;

  return {
    backgroundColor: `color-mix(in srgb, ${baseColor} 10%, var(--bg-surface))`,
    borderColor,
  };
}

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
