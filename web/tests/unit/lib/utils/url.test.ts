import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("url utils", () => {
  describe("getSiteUrl", () => {
    beforeEach(() => {
      // 重置 module cache 以重新載入環境變數
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns NEXT_PUBLIC_SITE_URL when set", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
      vi.stubEnv("NODE_ENV", "production");
      
      // 動態 import 以獲取最新的環境變數
      const { getSiteUrl } = await import("@/lib/utils/url");
      expect(getSiteUrl()).toBe("https://example.com");
    });

    it("removes trailing slash from NEXT_PUBLIC_SITE_URL", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
      vi.stubEnv("NODE_ENV", "production");
      
      const { getSiteUrl } = await import("@/lib/utils/url");
      expect(getSiteUrl()).toBe("https://example.com");
    });

    it("returns localhost in development when NEXT_PUBLIC_SITE_URL is not set", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv("NODE_ENV", "development");
      
      const { getSiteUrl } = await import("@/lib/utils/url");
      expect(getSiteUrl()).toBe("http://localhost:3000");
    });

    it("throws error in production when NEXT_PUBLIC_SITE_URL is not set", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
      vi.stubEnv("NODE_ENV", "production");
      
      const { getSiteUrl } = await import("@/lib/utils/url");
      expect(() => getSiteUrl()).toThrow("NEXT_PUBLIC_SITE_URL");
    });
  });

  describe("getPostUrl", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("generates correct post URL", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
      vi.stubEnv("NODE_ENV", "production");
      
      const { getPostUrl } = await import("@/lib/utils/url");
      expect(getPostUrl("my-post")).toBe("https://example.com/blog/my-post");
    });

    it("handles slugs with special characters", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
      vi.stubEnv("NODE_ENV", "production");
      
      const { getPostUrl } = await import("@/lib/utils/url");
      expect(getPostUrl("我的文章")).toBe("https://example.com/blog/我的文章");
    });
  });
});
