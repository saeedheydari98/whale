"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { applyCSSVariables } from "./engine";
import { generateCSSVariables } from "./css-vars";
import { createTheme, ThemeStyle } from "./theme";
import { THEME_CSS_VARS_STORAGE_KEY, THEME_STATE_STORAGE_KEY } from "./storage";
import {
  normalizeAppTheme,
  saveAppTheme,
  type AppThemeData,
} from "@/lib/app-theme-client";

type ThemeMode = "light" | "dark";

type AdminThemeConfig = AppThemeData;

type ThemeSnapshot = {
  mode: ThemeMode;
  style: ThemeStyle;
  adminTheme: AdminThemeConfig;
};

type ThemeContextType = {
  mode: ThemeMode;
  style: ThemeStyle;
  setMode: (mode: ThemeMode) => void;
  setStyle: (style: ThemeStyle) => void;
  adminTheme: AdminThemeConfig;
  updateAdminTheme: (next: Partial<AdminThemeConfig>) => Promise<void>;
  theme: ReturnType<typeof createTheme>;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const defaultAdminTheme: AdminThemeConfig = {
  primary: "gray",
  style: "light",
};

const themeStyles: readonly ThemeStyle[] = ["light", "dark", "fantasy"];

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isThemeStyle(value: unknown): value is ThemeStyle {
  return themeStyles.includes(value as ThemeStyle);
}

function normalizeAdminTheme(value: unknown, fallback: AdminThemeConfig = defaultAdminTheme): AdminThemeConfig {
  if (!value || typeof value !== "object") return fallback;
  return normalizeAppTheme(value as Partial<AdminThemeConfig>, fallback);
}

function readStoredThemeSnapshot(): Partial<ThemeSnapshot> | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(localStorage.getItem(THEME_STATE_STORAGE_KEY) || "null") as Partial<ThemeSnapshot> | null;
    if (!parsed || typeof parsed !== "object") return null;

    const snapshot: Partial<ThemeSnapshot> = {};
    if (isThemeMode(parsed.mode)) snapshot.mode = parsed.mode;
    if (isThemeStyle(parsed.style)) snapshot.style = parsed.style;
    if (parsed.adminTheme) snapshot.adminTheme = normalizeAdminTheme(parsed.adminTheme, defaultAdminTheme);
    return snapshot;
  } catch {
    return null;
  }
}

function readInitialThemeSnapshot(initialAdminTheme?: unknown): ThemeSnapshot {
  const globalAdminTheme = initialAdminTheme
    ? normalizeAdminTheme(initialAdminTheme, defaultAdminTheme)
    : null;

  if (typeof window === "undefined") {
    const adminTheme = globalAdminTheme ?? defaultAdminTheme;
    return {
      mode: "light",
      style: adminTheme.style,
      adminTheme,
    };
  }

  const stored = readStoredThemeSnapshot();
  const storedAdminTheme = stored?.adminTheme
    ? normalizeAdminTheme(stored.adminTheme, defaultAdminTheme)
    : defaultAdminTheme;
  const legacyMode = localStorage.getItem("theme-mode");
  const legacyStyle = localStorage.getItem("theme-style");
  const mode = stored?.mode ?? (isThemeMode(legacyMode) ? legacyMode : "light");
  const mergedAdminTheme = normalizeAdminTheme({
    ...storedAdminTheme,
    ...(globalAdminTheme ?? {}),
  }, defaultAdminTheme);
  const style = globalAdminTheme?.style
    ?? stored?.style
    ?? mergedAdminTheme.style
    ?? (isThemeStyle(legacyStyle) ? legacyStyle : defaultAdminTheme.style);
  const adminTheme = normalizeAdminTheme(
    {
      ...mergedAdminTheme,
      style,
    },
    defaultAdminTheme
  );

  return {
    mode,
    style,
    adminTheme,
  };
}

