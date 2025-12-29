import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Metadata } from "next";

// Mock modules before importing
vi.mock("@/lib/utils/url", () => ({
  getSiteUrl: vi.fn(() => "https://example.com"),
}));

vi.mock("@/modules/site-settings", () => ({
  siteSettingsUseCases: {
    getDefault: vi.fn(),
  },
}));

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Inter: vi.fn(() => ({ variable: "font-sans" })),
  Sen: vi.fn(() => ({ variable: "font-display" })),
}));

// Mock CSS
vi.mock("./globals.css", () => ({}));


describe("layout generateMetadata", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("當資料庫有站點設定時", () => {
    it("使用資料庫中的 siteName 和 siteTagline", async () => {
      const { siteSettingsUseCases } = await import("@/modules/site-settings");
      (siteSettingsUseCases.getDefault as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteName: "我的部落格",
        siteTagline: "分享技術心得",
        siteDescription: "這是網站描述",
      });

      const { generateMetadata } = await import("@/app/layout");
      const metadata = await generateMetadata() as Metadata;

      expect(metadata.title).toBe("我的部落格 | 分享技術心得");
      expect(metadata.description).toBe("這是網站描述");
    });

    it("使用正確的 metadataBase URL", async () => {
      const { siteSettingsUseCases } = await import("@/modules/site-settings");
      (siteSettingsUseCases.getDefault as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteName: "Test Blog",
        siteTagline: "Test Tagline",
        siteDescription: "Test Description",
      });

      const { generateMetadata } = await import("@/app/layout");
      const metadata = await generateMetadata() as Metadata;

      expect(metadata.metadataBase?.toString()).toBe("https://example.com/");
    });
  });

  describe("當資料庫沒有站點設定時", () => {
    it("使用預設的 siteName、siteTagline 和 siteDescription", async () => {
      const { siteSettingsUseCases } = await import("@/modules/site-settings");
      (siteSettingsUseCases.getDefault as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { generateMetadata } = await import("@/app/layout");
      const metadata = await generateMetadata() as Metadata;

      expect(metadata.title).toBe("Lin Blog | 內容策略、設計與社群洞察");
      expect(metadata.description).toBe(
        "以社群為核心的繁體中文部落格，分享內容策略、設計實務、Newsletter 與社群營運心法。"
      );
    });
  });

  describe("當資料庫拋出錯誤時", () => {
    it("捕捉錯誤並使用預設值", async () => {
      const { siteSettingsUseCases } = await import("@/modules/site-settings");
      // 模擬 DB 連線失敗
      (siteSettingsUseCases.getDefault as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB Connection Failed"));
      
      // 監聽 console.warn 以避免測試輸出雜訊，並驗證是否被呼叫
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { generateMetadata } = await import("@/app/layout");
      const metadata = await generateMetadata() as Metadata;

      // 驗證是否使用了預設值
      expect(metadata.title).toBe("Lin Blog | 內容策略、設計與社群洞察");
      
      // 驗證錯誤有被捕捉並記錄
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch site settings for metadata:", 
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("當部分設定為 null 時", () => {
    it("對缺失欄位使用預設值", async () => {
      const { siteSettingsUseCases } = await import("@/modules/site-settings");
      (siteSettingsUseCases.getDefault as ReturnType<typeof vi.fn>).mockResolvedValue({
        siteName: "Custom Name",
        siteTagline: null, // 缺失
        siteDescription: null, // 缺失
      });

      const { generateMetadata } = await import("@/app/layout");
      const metadata = await generateMetadata() as Metadata;

      expect(metadata.title).toBe("Custom Name | 內容策略、設計與社群洞察");
      expect(metadata.description).toBe(
        "以社群為核心的繁體中文部落格，分享內容策略、設計實務、Newsletter 與社群營運心法。"
      );
    });
  });
});
