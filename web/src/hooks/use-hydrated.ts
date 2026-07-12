"use client";

import { useEffect, useState } from "react";

/**
 * 回傳 client-side hydration 是否完成。
 *
 * SSR 與首次 client render 皆為 false（無 hydration mismatch），useEffect
 * 嚴格在 React 附掛事件 handler 之後執行才翻成 true。互動元件（表單輸入、
 * 送出按鈕）以 `disabled={!hydrated}` 做 hydration gate：掛載完成前的點擊
 * 不會觸發原生表單行為，controlled input 也不會在 onChange 附掛前被寫值
 * （Playwright 的 actionability 等待會自動等到 enabled 才互動）。
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
