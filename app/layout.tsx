import localFont from "next/font/local";
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
import { THEME_CSS_VARS_STORAGE_KEY, THEME_STATE_STORAGE_KEY } from "./design-system/theme/storage";
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
    var vars = JSON.parse(localStorage.getItem("${THEME_CSS_VARS_STORAGE_KEY}") || "{}");
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach(function(key) {
        root.style.setProperty(key, String(vars[key]));
      });
    }
    var state = JSON.parse(localStorage.getItem("${THEME_STATE_STORAGE_KEY}") || "{}");
    var mode = state && state.mode ? state.mode : localStorage.getItem("theme-mode");
    root.classList.toggle("dark", mode === "dark");
  } catch (error) {}
})();
`;

function InlineThemeScript() {
  return (
    <script
      type="text/javascript"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: initialThemeScript }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={storeFont.variable} style={initialThemeVariables} suppressHydrationWarning>
      <head>
        <InlineThemeScript />
      </head>
      <body className="flex flex-col min-h-screen text-right" dir="rtl">
        <AppThemeProvider>
          <AppUserProvider>
            <AppNotificationProvider>
              <CatalogQueryProvider>
                <ProductsCatalogProvider>
                  <AppHeader />
                  <main className="flex-1 pb-14 md:pb-0">
                    {children}
                  </main>
                  <AppFooter />
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
