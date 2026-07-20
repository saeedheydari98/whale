// design-system/variants/shared.variant.ts

/**
 * =========================
 * Interaction States
 * =========================
 */

export const interactionStates = {
  hover: {
    none: "",
    scaleSm: "hover:scale-110",
    scale: "hover:scale-115",
    scaleLg: "hover:scale-120",

    liftSm: "hover:-translate-y-0.5",
    lift: "hover:-translate-y-1",
    liftLg: "hover:-translate-y-2",

    darken: "hover:brightness-90",
    darker: "hover:brightness-75",

    lighten: "hover:brightness-110",

    glow: "hover:shadow-lg",
  },

  active: {
    press: "active:scale-95",
    pressSoft: "active:scale-97",
  },

  focus: {
    base: "focus:outline-none",
    ring: "focus:ring-2 focus:ring-offset-2",
    ringStrong: "focus:ring-4",
  },

  disabled: {
    base: "opacity-50 cursor-not-allowed pointer-events-none",
  },
};

/**
 * =========================
 * Border System
 * =========================
 */

export const borderVariants = {
  none: "border-0",
  base: "border",
  borderB: "border-b-2",
  subtle: "border border-opacity-30",
  strong: "border-2",
  heavy: "border-4",
  dashed: "border border-dashed",
  dotted: "border border-dotted",
};

/**
 * =========================
 * Radius System
 * =========================
 */

export const radiusVariants = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

/**
 * =========================
 * Size System
 * =========================
 */

export const sizeVariants = {
  xs: "h-6 px-2 text-xs",
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-lg",
  lg: "h-12 px-6 text-lg",
  xl: "h-14 px-6 text-xl",
  xxl: "h-16 px-6 text-xl",
  xxxl: "h-18 px-6 text-xl",
};

/**
 * =========================
 * Loading System
 * =========================
 */

export const loadingVariants = {
  spinner: "relative pointer-events-none",
  overlay:
    "before:absolute before:inset-0 before:bg-white/50 before:content-['']",
};

/**
 * =========================
 * Animation / Motion
 * =========================
 */

export const motionVariants = {
  smooth: "transition-all duration-200 ease-in-out",
  fast: "transition-all duration-100",
  slow: "transition-all duration-500",
};

export const shadowVariants = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

export const cursorVariants = {
  none: "",
  pointer: "cursor-pointer",
  notAllowed: "cursor-not-allowed",
};

export const gradientDirections = {
  ltr: "to right",
  rtl: "to left",
  utb: "to bottom",
  btu: "to top",
} as const;

export type GradientDirection = keyof typeof gradientDirections;

export function resolveGradientStyle(
  backgroundColor: string,
  gradient: GradientDirection = "btu"
) {
  const fadedColor = `color-mix(in srgb, ${backgroundColor} 82%, var(--bg-surface))`;

  return {
    backgroundImage: `linear-gradient(${gradientDirections[gradient]}, ${backgroundColor} 0%, ${fadedColor} 100%)`,
  };
}

/**
 * =========================
 * Utility: Class Combiner
 * =========================
 */

export function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
