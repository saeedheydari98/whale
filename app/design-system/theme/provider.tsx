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
import { createTheme, ThemeStyle, ThemeColorKey } from "./theme";
import {
  APP_GLOBAL_UPDATED_EVENT,
  fetchAppGlobal,
  readCachedAppGlobal,
} from "@/lib/app-global-client";
import { THEME_CSS_VARS_STORAGE_KEY } from "./storage";

type ThemeMode = "light" | "dark";

type AdminThemeConfig = {
  primary: ThemeColorKey;
  style: ThemeStyle;
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

const themeColors: readonly ThemeColorKey[] = ["green", "red", "blue", "yellow", "gray", "orange", "purple"];
const themeStyles: readonly ThemeStyle[] = ["light", "dark", "fantasy"];

function normalizeAdminTheme(value: unknown, fallback: AdminThemeConfig = defaultAdminTheme): AdminThemeConfig {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Partial<AdminThemeConfig>;
  return {
    primary: themeColors.includes(record.primary as ThemeColorKey)
      ? record.primary as ThemeColorKey
      : fallback.primary,
    style: themeStyles.includes(record.style as ThemeStyle)
      ? record.style as ThemeStyle
      : fallback.style,
  };
}

function readThemePayload<T>(payload: unknown, fallback: T): T {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as { data?: { theme?: unknown } };
  return (record.data?.theme && typeof record.data.theme === "object"
    ? record.data.theme
    : fallback) as T;
}

function readInitialAdminTheme() {
  if (typeof window === "undefined") return defaultAdminTheme;
  return normalizeAdminTheme(readCachedAppGlobal()?.theme, defaultAdminTheme);
}

function readInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const legacy = localStorage.getItem("theme-mode");
  return legacy === "light" || legacy === "dark" ? legacy : "light";
}

function readInitialThemeStyle(): ThemeStyle {
  if (typeof window === "undefined") return "light";
  const cachedStyle = readInitialAdminTheme().style;
  if (themeStyles.includes(cachedStyle)) return cachedStyle;
  const savedStyle = localStorage.getItem("theme-style");
  return savedStyle === "dark" || savedStyle === "fantasy" ? savedStyle : "light";
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasMounted, setHasMounted] = useState(false);
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [style, setStyle] = useState<ThemeStyle>("light");
  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(defaultAdminTheme);

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
    const initialAdminTheme = readInitialAdminTheme();
    setModeState(readInitialThemeMode());
    setStyle(initialAdminTheme.style || readInitialThemeStyle());
    setAdminTheme(initialAdminTheme);
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem("theme-mode", mode);
  }, [hasMounted, mode]);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem("theme-style", style);
  }, [hasMounted, style]);

  useLayoutEffect(() => {
    if (!hasMounted) return;
    const vars = generateCSSVariables(theme);
    applyCSSVariables(vars as Record<string, string>);
    try {
      localStorage.setItem(THEME_CSS_VARS_STORAGE_KEY, JSON.stringify(vars));
    } catch {
    }
  }, [hasMounted, theme]);

  useLayoutEffect(() => {
    if (!hasMounted) return;
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [hasMounted, mode]);

  useEffect(() => {
    if (!hasMounted) return;
    let cancelled = false;

    const syncThemes = () => {
      const globalData = readCachedAppGlobal();
      if (cancelled) return;

      if (globalData) {
        const nextAdminTheme = normalizeAdminTheme(
          readThemePayload({ data: { theme: globalData.theme } }, defaultAdminTheme),
          defaultAdminTheme
        );
        setAdminTheme(nextAdminTheme);
        setStyle(nextAdminTheme.style);
      }
    };

    syncThemes();
    window.addEventListener(APP_GLOBAL_UPDATED_EVENT, syncThemes);

    return () => {
      cancelled = true;
      window.removeEventListener(APP_GLOBAL_UPDATED_EVENT, syncThemes);
    };
  }, [hasMounted]);

  const updateAdminTheme = useCallback(async (next: Partial<AdminThemeConfig>) => {
    const prev = adminTheme;
    const prevStyle = style;
    const optimistic = { ...prev, ...next };
    setAdminTheme(optimistic);
    setStyle(optimistic.style);

    try {
      const res = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      });
      if (!res.ok) throw new Error("ذخیره تنظیمات ظاهری ناموفق بود.");
      void fetchAppGlobal({ force: true });
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
