

/**
 * =========================
 * Theme Types
 * =========================
 */

import { palette } from "./palette";

export type ThemeMode = "light" | "dark";
export type ThemeStyle = "light" | "dark" | "fantasy";
export type ThemeSource = "developer" | "user" | "admin" | "mode";
export type ThemeTarget = "bg" | "text" | "border";

export type ThemeColorKey =
    | "green"
    | "red"
    | "blue"
    | "yellow"
    | "gray"
    | "orange"
    | "purple";

export type SemanticColor =
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "neutral"
    | "accent";

export type ThemeState = {
    mode: ThemeMode;
    source: ThemeSource;
    adminActive: boolean;
    style: ThemeStyle;
};

/**
 * =========================
 * Semantic Mapping Layer
 * =========================
 */

export const semanticThemeMap: Record<
    SemanticColor,
    ThemeColorKey
> = {
    primary: "gray",
    secondary: "gray",
    success: "green",
    danger: "red",
    warning: "yellow",
    info: "blue",
    neutral: "orange",
    accent: "purple",
};

export const variantNames = [
    "primary",
    "secondary",
    "success",
    "danger",
    "warning",
    "info",
    "neutral",
    "accent",
] as const satisfies readonly SemanticColor[];

export const elementTones = {
    base: { light: 50, dark: 950 },
    text: { light: 950, dark: 50 },
    mutedText: { light: 800, dark: 200 },
    subtleText: { light: 700, dark: 300 },
    bg: { light: 100, dark: 900 },
    card: { light: 200, dark: 800 },
    media: { light: 300, dark: 700 },
    action: 500,
    border: 500,
} as const;

/**
 * =========================
 * Admin Theme Override
 * =========================
 */

export type AdminThemeOverride = Partial<{
    primary: ThemeColorKey;
    style: ThemeStyle;
    header: ThemeColorKey;
    footer: ThemeColorKey;
    background: ThemeColorKey;
}>;

/**
 * =========================
 * Theme Context Structure
 * =========================
 */

export interface Theme {
    state: ThemeState;

    admin?: AdminThemeOverride;

    tokens: {
        colors: {
            ui: Record<SemanticColor, string>;
            text: {
                primary: string;
                secondary: string;
                muted: string;
            };
            background: {
                base: string;
                surface: string;
            };
            border: {
                default: string;
            };
        };

        spacing: {
            xs: string;
            sm: string;
            md: string;
            lg: string;
            xl: string;
            xxl: string;
            xxxl: string;
        };

        radius: {
            xs: string;
            sm: string;
            md: string;
            lg: string;
            xl: string;
            xxl: string;
            full: string;
        };
        cursor: {
            pointer: string;
            notAllowed: string;
        }
    };
}

export type ThemeTone = keyof typeof palette.green.light;
export type ThemeColorToken = `${ThemeTarget}-${string}-${string}-${ThemeTone}`;

const themeStyles: readonly ThemeStyle[] = ["light", "dark", "fantasy"] as const;
const paletteKeys = Object.keys(palette) as ThemeColorKey[];
const toneFallback: ThemeTone = 500;
const styleFallback: ThemeStyle = "light";

function isThemeStyle(value: string): value is ThemeStyle {
    return themeStyles.includes(value as ThemeStyle);
}

function isThemeColorKey(value: string): value is ThemeColorKey {
    return paletteKeys.includes(value as ThemeColorKey);
}

function toTone(value?: string): ThemeTone {
    if (!value) {
        return toneFallback;
    }

    const asNumber = Number(value) as ThemeTone;
    const sampleScale = palette.gray.light;

    if (Object.prototype.hasOwnProperty.call(sampleScale, asNumber)) {
        return asNumber;
    }

    return toneFallback;
}

/**
 * =========================
 * Theme Resolver Core
 * =========================
 */

export function resolveColor(
    colorKey: ThemeColorKey,
    style: ThemeStyle,
    tone: ThemeTone = 500
) {
    const color = palette[colorKey];
    return color[style][tone];
}

type ResolveDynamicColorInput = {
    token: ThemeColorToken | string;
    state: ThemeState;
    admin?: AdminThemeOverride;
};

function resolveDynamicColorKey(
    value: string | undefined,
    state: ThemeState,
    admin?: AdminThemeOverride
): ThemeColorKey {
    if (value === "admin") {
        return admin?.primary ?? semanticThemeMap.secondary;
    }

    if (value === "mode") {
        return state.mode === "dark" ? "gray" : "blue";
    }

    if (value && isThemeColorKey(value)) {
        return value;
    }

    return semanticThemeMap.secondary;
}

function resolveDynamicStyle(
    value: string | undefined,
    state: ThemeState,
    admin?: AdminThemeOverride
): ThemeStyle {
    if (value === "admin") {
        return admin?.style ?? state.style;
    }

    if (value === "mode") {
        return state.mode === "dark" ? "dark" : "light";
    }

    if (value && isThemeStyle(value)) {
        return value;
    }

    return state.style || styleFallback;
}

function resolveDynamicTone(value: string | undefined): ThemeTone {
    return toTone(value);
}

export function resolveDynamicColor({
    token,
    state,
    admin,
}: ResolveDynamicColorInput): string {
    const [prefix, part1, part2, part3] = token.split("-");

    if (prefix !== "bg" && prefix !== "text" && prefix !== "border") {
        return resolveColor("gray", state.style, toneFallback);
    }

    const color = resolveDynamicColorKey(part1, state, admin);
    const style = resolveDynamicStyle(part2, state, admin);
    const tone = resolveDynamicTone(part3);

    return resolveColor(color, style, tone);
}

/**
 * =========================
 * Default Theme Factory
 * =========================
 */

export function createTheme(
    state: ThemeState,
    admin?: AdminThemeOverride
): Theme {
    const mode = state.mode;
    const style: ThemeStyle =
        state.style ?? (mode === "dark" ? "dark" : "light");
    const adminColor = admin?.primary || semanticThemeMap.secondary;
    const adminStyle = admin?.style ?? style;
    const modeKey = mode === "dark" ? "dark" : "light";
    const resolveVariantColor = (variant: SemanticColor) =>
        resolveColor(
            variant === "primary" ? adminColor : semanticThemeMap[variant],
            adminStyle,
            elementTones.action
        );

    return {
        state: { ...state, style },
        admin,

        tokens: {
            colors: {
                ui: Object.fromEntries(
                    variantNames.map((variant) => [variant, resolveVariantColor(variant)])
                ) as Record<SemanticColor, string>,

                text: {
                    primary:
                        resolveColor(adminColor, adminStyle, elementTones.text[modeKey]),

                    secondary:
                        resolveColor(adminColor, adminStyle, elementTones.mutedText[modeKey]),

                    muted:
                        resolveColor(adminColor, adminStyle, elementTones.subtleText[modeKey]),
                },

                background: {
                    base: resolveColor(adminColor, adminStyle, elementTones.base[modeKey]),

                    surface: resolveColor(adminColor, adminStyle, elementTones.bg[modeKey]),
                },

                border: {
                    default: resolveColor(adminColor, adminStyle, elementTones.border),
                },
            },

            spacing: {
                xs: "4px",
                sm: "8px",
                md: "16px",
                lg: "24px",
                xl: "32px",
                xxl: "40px",
                xxxl: "48px"
            },

            radius: {
                xs: "4",
                sm: "8px",
                md: "12px",
                lg: "16px",
                xl: "32px",
                xxl: "40px",
                full: "999px",
            },
            
            cursor: {
                pointer: "pointer",
                notAllowed: "not-allowed",
            }
        },
    };
}
