

/**
 * =========================
 * Theme Types
 * =========================
 */

import { palette } from "./palette";

export type ThemeMode = "light" | "dark";
export type ThemeStyle = "light" | "dark" | "fantasy";
export type ThemeSource = "developer" | "user" | "admin" | "mode";
export type ThemeTarget = "bg" | "text";

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
    | "accent"
    | "fancy";

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
    primary: "green",
    secondary: "gray",
    success: "green",
    danger: "red",
    warning: "yellow",
    info: "blue",
    neutral: "gray",
    accent: "purple",
    fancy: "purple",
};

/**
 * =========================
 * Admin Theme Override
 * =========================
 */

export type AdminThemeOverride = Partial<{
    primary: ThemeColorKey;
    style: ThemeStyle;
    tone: ThemeTone;
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

    user?: {
        preferredColor: ThemeColorKey;
        style: ThemeStyle;
        tone: ThemeTone;
        density: "compact" | "comfortable" | "spacious";
    };

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
    user?: Theme["user"];
};

export function resolveDynamicColor({
    token,
    state,
    admin,
    user,
}: ResolveDynamicColorInput): string {
    const [prefix, part1, part2, part3] = token.split("-");

    if (prefix !== "bg" && prefix !== "text") {
        return resolveColor("gray", state.style, toneFallback);
    }

    const resolvedStyle =
        part2 === "admin"
            ? admin?.style ?? state.style
            : part2 === "user"
                ? user?.style ?? state.style
            : isThemeStyle(part2)
                ? part2
                : state.style || styleFallback;
    const tone =
        part3 === "admin"
            ? admin?.tone ?? toneFallback
            : part3 === "user"
                ? user?.tone ?? toneFallback
                : toTone(part3);

    // 1) Developer-controlled: bg-red-light-500
    if (isThemeColorKey(part1)) {
        if (part2 === "admin") {
            const adminColor = admin?.primary ?? part1;
            return resolveColor(adminColor, admin?.style ?? state.style, tone);
        }

        if (part2 === "user") {
            const userColor = user?.preferredColor ?? part1;
            return resolveColor(userColor, resolvedStyle, tone);
        }

        if (part2 === "mode") {
            const styleFromMode: ThemeStyle =
                state.mode === "dark" ? "dark" : "light";
            return resolveColor(part1, styleFromMode, tone);
        }

        return resolveColor(part1, resolvedStyle, tone);
    }

    // 2) User-controlled: bg-user-dark-300
    if (part1 === "user") {
        const userColor = user?.preferredColor ?? semanticThemeMap.primary;
        return resolveColor(userColor, resolvedStyle, tone);
    }

    // 3) Admin-controlled: bg-blue-admin-600 | bg-admin-dark-600 | text-admin-admin-admin
    if (part1 === "admin" || part2 === "admin") {
        const adminColor =
            admin?.primary ??
            (isThemeColorKey(part1) ? part1 : semanticThemeMap.primary);
        const adminStyle =
            admin?.style ??
            (isThemeStyle(part2) ? part2 : state.style);
        return resolveColor(adminColor, adminStyle, tone);
    }

    // 4) Mode-controlled: bg-mode-fantasy-300
    if (part1 === "mode") {
        const modeColor: ThemeColorKey =
            state.mode === "dark" ? "gray" : "blue";
        return resolveColor(modeColor, resolvedStyle, tone);
    }

    return resolveColor(semanticThemeMap.primary, state.style, tone);
}

/**
 * =========================
 * Default Theme Factory
 * =========================
 */

export function createTheme(
    state: ThemeState,
    admin?: AdminThemeOverride,
    userOverride?: Theme["user"]
): Theme {
    const mode = state.mode;
    const style: ThemeStyle =
        state.style ?? (mode === "dark" ? "dark" : "light");
    const user: Theme["user"] = userOverride ?? {
        preferredColor: "green",
        style: "light",
        tone: 500,
        density: "comfortable",
    };

    return {
        state: { ...state, style },
        admin,
        user,

        tokens: {
            colors: {
                ui: {
                    primary: resolveColor(
                        admin?.primary || semanticThemeMap.primary,
                        admin?.style ?? style,
                        500
                    ),

                    secondary: resolveColor(
                        semanticThemeMap.secondary,
                        style,
                        200
                    ),

                    success: resolveColor(
                        semanticThemeMap.success,
                        style,
                        500
                    ),

                    danger: resolveColor(
                        semanticThemeMap.danger,
                        style,
                        500
                    ),

                    warning: resolveColor(
                        semanticThemeMap.warning,
                        style,
                        500
                    ),

                    info: resolveColor(
                        semanticThemeMap.info,
                        style,
                        500
                    ),

                    neutral: resolveColor(
                        semanticThemeMap.neutral,
                        style,
                        400
                    ),

                    accent: resolveColor(
                        semanticThemeMap.accent,
                        style,
                        500
                    ),

                    fancy: resolveColor(
                        semanticThemeMap.fancy,
                        style,
                        500
                    ),
                },

                text: {
                    primary:
                        mode === "dark"
                            ? "#ffffff"
                            : "#111111",

                    secondary:
                        mode === "dark"
                            ? "#cfcfcf"
                            : "#444444",

                    muted:
                        mode === "dark"
                            ? "#8b8b8b"
                            : "#777777",
                },

                background: {
                    base:
                        mode === "dark"
                            ? "#0a0a0a"
                            : "#ffffff",

                    surface:
                        mode === "dark"
                            ? "#141414"
                            : "#f5f5f5",
                },

                border: {
                    default:
                        mode === "dark"
                            ? "#2a2a2a"
                            : "#e5e5e5",
                },
            },

            spacing: {
                xs: "4px",
                sm: "8px",
                md: "16px",
                lg: "24px",
                xl: "32px",
                xxl: "40px",
                xxxl: "48"
            },

            radius: {
                xs: "4",
                sm: "8px",
                md: "12px",
                lg: "16px",
                xl: "32",
                xxl: "40",
                full: "999px",
            },
        },
    };
}