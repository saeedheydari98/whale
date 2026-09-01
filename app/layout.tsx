import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";
import type { Metadata } from "next";
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
import Loading, { RouteLoadingController } from "./design-system/components/loading/loading";
import { JsonLd } from "./design-system/components/seo/json-ld";
import { breadcrumbJsonLd, DEFAULT_HOME_DESCRIPTION, organizationJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { SITE_NAME, siteUrl } from "@/lib/site";

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
    if (hasFreshTheme && variableKeys.length > 0) {
      variableKeys.forEach(function(key) {
        root.style.setProperty(key, String(vars[key]));
      });
      /* Colors only. Do not set data-theme-ready here: the HTML whale must cover
         the shell until React takes over, already painted in cached theme colors. */
      root.setAttribute("data-theme-color-ready", "true");
    }
    var mode = cachedUser
      ? (cachedUser.themeMode === "dark" ? "dark" : "light")
      : localStorage.getItem("${DEVICE_THEME_MODE_STORAGE_KEY}");
    if (mode !== "dark") mode = "light";
    root.classList.toggle("dark", mode === "dark");
  } catch (error) {}
})();
`;

const homeMetadata = pageMetadata({
  title: SITE_NAME,
  description: DEFAULT_HOME_DESCRIPTION,
  path: "/",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  ...homeMetadata,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={storeFont.variable}
      style={initialThemeVariables}
      data-theme-color-ready="false"
      data-theme-ready="false"
      suppressHydrationWarning
    >
      <body className="h-[100dvh] overflow-hidden bg-primary-base text-right" dir="rtl">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <JsonLd data={breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }])} />
        <style
          dangerouslySetInnerHTML={{
            __html: 'html[data-theme-color-ready="false"] [data-theme-boot-loader],html[data-theme-color-ready="false"] .whale-loader-surface{visibility:hidden!important}html[data-theme-color-ready="false"],html[data-theme-color-ready="false"] body{background-color:transparent!important}',
          }}
        />
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {initialThemeScript}
        </Script>
        <div
          data-theme-boot-loader
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[10000] flex min-h-[100dvh] w-screen flex-col items-center justify-center gap-4"
        >
          <GiSpermWhale aria-label="وال" className="whale-loader-icon h-24 w-24" />
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="theme-boot-dot whale-loader-dot h-2 w-2 rounded-full" />
            <span className="theme-boot-dot whale-loader-dot h-2 w-2 rounded-full" />
            <span className="theme-boot-dot whale-loader-dot h-2 w-2 rounded-full" />
          </div>
        </div>
        <Suspense fallback={<Loading loading="fullscreen" />}>
          <RouteLoadingController />
        </Suspense>
        <AppThemeProvider>
          <AppUserProvider>
            <AppNotificationProvider>
              <CatalogQueryProvider>
                <ProductsCatalogProvider>
                  <div data-app-shell className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-primary-base text-primary-text">
                    <div data-app-scroll-container className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                      <AppHeader />
                      <main data-app-content className="flex grow shrink-0 flex-col pb-14 md:pb-0">
                        {children}
                      </main>
                      <AppFooter />
                    </div>
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
