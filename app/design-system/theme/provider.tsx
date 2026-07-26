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
} from "@/lib/app-global-client";
import { THEME_CSS_VARS_STORAGE_KEY, THEME_STATE_STORAGE_KEY } from "./storage";

type ThemeMode = "light" | "dark";

type AdminThemeConfig = {
  primary: ThemeColorKey;
  style: ThemeStyle;
};

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

const themeColors: readonly ThemeColorKey[] = ["green", "red", "blue", "yellow", "gray", "orange", "purple"];
const themeStyles: readonly ThemeStyle[] = ["light", "dark", "fantasy"];

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isThemeStyle(value: unknown): value is ThemeStyle {
  return themeStyles.includes(value as ThemeStyle);
}

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

function readInitialThemeSnapshot(): ThemeSnapshot {
  if (typeof window === "undefined") {
    return {
      mode: "light",
      style: defaultAdminTheme.style,
      adminTheme: defaultAdminTheme,
    };
  }

  const stored = readStoredThemeSnapshot();
  const storedAdminTheme = stored?.adminTheme
    ? normalizeAdminTheme(stored.adminTheme, defaultAdminTheme)
    : defaultAdminTheme;
  const legacyMode = localStorage.getItem("theme-mode");
  const legacyStyle = localStorage.getItem("theme-style");
  const mode = stored?.mode ?? (isThemeMode(legacyMode) ? legacyMode : "light");
  const style = stored?.style ?? storedAdminTheme.style ?? (isThemeStyle(legacyStyle) ? legacyStyle : defaultAdminTheme.style);
  const adminTheme = normalizeAdminTheme(
    {
      ...storedAdminTheme,
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

async function fetchPersistedAdminTheme() {
  try {
    const res = await fetch("/api/theme/admin", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || payload?.ok === false) return null;

    return normalizeAdminTheme(
      readThemePayload<AdminThemeConfig>(payload, defaultAdminTheme),
      defaultAdminTheme
    );
  } catch {
    return null;
  }
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initialThemeSnapshot] = useState(() => readInitialThemeSnapshot());
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
    const nextSnapshot = readInitialThemeSnapshot();
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
  }, []);

  useLayoutEffect(() => {
    const vars = generateCSSVariables(theme);
    applyCSSVariables(vars as Record<string, string>);
    document.documentElement.classList.toggle("dark", mode === "dark");
    persistThemeSnapshot({ mode, style, adminTheme }, vars);
  }, [adminTheme, mode, style, theme]);

  useEffect(() => {
    let cancelled = false;
    let requestId = 0;

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

    const syncPersistedTheme = () => {
      requestId += 1;
      const currentRequestId = requestId;

      void fetchPersistedAdminTheme().then((nextAdminTheme) => {
        if (!nextAdminTheme || cancelled || currentRequestId !== requestId) return;
        applyAdminTheme(nextAdminTheme);
      });
    };

    const syncThemes = () => {
      syncStoredTheme();
      syncPersistedTheme();
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
      syncThemes();
    };

    syncThemes();
    window.addEventListener(APP_GLOBAL_UPDATED_EVENT, syncPersistedTheme);
    window.addEventListener("storage", handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(APP_GLOBAL_UPDATED_EVENT, syncPersistedTheme);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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
