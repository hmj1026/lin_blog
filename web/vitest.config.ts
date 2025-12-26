import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/mocks/server-only.ts"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["tests/**/*.{test,spec}.ts?(x)"],
    exclude: ["tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/test/**",
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx",
        // 環境配置 - 不需單元測試
        "src/env.ts",
        "src/middleware.ts",
        // 模組匯出入口 - 僅重新匯出
        "src/modules/**/index.ts",
        // 介面定義 - 無實作邏輯
        "src/modules/**/ports.ts",
        // DTO 型別定義
        "src/modules/**/dto.ts",
        // Domain index 匯出
        "src/modules/**/domain/index.ts",
        // 開發工具
        "src/components/dev/**",
        // TypeScript 型別檔案
        "src/types/**",
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
});
