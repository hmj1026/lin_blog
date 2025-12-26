/**
 * 測試環境設定
 *
 * 設定測試所需的環境變數和全域擴展
 */

// 設定測試環境變數（在任何模組載入前）
process.env.NEXTAUTH_SECRET = "test-secret-for-unit-tests";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

