"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { applyCSSVariables } from "./engine";
import { generateCSSVariables } from "./css-vars";
import { createTheme, ThemeStyle } from "./theme";
import { THEME_CSS_VARS_STORAGE_KEY, THEME_STATE_STORAGE_KEY } from "./storage";
import {
  fallbackAppTheme,
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

const APP_THEME_CACHE_KEY = "app-theme:v1";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  try {
    const parsed = JSON.parse(localStorage.getItem(THEME_STATE_STORAGE_KEY) || "null") as {
      mode?: unknown;
    } | null;
    if (parsed?.mode && isThemeMode(parsed.mode)) return parsed.mode;
  } catch {
  }

  const legacyMode = localStorage.getItem("theme-mode");
  return isThemeMode(legacyMode) ? legacyMode : "dark";
}

function readCachedGlobalTheme(initialAdminTheme?: unknown): AdminThemeConfig {
  if (typeof window !== "undefined") {
    try {
      const parsed = JSON.parse(localStorage.getItem(APP_THEME_CACHE_KEY) || "null") as {
        data?: Partial<AdminThemeConfig>;
      } | null;
      if (parsed?.data) {
        return normalizeAppTheme(parsed.data, fallbackAppTheme);
      }
    } catch {
    }
  }

  if (initialAdminTheme) {
    return normalizeAppTheme(initialAdminTheme as Partial<AdminThemeConfig>, fallbackAppTheme);
  }

  return fallbackAppTheme;
}

function readInitialThemeSnapshot(initialAdminTheme?: unknown): ThemeSnapshot {
  const adminTheme = readCachedGlobalTheme(initialAdminTheme);
  const mode = readStoredMode();

  return {
    mode,
    style: adminTheme.style,
    adminTheme,
  };
}

function persistThemeSnapshot(snapshot: Pick<ThemeSnapshot, "mode">, vars: React.CSSProperties) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("theme-mode", snapshot.mode);
    localStorage.setItem(THEME_STATE_STORAGE_KEY, JSON.stringify({ mode: snapshot.mode }));
    localStorage.setItem(THEME_CSS_VARS_STORAGE_KEY, JSON.stringify(vars));
  } catch {
  }
}

function applyThemeSnapshot(snapshot: ThemeSnapshot) {
  const nextTheme = createTheme(
    {
      mode: snapshot.mode,
      source: "developer",
      adminActive: true,
      style: snapshot.style,
    },
    snapshot.adminTheme
  );
  const vars = generateCSSVariables(nextTheme);

  applyCSSVariables(vars as Record<string, string>);
  document.documentElement.classList.toggle("dark", snapshot.mode === "dark");
  persistThemeSnapshot(snapshot, vars);
}

export function ThemeProvider({
  children,
  initialAdminTheme,
}: {
  children: React.ReactNode;
  initialAdminTheme?: unknown;
}) {
  const hydratedThemeRef = useRef(false);
  const skipThemeStateApplyRef = useRef(true);
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [style, setStyle] = useState<ThemeStyle>(fallbackAppTheme.style);
  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(fallbackAppTheme);

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
    const snapshot = readInitialThemeSnapshot(initialAdminTheme);
    setModeState(snapshot.mode);
    setStyle(snapshot.style);
    setAdminTheme(snapshot.adminTheme);
    applyThemeSnapshot(snapshot);
    hydratedThemeRef.current = true;
    skipThemeStateApplyRef.current = true;
  }, [initialAdminTheme]);

  useLayoutEffect(() => {
    if (skipThemeStateApplyRef.current) {
      skipThemeStateApplyRef.current = false;
      return;
    }

    if (!hydratedThemeRef.current) return;

    const vars = generateCSSVariables(theme);
    applyCSSVariables(vars as Record<string, string>);
    document.documentElement.classList.toggle("dark", mode === "dark");
    persistThemeSnapshot({ mode }, vars);
  }, [adminTheme, mode, style, theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "theme-mode" || event.key === THEME_STATE_STORAGE_KEY) {
        setModeState(readStoredMode());
        return;
      }

      if (event.key === APP_THEME_CACHE_KEY) {
        const nextAdminTheme = readCachedGlobalTheme();
        setAdminTheme(nextAdminTheme);
        setStyle(nextAdminTheme.style);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateAdminTheme = useCallback(async (next: Partial<AdminThemeConfig>) => {
    const prev = adminTheme;
    const prevStyle = style;
    const optimistic = normalizeAppTheme({ ...prev, ...next }, prev);
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
