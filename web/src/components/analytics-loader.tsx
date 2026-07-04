"use client";

import dynamic from "next/dynamic";

// 延遲加載 AnalyticsProvider 到 hydration 後
// 避免 GA/GTM/FB Pixel 阻塞初始 bundle
const AnalyticsProvider = dynamic(
  () => import("./analytics-provider").then((m) => m.AnalyticsProvider),
  { ssr: false }
);

/**
 * 客戶端 Analytics 包裝組件
 * 用於在 layout.tsx（Server Component）中安全地延遲加載 Analytics
 */
export function AnalyticsLoader() {
  return <AnalyticsProvider />;
}
