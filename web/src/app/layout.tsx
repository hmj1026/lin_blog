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
import { siteSettingsUseCases } from "@/modules/site-settings";

// 預設值（當資料庫未設定時使用）
const DEFAULT_SITE_NAME = "Lin Blog";
const DEFAULT_SITE_TAGLINE = "內容策略、設計與社群洞察";
const DEFAULT_SITE_DESCRIPTION = "以社群為核心的繁體中文部落格，分享內容策略、設計實務、Newsletter 與社群營運心法。";

// 使用 generateMetadata 函數確保 metadataBase 在 runtime 動態評估
// 並從資料庫讀取站點設定
export async function generateMetadata(): Promise<Metadata> {
  let settings;
  
  try {
    settings = await siteSettingsUseCases.getDefault();
  } catch (error) {
    // 忽略錯誤（例如 DB 連線失敗），使用預設值
    console.warn("Failed to fetch site settings for metadata:", error);
  }
  
  const siteName = settings?.siteName || DEFAULT_SITE_NAME;
  const tagline = settings?.siteTagline || DEFAULT_SITE_TAGLINE;
  const description = settings?.siteDescription || DEFAULT_SITE_DESCRIPTION;
  
  return {
    metadataBase: new URL(getSiteUrl()),
    title: `${siteName} | ${tagline}`,
    description,
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
