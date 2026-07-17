"use client";

import { useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";

/**
 * 開發環境專用工具列
 * 僅在 APP_ENV !== "production" 時顯示
 * 顯示當前環境資訊，方便開發時快速識別
 */
export function DevToolbar() {
  const [isMinimized, setIsMinimized] = useState(false);
  // 僅在 client 掛載完成後顯示（維持原 effect 寫法的時序），環境判斷用
  // build-time 內嵌的 NEXT_PUBLIC_* 變數，server/client 一致
  const hydrated = useHydrated();

  const envVisible =
    (process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV) !== "production";
  if (!hydrated || !envVisible) return null;

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "local";
  const nodeEnv = process.env.NODE_ENV || "development";

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-lg shadow-lg transition hover:bg-yellow-300"
        title="展開開發工具列"
      >
        🛠️
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-yellow-400 bg-yellow-100 p-3 text-xs shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="font-bold text-yellow-800">🛠️ DEV MODE</span>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-yellow-600 hover:text-yellow-800"
          title="最小化"
        >
          ✕
        </button>
      </div>
      <div className="space-y-1 text-yellow-700">
        <div>
          <span className="font-semibold">APP_ENV:</span> {appEnv}
        </div>
        <div>
          <span className="font-semibold">NODE_ENV:</span> {nodeEnv}
        </div>
      </div>
    </div>
  );
}
