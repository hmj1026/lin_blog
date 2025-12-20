"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 可在此記錄錯誤到監控服務
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">發生錯誤</h1>
            <p className="mt-2 text-sm text-gray-500">
              非常抱歉，頁面載入時發生問題。我們已記錄此錯誤。
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-gray-400">
                錯誤代碼：{error.digest}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              重新嘗試
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              回到首頁
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
