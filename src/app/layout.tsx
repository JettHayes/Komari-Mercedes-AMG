import type { Metadata } from "next";
import "@/global.css";
import { Providers } from "@/components/providers";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import RemainingValueCalculator from "@/components/RemainingValueCalculator";
import WelcomeBubble from "@/components/race/WelcomeBubble";
import DocumentTitleSync from "@/components/DocumentTitleSync";

// Komari server replaces these exact placeholders with site title/description.
// See: https://komari-document.pages.dev/dev/theme
export const metadata: Metadata = {
  title: "Komari Monitor",
  description: "A simple server monitor tool.",
  icons: {
    icon: [{ url: "/assets/Mercedes-Benz.png", type: "image/png" }],
    shortcut: ["/assets/Mercedes-Benz.png"],
    apple: [{ url: "/assets/Mercedes-Benz.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-dvh flex flex-col">
        <Providers>
          <DocumentTitleSync />
          <NavBar />
          <main className="flex-1 py-4 md:py-8">{children}</main>
          <Footer />
          <RemainingValueCalculator />
          <WelcomeBubble />
        </Providers>
      </body>
    </html>
  );
}
