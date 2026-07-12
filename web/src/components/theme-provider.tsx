"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // 讀取儲存的主題
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored);
    }
    setMounted(true);
  }, [storageKey]);

  // 解析實際主題並更新 DOM
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    const resolveTheme = (): "light" | "dark" => {
      if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return theme;
    };

    const resolved = resolveTheme();
    setResolvedTheme(resolved);

    // 更新 class
    root.classList.remove("light", "dark");
    root.classList.add(resolved);

    // 監聽系統主題變化
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const newResolved = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(newResolved);
        root.classList.remove("light", "dark");
        root.classList.add(newResolved);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  // Provider 必須無條件渲染：若以 mounted 條件在 Fragment 與 Provider 之間
  // 切換，mounted 翻轉時該位置的元素型別改變，React reconciliation 會把
  // children 整棵卸載重建 —— 等同每次 hydration 後丟棄全頁 SSR DOM（body 以下
  // 全部 remount），除了浪費 SSR 成果、造成閃爍外，raw-html iframe 也會
  // detach/reattach 重載，E2E 對 iframe 的互動若跨越該時窗會以
  // "Unable to adopt element handle from a different document" 間歇性失敗。
  // Provider 本身不輸出任何 DOM，SSR 渲染它不會造成 hydration mismatch；
  // 主題解析仍由上方 effect 於 mounted 後才寫入 <html> class。
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
