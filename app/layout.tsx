import localFont from "next/font/local";
import Script from "next/script";
import { GiSpermWhale } from "react-icons/gi";
import { AppHeader } from "./design-system/components/layout/app-header";
import "./globals.css";
import { AppFooter } from "./design-system/components/layout/app-footer";
import { AdminPanelFloatButton } from "./design-system/components/layout/admin-panel-float-button";
import { ProductsCatalogProvider } from "@/lib/products-catalog-context";
import { CatalogQueryProvider } from "@/lib/catalog-query-provider";
import { AppUserProvider } from "@/lib/app-user-context";
import { AppThemeProvider } from "@/lib/app-theme-provider";
import { createTheme } from "./design-system/theme/theme";
import { generateCSSVariables } from "./design-system/theme/css-vars";
import {
  APP_THEME_CACHE_TTL_MS,
  APP_THEME_STORAGE_KEY,
  DEVICE_THEME_MODE_STORAGE_KEY,
  THEME_CSS_VARS_STORAGE_KEY,
} from "./design-system/theme/storage";
import { AppNotificationProvider } from "./design-system/components/feedback/notification-provider";

const storeFont = localFont({
  variable: "--font-store",
  display: "swap",
  src: [
    { path: "./design-system/fonts/PelakFA-light.woff", weight: "300", style: "normal" },
    { path: "./design-system/fonts/PelakFA-Regular.woff", weight: "400", style: "normal" },
    { path: "./design-system/fonts/PelakFA-Medium.woff", weight: "500", style: "normal" },
    { path: "./design-system/fonts/PelakFA-SemiBold.woff", weight: "600", style: "normal" },
    { path: "./design-system/fonts/PelakFA-Bold.woff", weight: "700", style: "normal" },
    { path: "./design-system/fonts/PelakFA-ExtraBold.woff", weight: "800", style: "normal" },
  ],
});

const initialThemeVariables = generateCSSVariables(
  createTheme(
    {
      mode: "light",
      source: "developer",
      adminActive: true,
      style: "light",
    },
    {
      primary: "gray",
      style: "light",
    }
  )
);

const initialThemeScript = `
(function() {
  try {
    var root = document.documentElement;
    var userCache = JSON.parse(localStorage.getItem("app-user:v1") || "null");
    var cachedUser = userCache && userCache.data && userCache.data.user;
    var themeCache = JSON.parse(localStorage.getItem("${APP_THEME_STORAGE_KEY}") || "null");
    var vars = JSON.parse(localStorage.getItem("${THEME_CSS_VARS_STORAGE_KEY}") || "{}");
    var variableKeys = vars && typeof vars === "object" ? Object.keys(vars) : [];
    var themeCacheAge = themeCache && Number(themeCache.at) ? Date.now() - Number(themeCache.at) : Infinity;
    var hasFreshTheme = themeCacheAge >= 0 && themeCacheAge < ${APP_THEME_CACHE_TTL_MS};
    if (variableKeys.length > 0) {
      variableKeys.forEach(function(key) {
        root.style.setProperty(key, String(vars[key]));
      });
      if (hasFreshTheme) root.setAttribute("data-theme-ready", "true");
    }
    var mode = cachedUser
      ? (cachedUser.themeMode === "dark" ? "dark" : "light")
      : localStorage.getItem("${DEVICE_THEME_MODE_STORAGE_KEY}");
    if (mode !== "dark") mode = "light";
    root.classList.toggle("dark", mode === "dark");
  } catch (error) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={storeFont.variable} style={initialThemeVariables} data-theme-ready="false" suppressHydrationWarning>
      <body className="h-[100dvh] overflow-hidden bg-primary-base text-right" dir="rtl">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {initialThemeScript}
        </Script>
        <div
          data-theme-boot-loader
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[10000] min-h-[100dvh] w-screen flex-col items-center justify-center gap-4"
        >
          <GiSpermWhale aria-label="وال" className="whale-loader-icon h-24 w-24" />
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="theme-boot-dot whale-loader-dot h-2 w-2 rounded-full" />
            <span className="theme-boot-dot whale-loader-dot h-2 w-2 rounded-full" />
            <span className="theme-boot-dot whale-loader-dot h-2 w-2 rounded-full" />
          </div>
        </div>
        <AppThemeProvider>
          <AppUserProvider>
            <AppNotificationProvider>
              <CatalogQueryProvider>
                <ProductsCatalogProvider>
                  <div data-app-shell className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-primary-base text-primary-text">
                    <main data-app-scroll-container className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-14 md:pb-0">
                      <AppHeader />
                      {children}
                      <AppFooter />
                    </main>
                  </div>
                  <AdminPanelFloatButton />
                </ProductsCatalogProvider>
              </CatalogQueryProvider>
            </AppNotificationProvider>
          </AppUserProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
