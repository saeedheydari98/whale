import { Theme } from "./theme";

export function generateCSSVariables(theme: Theme) {
  return {
    "--ui-primary": theme.tokens.colors.ui.primary,
    "--ui-secondary": theme.tokens.colors.ui.secondary,
    "--ui-success": theme.tokens.colors.ui.success,
    "--ui-danger": theme.tokens.colors.ui.danger,
    "--ui-warning": theme.tokens.colors.ui.warning,

    "--bg-base": theme.tokens.colors.background.base,
    "--bg-surface": theme.tokens.colors.background.surface,

    "--text-primary": theme.tokens.colors.text.primary,
    "--text-secondary": theme.tokens.colors.text.secondary,
  } as React.CSSProperties;
}