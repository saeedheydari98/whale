"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { applyCSSVariables } from "./engine";
import { generateCSSVariables } from "./css-vars";
import { createTheme, resolveDynamicColor, ThemeColorKey, ThemeStyle, ThemeTone } from "./theme";

type ThemeMode = "light" | "dark";
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
  style: ThemeStyle;
  setMode: (mode: ThemeMode) => void;
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

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const savedMode = localStorage.getItem("theme-mode");
    return savedMode === "dark" ? "dark" : "light";
  });
  const [style, setStyle] = useState<ThemeStyle>(() => {
    if (typeof window === "undefined") return "light";
    const savedStyle = localStorage.getItem("theme-style");
    return savedStyle === "dark" || savedStyle === "fantasy" ? savedStyle : "light";
  });
  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(defaultAdminTheme);
  const [userTheme, setUserTheme] = useState<UserThemeConfig>(() => {
    if (typeof window === "undefined") return defaultUserTheme;
    const saved = localStorage.getItem("theme-user");
    if (!saved) return defaultUserTheme;

    try {
      return {
        ...defaultUserTheme,
        ...(JSON.parse(saved) as Partial<UserThemeConfig>),
      };
    } catch {
      return defaultUserTheme;
    }
  });

  const theme = createTheme({
    mode,
    source: "developer",
    adminActive: true,
    style,
  }, adminTheme, userTheme);

  useEffect(() => {
    localStorage.setItem("theme-mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("theme-style", style);
  }, [style]);

  useEffect(() => {
    localStorage.setItem("theme-user", JSON.stringify(userTheme));
  }, [userTheme]);

  useEffect(() => {
    const vars = generateCSSVariables(theme);
    applyCSSVariables(vars as Record<string, string>);
  }, [theme]);

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

  useEffect(() => {
    const loadAdminTheme = async () => {
      try {
        const res = await fetch("/api/theme/admin", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as Partial<AdminThemeConfig>;
        setAdminTheme((prev) => ({
          ...prev,
          ...data,
        }));
      } catch {
        setAdminTheme(defaultAdminTheme);
      }
    };

    loadAdminTheme();
  }, []);

  const updateUserTheme = (next: Partial<UserThemeConfig>) => {
    setUserTheme((prev) => ({
      ...prev,
      ...next,
    }));
  };

  const updateAdminTheme = async (next: Partial<AdminThemeConfig>) => {
    const optimistic = {
      ...adminTheme,
      ...next,
    };
    setAdminTheme(optimistic);

    try {
      await fetch("/api/theme/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(optimistic),
      });
    } catch {
      setAdminTheme(defaultAdminTheme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        style,
        setMode,
        setStyle,
        adminTheme,
        userTheme,
        updateAdminTheme,
        updateUserTheme,
        theme,
      }}
    >
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