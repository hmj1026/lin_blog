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

// 使用 generateMetadata 函數確保 metadataBase 在 runtime 動態評估
// （避免 build time 靜態編譯導致使用 Dockerfile 預設值）
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: "Lin Blog | 內容策略、設計與社群洞察",
    description: "以社群為核心的繁體中文部落格，分享內容策略、設計實務、Newsletter 與社群營運心法。",
  };
}

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
