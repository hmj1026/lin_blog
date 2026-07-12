import { defineConfig } from "vitest/config";
import path from "path";

/**
 * 真實 DB 整合測試設定。
 *
 * 與預設 `vitest.config.ts` 分離，避免這些測試在 `npm run test`（CI 無
 * postgres 可用）中被誤跑。`fileParallelism: false` 是刻意的：熱門文章
 * 30 日聚合測試會查詢整張 PostViewEvent／Post table，多個測試檔並行會
 * 互相污染彼此的聚合結果，因此改為序列執行整個測試檔，讓每個檔案獨佔
 * 測試資料庫直到 truncate 完成。
 */
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
    environment: "node",
    globalSetup: "./tests/integration/global-setup.ts",
    setupFiles: "./tests/integration/setup.ts",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    coverage: {
      enabled: false,
    },
  },
});
