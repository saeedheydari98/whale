import { Theme } from "../theme/theme";

export type UICommonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral";

export type VariantColorStyle = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

export function resolveVariantColors(
  variant: UICommonVariant,
  theme: Theme
): VariantColorStyle {
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: theme.tokens.colors.ui.secondary,
        color: "#111111",
        borderColor: theme.tokens.colors.ui.secondary,
      };
    case "success":
      return {
        backgroundColor: theme.tokens.colors.ui.success,
        color: "#ffffff",
        borderColor: theme.tokens.colors.ui.success,
      };
    case "danger":
      return {
        backgroundColor: theme.tokens.colors.ui.danger,
        color: "#ffffff",
        borderColor: theme.tokens.colors.ui.danger,
      };
    case "warning":
      return {
        backgroundColor: theme.tokens.colors.ui.warning,
        color: "#111111",
        borderColor: theme.tokens.colors.ui.warning,
      };
    case "info":
      return {
        backgroundColor: theme.tokens.colors.ui.info,
        color: "#ffffff",
        borderColor: theme.tokens.colors.ui.info,
      };
    case "neutral":
      return {
        backgroundColor: theme.tokens.colors.ui.neutral,
        color: "#ffffff",
        borderColor: theme.tokens.colors.ui.neutral,
      };
    case "primary":
    default:
      return {
        backgroundColor: theme.tokens.colors.ui.primary,
        color: "#ffffff",
        borderColor: theme.tokens.colors.ui.primary,
      };
  }
}
