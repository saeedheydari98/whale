import { ThemeProvider } from "./design-system/theme/provider";
import { AppHeader } from "./design-system/components/app-header";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AppHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}