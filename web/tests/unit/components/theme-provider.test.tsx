import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { ThemeProvider, useTheme } from "@/components/theme-provider";

describe("ThemeProvider", () => {
  beforeEach(() => {
    // 此測試環境未提供 localStorage / matchMedia，補足 ThemeProvider effect 所需
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  it("mounts children exactly once across the hydration mounted flip (no full remount)", () => {
    // 回歸鎖定：Provider 必須無條件渲染。若以 mounted 條件在 Fragment 與
    // Provider 之間切換，mounted 翻轉時 children 會被整棵卸載重建（等同每次
    // hydration 後丟棄全頁 SSR DOM），此處以 mount effect 執行次數直接鎖定。
    const onMount = vi.fn();
    function MountProbe() {
      useEffect(() => {
        onMount();
      }, []);
      return <div data-testid="probe" />;
    }

    render(
      <ThemeProvider>
        <MountProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("probe")).toBeInTheDocument();
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it("provides theme context to consumers after mount", () => {
    function Consumer() {
      const { theme } = useTheme();
      return <div data-testid="theme">{theme}</div>;
    }

    render(
      <ThemeProvider defaultTheme="light">
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });
});
