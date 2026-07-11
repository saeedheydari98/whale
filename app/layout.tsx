import localFont from "next/font/local";
import { ThemeProvider } from "./design-system/theme/provider";
import { AppHeader } from "./design-system/components/layout/app-header";
import "./globals.css";
import { AppFooter } from "./design-system/components/layout/app-footer";
import { ProductsCatalogProvider } from "@/lib/products-catalog-context";
import { CatalogQueryProvider } from "@/lib/catalog-query-provider";
import { AppGlobalProvider } from "@/lib/app-global-context";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={storeFont.variable}>
      <body className="flex flex-col min-h-screen text-right" dir="rtl">
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
