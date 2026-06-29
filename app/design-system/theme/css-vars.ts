import {
  elementTones,
  resolveColor,
  semanticThemeMap,
  Theme,
  ThemeColorKey,
  variantNames,
} from "./theme";

type VariantName = (typeof variantNames)[number];

export function generateCSSVariables(theme: Theme) {
  const adminColorKey = theme.admin?.primary ?? "gray";
  const adminStyle = theme.admin?.style ?? theme.state.style;
  const modeKey = theme.state.mode === "dark" ? "dark" : "light";

  const withSurface = (color: string, amount: number, surface = "var(--bg-base)") =>
    `color-mix(in srgb, ${color} ${amount}%, ${surface})`;
  const getContrastColor = (color: string) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#111111" : "#ffffff";
  };

  const getVariantColorKey = (variant: VariantName): ThemeColorKey =>
    variant === "primary" ? adminColorKey : semanticThemeMap[variant];

  const buildVariantTokens = (variant: VariantName) => {
    const colorKey = getVariantColorKey(variant);
    const action = resolveColor(colorKey, adminStyle, elementTones.action);
    const base = resolveColor(colorKey, adminStyle, elementTones.base[modeKey]);
    const text = resolveColor(colorKey, adminStyle, elementTones.text[modeKey]);
    const mutedText = resolveColor(colorKey, adminStyle, elementTones.mutedText[modeKey]);
    const subtleText = resolveColor(colorKey, adminStyle, elementTones.subtleText[modeKey]);
    const bg = resolveColor(colorKey, adminStyle, elementTones.bg[modeKey]);
    const card = resolveColor(colorKey, adminStyle, elementTones.card[modeKey]);
    const media = resolveColor(colorKey, adminStyle, elementTones.media[modeKey]);
    const border = resolveColor(colorKey, adminStyle, elementTones.border);

    return {
      action,
      base,
      text,
      mutedText,
      subtleText,
      bg,
      card,
      media,
      border,
      contrast: getContrastColor(action),
      soft: withSurface(bg, 28, "var(--bg-surface)"),
      panel: withSurface(card, 36, "var(--bg-base)"),
      icon: withSurface(media, 48, "var(--bg-base)"),
    };
  };

  const tokens = Object.fromEntries(
    variantNames.map((variant) => [variant, buildVariantTokens(variant)])
  ) as Record<VariantName, ReturnType<typeof buildVariantTokens>>;

  const vars: Record<string, string> = {
    "--bg-base": tokens.primary.base,
    "--bg-surface": tokens.primary.bg,
    "--border-default": tokens.primary.border,

    "--text-primary": tokens.primary.text,
    "--text-secondary": tokens.primary.mutedText,
    "--text-muted": tokens.primary.subtleText,
    "--body-text": tokens.primary.text,
    "--body-text-muted": tokens.primary.mutedText,
    "--body-text-subtle": tokens.primary.subtleText,
  };

  for (const variant of variantNames) {
    const token = tokens[variant];

    Object.assign(vars, {
      [`--ui-${variant}`]: token.action,
      [`--${variant}`]: token.action,
      [`--${variant}-nomode`]: token.action,
      [`--${variant}-contrast`]: token.contrast,
      [`--${variant}-contrast-nomode`]: token.contrast,
      [`--${variant}-base`]: token.base,
      [`--${variant}-base-nomode`]: token.base,
      [`--${variant}-text`]: token.text,
      [`--${variant}-text-nomode`]: token.text,
      [`--${variant}-muted`]: token.mutedText,
      [`--${variant}-muted-nomode`]: token.mutedText,
      [`--${variant}-subtle`]: token.subtleText,
      [`--${variant}-subtle-nomode`]: token.subtleText,
      [`--${variant}-bg`]: token.bg,
      [`--${variant}-bg-nomode`]: token.bg,
      [`--${variant}-card`]: token.card,
      [`--${variant}-card-nomode`]: token.card,
      [`--${variant}-media`]: token.media,
      [`--${variant}-media-nomode`]: token.media,
      [`--${variant}-border`]: token.border,
      [`--${variant}-border-nomode`]: token.border,

      // Backward-compatible layer aliases.
      [`--${variant}-panel`]: token.panel,
      [`--${variant}-panel-nomode`]: token.panel,
      [`--${variant}-soft`]: token.soft,
      [`--${variant}-soft-nomode`]: token.soft,
      [`--${variant}-icon`]: token.icon,
      [`--${variant}-icon-nomode`]: token.icon,
    });
  }

  return vars as React.CSSProperties;
}
