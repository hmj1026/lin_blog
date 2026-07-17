"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * 回傳 client-side hydration 是否完成。
 *
 * SSR 與 hydration render 讀 getServerSnapshot（false），hydration 完成後
 * React 以 getSnapshot（true）重新 render——時序上仍嚴格在事件 handler
 * 附掛之後才翻成 true，與原 useEffect + setState 寫法契約相同。互動元件
 * （表單輸入、送出按鈕）以 `disabled={!hydrated}` 做 hydration gate：
 * 掛載完成前的點擊不會觸發原生表單行為，controlled input 也不會在
 * onChange 附掛前被寫值（Playwright actionability 會自動等到 enabled）。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}
