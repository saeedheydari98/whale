import { ThemeProvider } from "./design-system/theme/provider";
import { AppHeader } from "./design-system/components/latout/app-header";
import "./globals.css";
import { AppFooter } from "./design-system/components/latout/app-footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <ThemeProvider>
          <AppHeader />
          <main className="flex-1">
            {children}
          </main>
          <AppFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
