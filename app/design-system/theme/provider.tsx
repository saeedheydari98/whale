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
  readUserProfile,
  saveUserProfile,
  USER_PROFILE_UPDATED_EVENT,
  writeUserProfile,
} from "@/lib/user-profile";
import { fetchAppGlobal, readCachedAppGlobal } from "@/lib/app-global-client";
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

function readProfileThemeMode(user: { profile?: unknown } | null | undefined) {
  const profile = user?.profile && typeof user.profile === "object"
    ? user.profile as { themeMode?: unknown }
    : null;
  return profile?.themeMode === "dark" || profile?.themeMode === "light"
    ? profile.themeMode
    : null;
}

function readInitialAdminTheme() {
  if (typeof window === "undefined") return defaultAdminTheme;
  return normalizeAdminTheme(readCachedAppGlobal()?.theme, defaultAdminTheme);
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const profileMode = readUserProfile()?.themeMode;
    if (profileMode === "light" || profileMode === "dark") return profileMode;
    const legacy = localStorage.getItem("theme-mode");
    if (legacy === "light" || legacy === "dark") return legacy;
    return "light";
  });

  const [style, setStyle] = useState<ThemeStyle>(() => {
    if (typeof window === "undefined") return "light";
    const savedStyle = localStorage.getItem("theme-style");
    return savedStyle === "dark" || savedStyle === "fantasy" ? savedStyle : "light";
  });

  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(() => {
    return readInitialAdminTheme();
  });

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

  useEffect(() => {
    localStorage.setItem("theme-mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("theme-style", style);
  }, [style]);

  useLayoutEffect(() => {
    const vars = generateCSSVariables(theme);
    applyCSSVariables(vars as Record<string, string>);
    try {
      localStorage.setItem(THEME_CSS_VARS_STORAGE_KEY, JSON.stringify(vars));
    } catch {
    }
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    const loadThemes = async () => {
      try {
        const globalData = await fetchAppGlobal();
        if (cancelled) return;
        setAdminTheme((current) => ({
          ...current,
          ...normalizeAdminTheme(
            readThemePayload({ data: { theme: globalData.theme } }, defaultAdminTheme),
            defaultAdminTheme
          ),
        }));
        const profileMode = readProfileThemeMode(globalData.user) ?? readUserProfile()?.themeMode;
        if (!cancelled && (profileMode === "light" || profileMode === "dark")) {
          setModeState(profileMode);
        }
      } catch (error) {
        console.error("Failed to load theme API settings:", error);
      }
    };

    void loadThemes();
    const reloadThemes = () => void loadThemes();
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, reloadThemes);

    return () => {
      cancelled = true;
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, reloadThemes);
    };
  }, []);

  const updateAdminTheme = useCallback(async (next: Partial<AdminThemeConfig>) => {
    const prev = adminTheme;
    const optimistic = { ...prev, ...next };
    setAdminTheme(optimistic);

    try {
      const res = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      });
      if (!res.ok) throw new Error("Request failed");
    } catch (error) {
      console.error("Failed to update admin theme:", error);
      setAdminTheme(prev);
    }
  }, [adminTheme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    const profile = readUserProfile();
    if (!profile) return;

    const nextProfile = { ...profile, themeMode: next };
    writeUserProfile(nextProfile);
    void saveUserProfile(nextProfile).catch((error) => {
      console.error("Failed to save profile theme mode:", error);
    });
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
