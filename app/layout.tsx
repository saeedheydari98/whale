import localFont from "next/font/local";
import Script from "next/script";
import { ThemeProvider } from "./design-system/theme/provider";
import { AppHeader } from "./design-system/components/layout/app-header";
import "./globals.css";
import { AppFooter } from "./design-system/components/layout/app-footer";
import { ProductsCatalogProvider } from "@/lib/products-catalog-context";
import { CatalogQueryProvider } from "@/lib/catalog-query-provider";
import { AppGlobalProvider } from "@/lib/app-global-context";
import { createTheme } from "./design-system/theme/theme";
import { generateCSSVariables } from "./design-system/theme/css-vars";
import { palette } from "./design-system/theme/palette";
import { THEME_CSS_VARS_STORAGE_KEY } from "./design-system/theme/storage";
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

const initialThemeScript = `!function(){try{var root=document.documentElement;var raw=localStorage.getItem(${JSON.stringify(THEME_CSS_VARS_STORAGE_KEY)});var applied=false;if(raw){var vars=JSON.parse(raw);for(var key in vars){if(Object.prototype.hasOwnProperty.call(vars,key)){root.style.setProperty(key,String(vars[key]));applied=true;}}}var legacy=localStorage.getItem("theme-mode");var mode=legacy==="dark"?"dark":"light";if(legacy==="dark"||legacy==="light"){root.classList.toggle("dark",mode==="dark");}if(!applied){var cached=JSON.parse(localStorage.getItem("app-global:v1")||"null");var theme=cached&&cached.data&&cached.data.theme?cached.data.theme:null;var colors=${JSON.stringify(palette)};var primary=theme&&colors[theme.primary]?theme.primary:"gray";var style=theme&&colors[primary][theme.style]?theme.style:"light";var scale=colors[primary][style];var dark=mode==="dark";var set=function(key,value){root.style.setProperty(key,value)};var action=scale[500];var base=scale[dark?950:50];var text=scale[dark?50:950];var muted=scale[dark?200:800];var subtle=scale[dark?300:700];var bg=scale[dark?900:100];var card=scale[dark?800:200];var media=scale[dark?700:300];var border=scale[500];set("--primary",action);set("--ui-primary",action);set("--primary-border",border);set("--primary-base",base);set("--primary-bg",bg);set("--primary-card",card);set("--primary-media",media);set("--primary-text",text);set("--primary-muted",muted);set("--primary-subtle",subtle);set("--bg-base",base);set("--bg-surface",bg);set("--border-default",border);set("--text-primary",text);set("--text-secondary",muted);set("--text-muted",subtle);set("--body-text",text);set("--body-text-muted",muted);set("--body-text-subtle",subtle);}}catch(error){}}();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={storeFont.variable} style={initialThemeVariables} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen text-right" dir="rtl">
        <ThemeProvider>
          <AppNotificationProvider>
            <CatalogQueryProvider>
              <AppGlobalProvider>
                <ProductsCatalogProvider>
                  <AppHeader />
                  <main className="flex-1 pb-14 md:pb-0">
                    {children}
                  </main>
                  <AppFooter />
                </ProductsCatalogProvider>
              </AppGlobalProvider>
            </CatalogQueryProvider>
          </AppNotificationProvider>
        </ThemeProvider>
        <Script
          id="initial-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: initialThemeScript }}
        />
      </body>
    </html>
  );
}
