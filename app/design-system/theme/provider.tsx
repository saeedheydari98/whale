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
import {
  APP_THEME_STORAGE_KEY,
  DEVICE_THEME_MODE_STORAGE_KEY,
  THEME_CSS_VARS_STORAGE_KEY,
  THEME_STATE_STORAGE_KEY,
} from "./storage";
import {
  fallbackAppTheme,
  normalizeAppTheme,
  saveAppTheme,
  type AppThemeData,
} from "@/lib/app-theme-client";
import {
  APP_USER_UPDATED_EVENT,
  readCachedAppUser,
  saveAppUserThemeMode,
} from "@/lib/app-user-client";

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

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const cachedUser = readCachedAppUser({ allowStale: true });
  if (cachedUser?.user) return cachedUser.user.themeMode;

  try {
    const deviceMode = localStorage.getItem(DEVICE_THEME_MODE_STORAGE_KEY);
    if (isThemeMode(deviceMode)) return deviceMode;
  } catch {
  }

  return "light";
}

function readCachedGlobalTheme(initialAdminTheme?: unknown): AdminThemeConfig {
  if (typeof window !== "undefined") {
    try {
      const parsed = JSON.parse(localStorage.getItem(APP_THEME_STORAGE_KEY) || "null") as {
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
  applyToDocument = true,
  onDocumentApplied,
}: {
  children: React.ReactNode;
  initialAdminTheme?: unknown;
  applyToDocument?: boolean;
  onDocumentApplied?: () => void;
}) {
  const hydratedThemeRef = useRef(false);
  const skipThemeStateApplyRef = useRef(true);
  const [mode, setModeState] = useState<ThemeMode>("light");
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
    if (!applyToDocument) return;
    applyThemeSnapshot(snapshot);
    hydratedThemeRef.current = true;
    skipThemeStateApplyRef.current = true;
    onDocumentApplied?.();
  }, [applyToDocument, initialAdminTheme, onDocumentApplied]);

  useLayoutEffect(() => {
    if (skipThemeStateApplyRef.current) {
      skipThemeStateApplyRef.current = false;
      return;
    }

    if (!applyToDocument || !hydratedThemeRef.current) return;

    const vars = generateCSSVariables(theme);
    applyCSSVariables(vars as Record<string, string>);
    document.documentElement.classList.toggle("dark", mode === "dark");
    persistThemeSnapshot({ mode }, vars);
  }, [adminTheme, applyToDocument, mode, style, theme]);

  useEffect(() => {
    const syncUserMode = () => setModeState(readStoredMode());
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === DEVICE_THEME_MODE_STORAGE_KEY
        || event.key === "theme-mode"
        || event.key === THEME_STATE_STORAGE_KEY
      ) {
        setModeState(readStoredMode());
        return;
      }

      if (event.key === APP_THEME_STORAGE_KEY) {
        const nextAdminTheme = readCachedGlobalTheme();
        setAdminTheme(nextAdminTheme);
        setStyle(nextAdminTheme.style);
      }

      if (event.key === "app-user:v1") syncUserMode();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(APP_USER_UPDATED_EVENT, syncUserMode);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(APP_USER_UPDATED_EVENT, syncUserMode);
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
    const cachedUser = readCachedAppUser({ allowStale: true });

    if (cachedUser?.user) {
      void saveAppUserThemeMode(next).catch((error) => {
        console.error("Failed to save user theme mode:", error);
      });
      return;
    }

    try {
      localStorage.setItem(DEVICE_THEME_MODE_STORAGE_KEY, next);
    } catch {
    }
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
