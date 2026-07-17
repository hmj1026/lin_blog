"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  ReactNode,
} from "react";

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

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function subscribeToDarkMedia(onChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

const getPrefersDark = () => window.matchMedia(DARK_MEDIA_QUERY).matches;
const getServerPrefersDark = () => false;

function readStoredTheme(storageKey: string): Theme | null {
  const stored = localStorage.getItem(storageKey) as Theme | null;
  return stored && ["light", "dark", "system"].includes(stored) ? stored : null;
}

const getThemeChangeEventName = (storageKey: string) =>
  `lin-blog:theme-change:${storageKey}`;

function subscribeToStoredTheme(storageKey: string, onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) onChange();
  };
  const eventName = getThemeChangeEventName(storageKey);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(eventName, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(eventName, onChange);
  };
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const subscribeToTheme = useCallback(
    (onChange: () => void) => subscribeToStoredTheme(storageKey, onChange),
    [storageKey]
  );
  const getTheme = useCallback(
    () => readStoredTheme(storageKey) ?? defaultTheme,
    [defaultTheme, storageKey]
  );
  const getServerTheme = useCallback(() => defaultTheme, [defaultTheme]);
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);

  // 系統偏好以 external store 訂閱：media query 變化直接觸發 re-render，
  // resolvedTheme 由 render 期推導，不再需要 effect 內 setState
  const prefersDark = useSyncExternalStore(
    subscribeToDarkMedia,
    getPrefersDark,
    getServerPrefersDark
  );

  const resolvedTheme: "light" | "dark" = theme === "system"
    ? prefersDark
      ? "dark"
      : "light"
    : theme;

  // 更新 <html> class（純副作用，無 setState）
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    window.dispatchEvent(new Event(getThemeChangeEventName(storageKey)));
  };

  // Provider 必須無條件渲染：若以 mounted 條件在 Fragment 與 Provider 之間
  // 切換，mounted 翻轉時該位置的元素型別改變，React reconciliation 會把
  // children 整棵卸載重建 —— 等同每次 hydration 後丟棄全頁 SSR DOM（body 以下
  // 全部 remount），除了浪費 SSR 成果、造成閃爍外，raw-html iframe 也會
  // detach/reattach 重載，E2E 對 iframe 的互動若跨越該時窗會以
  // "Unable to adopt element handle from a different document" 間歇性失敗。
  // Provider 本身不輸出任何 DOM，SSR 渲染它不會造成 hydration mismatch；
  // 主題解析仍在 hydration 完成後才寫入 <html> class。
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
