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
import { fetchCurrentUser } from "@/lib/auth-client";

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

function readThemePayload<T>(payload: unknown, fallback: T): T {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as { data?: { theme?: unknown } };
  return (record.data?.theme && typeof record.data.theme === "object"
    ? record.data.theme
    : fallback) as T;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasLoadedRemoteTheme, setHasLoadedRemoteTheme] = useState(false);
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const profileMode = readUserProfile()?.themeMode;
    if (profileMode === "light" || profileMode === "dark") return profileMode;
    const legacy = localStorage.getItem("theme-mode");
    if (legacy === "light" || legacy === "dark") return legacy;
    return "light";
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [style, setStyle] = useState<ThemeStyle>(() => {
    if (typeof window === "undefined") return "light";
    const savedStyle = localStorage.getItem("theme-style");
    return savedStyle === "dark" || savedStyle === "fantasy" ? savedStyle : "light";
  });

  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(() => {
    return defaultAdminTheme;
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
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    const loadThemes = async (markReady = false) => {
      try {
        const [nextAdminTheme] = await Promise.all([
          fetch("/api/admin/theme", { cache: "no-store" }).then((res) => res.json()),
        ]);
        if (cancelled) return;
        setAdminTheme((current) => ({
          ...current,
          ...readThemePayload(nextAdminTheme, defaultAdminTheme),
        }));
      } catch (error) {
        console.error("Failed to load theme API settings:", error);
      } finally {
        if (!cancelled && markReady) {
          await fetchCurrentUser();
          const profileMode = readUserProfile()?.themeMode;
          if (!cancelled && (profileMode === "light" || profileMode === "dark")) {
            setModeState(profileMode);
          }
          if (!cancelled) setHasLoadedRemoteTheme(true);
        }
      }
    };

    void loadThemes(true);
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
      {isHydrated && hasLoadedRemoteTheme ? children : null}
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
