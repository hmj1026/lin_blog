import type { Metadata } from "next";
import { Inter, Sen } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const display = Sen({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700"],
  display: "swap",
});

import { getSiteUrl } from "@/lib/utils/url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Lin Blog | 內容策略、設計與社群洞察",
  description: "以社群為核心的繁體中文部落格，分享內容策略、設計實務、Newsletter 與社群營運心法。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} bg-base-50 antialiased`}>
        <ThemeProvider defaultTheme="system" storageKey="lin-blog-theme">
          {children}
          <AnalyticsProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