function persistThemeSnapshot(snapshot: ThemeSnapshot, vars: React.CSSProperties) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("theme-mode", snapshot.mode);
    localStorage.setItem("theme-style", snapshot.style);
    localStorage.setItem(THEME_STATE_STORAGE_KEY, JSON.stringify(snapshot));
    localStorage.setItem(THEME_CSS_VARS_STORAGE_KEY, JSON.stringify(vars));
  } catch {
  }
}

export function ThemeProvider({
  children,
  initialAdminTheme,
}: {
  children: React.ReactNode;
  initialAdminTheme?: unknown;
}) {
  const [initialThemeSnapshot] = useState(() => readInitialThemeSnapshot(initialAdminTheme));
  const [mode, setModeState] = useState<ThemeMode>(initialThemeSnapshot.mode);
  const [style, setStyle] = useState<ThemeStyle>(initialThemeSnapshot.style);
  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(initialThemeSnapshot.adminTheme);

  const theme = useMemo(
    () =>
      createTheme(
        {
          mode,
          source: "developer",
          adminActive: true,
          style,
        },
        adminTheme
      ),
    [mode, style, adminTheme]
  );

  useLayoutEffect(() => {
    const nextSnapshot = readInitialThemeSnapshot(initialAdminTheme);
    const nextTheme = createTheme(
      {
        mode: nextSnapshot.mode,
        source: "developer",
        adminActive: true,
        style: nextSnapshot.style,
      },
      nextSnapshot.adminTheme
    );
    const vars = generateCSSVariables(nextTheme);

    applyCSSVariables(vars as Record<string, string>);
    document.documentElement.classList.toggle("dark", nextSnapshot.mode === "dark");
    persistThemeSnapshot(nextSnapshot, vars);
    setModeState(nextSnapshot.mode);
    setStyle(nextSnapshot.style);
    setAdminTheme(nextSnapshot.adminTheme);
  }, [initialAdminTheme]);

  useLayoutEffect(() => {
    const vars = generateCSSVariables(theme);
    applyCSSVariables(vars as Record<string, string>);
    document.documentElement.classList.toggle("dark", mode === "dark");
    persistThemeSnapshot({ mode, style, adminTheme }, vars);
  }, [adminTheme, mode, style, theme]);

  useEffect(() => {
    let cancelled = false;

    const applyAdminTheme = (nextAdminTheme: AdminThemeConfig) => {
      if (cancelled) return;
      setAdminTheme(nextAdminTheme);
      setStyle(nextAdminTheme.style);
    };

    const syncStoredTheme = () => {
      const stored = readStoredThemeSnapshot();
      if (!stored?.adminTheme) return;

      applyAdminTheme(normalizeAdminTheme({
        ...stored.adminTheme,
        style: stored.style ?? stored.adminTheme.style,
      }, defaultAdminTheme));
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key
        && event.key !== THEME_STATE_STORAGE_KEY
        && event.key !== "theme-style"
        && event.key !== "theme-mode"
      ) {
        return;
      }
      syncStoredTheme();
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateAdminTheme = useCallback(async (next: Partial<AdminThemeConfig>) => {
    const prev = adminTheme;
    const prevStyle = style;
    const optimistic = normalizeAdminTheme({ ...prev, ...next }, prev);
    setAdminTheme(optimistic);
    setStyle(optimistic.style);

    try {
      const saved = await saveAppTheme(optimistic);
      setAdminTheme(saved);
      setStyle(saved.style);
    } catch (error) {
      console.error("Failed to update admin theme:", error);
      setAdminTheme(prev);
      setStyle(prevStyle);
    }
  }, [adminTheme, style]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const contextValue = useMemo(
    () => ({
      mode,
      style,
      setMode,
      setStyle,
      adminTheme,
      updateAdminTheme,
      theme,
    }),
    [
      mode,
      style,
      setMode,
      setStyle,
      adminTheme,
      updateAdminTheme,
      theme,
    ]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return ctx;
}
