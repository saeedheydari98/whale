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
import { createTheme, resolveDynamicColor, ThemeStyle, ThemeColorKey, ThemeTone } from "./theme";

type ThemeMode = "light" | "dark";
type ThemeModePreference = ThemeMode | "system";
type ThemeDensity = "compact" | "comfortable" | "spacious";

type AdminThemeConfig = {
  primary: ThemeColorKey;
  style: ThemeStyle;
  tone: ThemeTone;
};

type UserThemeConfig = {
  preferredColor: ThemeColorKey;
  style: ThemeStyle;
  tone: ThemeTone;
  density: ThemeDensity;
};

type ThemeContextType = {
  mode: ThemeMode;
  modePreference: ThemeModePreference;
  style: ThemeStyle;
  setMode: (mode: ThemeMode) => void;
  setModePreference: (pref: ThemeModePreference) => void;
  setStyle: (style: ThemeStyle) => void;
  adminTheme: AdminThemeConfig;
  userTheme: UserThemeConfig;
  updateAdminTheme: (next: Partial<AdminThemeConfig>) => Promise<void>;
  updateUserTheme: (next: Partial<UserThemeConfig>) => void;
  theme: ReturnType<typeof createTheme>;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const defaultAdminTheme: AdminThemeConfig = {
  primary: "yellow",
  style: "light",
  tone: 500,
};

const defaultUserTheme: UserThemeConfig = {
  preferredColor: "green",
  style: "light",
  tone: 500,
  density: "comfortable",
};

function readJsonFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [modePreference, setModePreference] = useState<ThemeModePreference>(() => {
    if (typeof window === "undefined") return "light";
    const savedPref = localStorage.getItem("theme-mode-pref");
    if (savedPref === "light" || savedPref === "dark" || savedPref === "system") {
      return savedPref;
    }

    // Backward compat: if old key exists, treat it as manual preference.
    const legacy = localStorage.getItem("theme-mode");
    if (legacy === "light" || legacy === "dark") return legacy;

    return "system";
  });

  const [systemMode, setSystemMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)") as
      | MediaQueryList
      | undefined;
    if (!media) return;

    const update = () => setSystemMode(media.matches ? "dark" : "light");
    update();

    // Safari uses addListener/removeListener
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    if (typeof (media as any).addListener === "function") {
      (media as any).addListener(update);
      return () => (media as any).removeListener(update);
    }
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const mode: ThemeMode = modePreference === "system" ? systemMode : modePreference;

  const [style, setStyle] = useState<ThemeStyle>(() => {
    if (typeof window === "undefined") return "light";
    const savedStyle = localStorage.getItem("theme-style");
    return savedStyle === "dark" || savedStyle === "fantasy" ? savedStyle : "light";
  });

  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(() => {
    if (typeof window === "undefined") return defaultAdminTheme;
    const saved = readJsonFromStorage<Partial<AdminThemeConfig>>("theme-admin");
    return { ...defaultAdminTheme, ...(saved ?? {}) };
  });

  const [userTheme, setUserTheme] = useState<UserThemeConfig>(() => {
    if (typeof window === "undefined") return defaultUserTheme;
    const saved = readJsonFromStorage<Partial<UserThemeConfig>>("theme-user");
    return { ...defaultUserTheme, ...(saved ?? {}) };
  });

  const adminThemeRef = useRef(adminTheme);
  adminThemeRef.current = adminTheme;

  const theme = useMemo(
    () =>
      createTheme(
        {
          mode,
          source: "developer",
          adminActive: true,
          style,
        },
        adminTheme,
        userTheme
      ),
    [mode, style, adminTheme, userTheme]
  );

  useEffect(() => {
    localStorage.setItem("theme-mode-pref", modePreference);
    // keep legacy key updated too
    localStorage.setItem("theme-mode", mode);
  }, [modePreference, mode]);

  useEffect(() => {
    localStorage.setItem("theme-style", style);
  }, [style]);

  useEffect(() => {
    localStorage.setItem("theme-admin", JSON.stringify(adminTheme));
  }, [adminTheme]);

  useEffect(() => {
    localStorage.setItem("theme-user", JSON.stringify(userTheme));
  }, [userTheme]);

  useLayoutEffect(() => {
    const vars = generateCSSVariables(theme);
    applyCSSVariables(vars as Record<string, string>);
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tokenRegex = /^(text|bg)-([a-z]+)-([a-z]+)-([a-z0-9]+)$/i;
    const applyTokenStyles = (root?: ParentNode) => {
      const base = root ?? document.body;
      const elements: Element[] = [];

      if (base instanceof Element) {
        elements.push(base, ...Array.from(base.querySelectorAll("*")));
      } else {
        elements.push(...Array.from(document.querySelectorAll("*")));
      }

      for (const element of elements) {
        const htmlElement = element as HTMLElement;

        for (const className of Array.from(htmlElement.classList)) {
          if (!tokenRegex.test(className)) continue;

          const color = resolveDynamicColor({
            token: className,
            state: theme.state,
            admin: theme.admin,
            user: theme.user,
          });

          if (className.startsWith("text-")) {
            htmlElement.style.setProperty("color", color);
          }

          if (className.startsWith("bg-")) {
            htmlElement.style.setProperty("background-color", color);
          }
        }
      }
    };

    applyTokenStyles();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          applyTokenStyles(mutation.target);
        }

        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              applyTokenStyles(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [theme]);

  const updateUserTheme = useCallback((next: Partial<UserThemeConfig>) => {
    setUserTheme((prev) => {
      const optimistic = { ...prev, ...next };
      return optimistic;
    });
  }, []);

  const updateAdminTheme = useCallback(async (next: Partial<AdminThemeConfig>) => {
    const prev = adminThemeRef.current;
    const optimistic = { ...prev, ...next };
    setAdminTheme(optimistic);

    try {
      const res = await fetch("/api/theme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      });
      if (!res.ok) throw new Error("Request failed");
    } catch (error) {
      console.error("Failed to update admin theme:", error);
      setAdminTheme(prev);
    }
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModePreference(next);
  }, []);

  const contextValue = useMemo(
    () => ({
      mode,
      modePreference,
      setModePreference,
      style,
      setMode,
      setStyle,
      adminTheme,
      userTheme,
      updateAdminTheme,
      updateUserTheme,
      theme,
    }),
    [
      mode,
      modePreference,
      setModePreference,
      style,
      setMode,
      adminTheme,
      userTheme,
      updateAdminTheme,
      updateUserTheme,
      theme,
    ]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {isHydrated ? children : null}
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
