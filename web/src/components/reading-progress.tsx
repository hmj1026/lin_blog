"use client";

import { useEffect, useState } from "react";

/**
 * 閱讀進度條元件
 * 顯示在頁面頂部，反映當前閱讀進度
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollProgress)));
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-base-100">
      <div
        className="h-full bg-gradient-to-r from-primary to-accent-500 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
