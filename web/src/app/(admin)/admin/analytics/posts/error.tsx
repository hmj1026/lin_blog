"use client";

import { AdminFeedback } from "@/components/admin/admin-feedback";

/** 在文章統計 route 失敗時提供可讀取且可重試的錯誤狀態。 */
export default function AdminAnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;

  return (
    <AdminFeedback
      tone="error"
      message="無法載入文章統計，請稍後再試。"
      retryLabel="重新載入"
      onRetry={reset}
    />
  );
}
