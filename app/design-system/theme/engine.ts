export type ThemeMode = "light" | "dark";

export type ThemeSource = "developer" | "user" | "admin" | "mode";

export type ThemeState = {
  mode: ThemeMode;
  source: ThemeSource;
};

type CSSVars = Record<string, string>;

export function applyCSSVariables(vars: CSSVars) {
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}