export const variantOptions = [
  "primary",
  "secondary",
  "success",
  "danger",
  "warning",
  "info",
  "neutral",
  "edit",
  "accent",
] as const;

export const sizeOptions = ["xs", "sm", "md", "lg", "xl", "xxl", "xxxl"] as const;

export const roundedOptions = ["none", "sm", "md", "lg", "xl", "full"] as const;

export const borderOptions = [
  "none",
  "base",
  "borderB",
  "subtle",
  "strong",
  "heavy",
  "dashed",
  "dotted",
] as const;

export const shadowOptions = ["none", "sm", "md", "lg", "xl"] as const;

export const hoverOptions = [
  "none",
  "scaleSm",
  "scale",
  "scaleLg",
  "liftSm",
  "lift",
  "liftLg",
  "darken",
  "darker",
  "lighten",
  "glow",
] as const;

export const cursorOptions = ["none", "pointer", "notAllowed"] as const;

export const loadingOptions = [
  "spinner",
  "ring",
  "dots",
  "pulse",
  "bars",
  "skeleton",
  "skeleton-block",
] as const;
