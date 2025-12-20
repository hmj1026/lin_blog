"use client";

import { useTheme } from "./theme-provider";
import { useState, useEffect } from "react";

/**
 * 主題切換按鈕
 * 顯示當前主題並提供切換功能
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 在 SSR 階段顯示 placeholder
  if (!mounted) {
    return (
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white dark:border-base-600 dark:bg-base-800"
        aria-hidden="true"
      />
    );
  }

  return <ThemeToggleInner />;
}

function ThemeToggleInner() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    const themes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-primary transition hover:border-primary/40 dark:border-base-600 dark:bg-base-800 dark:text-white"
      aria-label={`切換主題 (目前：${theme})`}
      title={`目前：${theme} / 顯示：${resolvedTheme}`}
    >
      {resolvedTheme === "light" ? (
        // 太陽圖示
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // 月亮圖示
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
