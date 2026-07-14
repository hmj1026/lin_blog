import { describe, it, expect, vi, beforeEach } from "vitest";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// SiteSetting 資料表的完整欄位（與 use-cases.ts 的 defaultRecord 對齊），
// 供 mock upsert/findUnique 回傳值使用，避免 toRecord() 讀取到 undefined 欄位。
function fullRow(overrides: Record<string, unknown> = {}) {
  return {
    key: "default",
    showBlogLink: true,
    siteName: null,
    siteTagline: null,
    siteDescription: null,
    contactEmail: null,
    copyrightText: null,
    heroBadge: null,
    heroTitle: null,
    heroSubtitle: null,
    heroImage: null,
    statsArticles: null,
    statsSubscribers: null,
    statsRating: null,
    featuredTitle: null,
    featuredDesc: null,
    categoriesTitle: null,
    categoriesDesc: null,
    latestTitle: null,
    latestDesc: null,
    communityTitle: null,
    communityDesc: null,
    showNewsletter: false,
    newsletterTitle: null,
    newsletterDesc: null,
    showContact: false,
    contactTitle: null,
    contactDesc: null,
    showFacebook: false,
    facebookUrl: null,
    showInstagram: false,
    instagramUrl: null,
    showThreads: false,
    threadsUrl: null,
    showLine: false,
    lineUrl: null,
    showAbout: false,
    aboutTitle: null,
    aboutContent: null,
    aboutAllowRawHtml: false,
    aboutShowRawHtmlToc: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("siteSettingsUseCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDefault", () => {
    it("回傳設定當設定存在", async () => {
      (prisma.siteSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        key: "default",
        showBlogLink: true,
      });

      const result = await siteSettingsUseCases.getDefault();
      expect(result).toEqual({ showBlogLink: true });
    });

    it("回傳 null 當設定不存在", async () => {
      (prisma.siteSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await siteSettingsUseCases.getDefault();
      expect(result).toBeNull();
    });
  });

  describe("getOrCreateDefault", () => {
    it("回傳現有設定", async () => {
      (prisma.siteSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        key: "default",
        showBlogLink: false,
      });

      const result = await siteSettingsUseCases.getOrCreateDefault();
      expect(result).toEqual({ showBlogLink: false });
      expect(prisma.siteSetting.create).not.toHaveBeenCalled();
    });

    it("建立並回傳新設定當設定不存在", async () => {
      (prisma.siteSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.siteSetting.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        key: "default",
        showBlogLink: true, // DB default
      });

      const result = await siteSettingsUseCases.getOrCreateDefault();
      expect(result).toEqual({ showBlogLink: true });
      expect(prisma.siteSetting.create).toHaveBeenCalledWith({
        data: { key: "default" },
      });
    });
  });

  describe("updateDefault", () => {
    it("更新設定", async () => {
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        key: "default",
        showBlogLink: false,
      });

      const result = await siteSettingsUseCases.updateDefault({ showBlogLink: false });
      expect(result).toEqual(expect.objectContaining({ showBlogLink: false }));
      expect(prisma.siteSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "default" },
          create: expect.objectContaining({ key: "default", showBlogLink: false }),
          update: expect.objectContaining({ showBlogLink: false }),
        })
      );
    });
    
    it("當輸入無效時拋出錯誤 (Zod validation is inside)", async () => {
      // @ts-expect-error test invalid input
      const verify = () => siteSettingsUseCases.updateDefault({ showBlogLink: "not-boolean" });
      await expect(verify).rejects.toThrow();
    });

    it("更新一般設定不清空 aboutContent", async () => {
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(fullRow());

      await siteSettingsUseCases.updateDefault({ showBlogLink: true, showAbout: true });

      // repo 層將 update 對映到 prisma 呼叫時，對每個欄位都會取
      // params.update.<col>；未提供的欄位其值為 undefined（Prisma 會忽略
      // undefined 欄位、不會實際寫入），藉此驗證一般設定儲存不會覆寫 aboutContent。
      const call = (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.update.aboutContent).toBeUndefined();
    });
  });

  describe("updateAboutContent", () => {
    it("只 upsert 內容四欄（部分 upsert）", async () => {
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(
        fullRow({ aboutTitle: "我的介紹", aboutContent: "<p>hi</p>" })
      );

      await siteSettingsUseCases.updateAboutContent({
        aboutTitle: "我的介紹",
        aboutContent: "<p>hi</p>",
        aboutAllowRawHtml: false,
        aboutShowRawHtmlToc: false,
      });

      expect(prisma.siteSetting.upsert).toHaveBeenCalled();
      const call = (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // repo 層對每個 SiteSetting 欄位都會取 params.update.<col>，故 update 物件
      // 的 key 一律涵蓋全部欄位；真正「只更新內容四欄」的語意展現在：其餘欄位的值
      // 皆為 undefined（Prisma 執行時會忽略 undefined，等同未寫入）。
      const definedKeys = Object.keys(call.update)
        .filter((k) => call.update[k] !== undefined)
        .sort();
      expect(definedKeys).toEqual(
        ["aboutAllowRawHtml", "aboutContent", "aboutShowRawHtmlToc", "aboutTitle"].sort()
      );
    });

    it("視覺模式用嚴格淨化剝除 <div>/<style>/<script>", async () => {
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(fullRow());

      await siteSettingsUseCases.updateAboutContent({
        aboutTitle: "標題",
        aboutContent: '<div style="color:red">A</div><script>alert(1)</script><p>ok</p>',
        aboutAllowRawHtml: false,
        aboutShowRawHtmlToc: false,
      });

      const call = (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const sanitized: string = call.update.aboutContent;
      expect(sanitized).not.toContain("<script");
      expect(sanitized).not.toContain("<div");
      expect(sanitized).not.toContain("style=");
      expect(sanitized).toContain("A");
      expect(sanitized).toContain("<p>ok</p>");
    });

    it("原始 HTML 模式用寬鬆淨化保留結構但仍移除 script/事件屬性", async () => {
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(fullRow());

      await siteSettingsUseCases.updateAboutContent({
        aboutTitle: "標題",
        aboutContent:
          '<div class="box">A</div><script>alert(1)</script><a href="/x" onclick="bad()">L</a>',
        aboutAllowRawHtml: true,
        aboutShowRawHtmlToc: false,
      });

      const call = (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const sanitized: string = call.update.aboutContent;
      expect(sanitized).toContain("<div");
      expect(sanitized).not.toContain("<script");
      expect(sanitized).not.toContain("onclick");
    });

    it("事件屬性在兩種模式一律移除", async () => {
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(fullRow());

      await siteSettingsUseCases.updateAboutContent({
        aboutTitle: "標題",
        aboutContent: '<p onmouseover="bad()">strict</p>',
        aboutAllowRawHtml: false,
        aboutShowRawHtmlToc: false,
      });
      const strictCall = (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(strictCall.update.aboutContent).not.toContain("onmouseover=");

      vi.clearAllMocks();
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(fullRow());

      await siteSettingsUseCases.updateAboutContent({
        aboutTitle: "標題",
        aboutContent: '<div onclick="bad()">raw</div>',
        aboutAllowRawHtml: true,
        aboutShowRawHtmlToc: false,
      });
      const rawCall = (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(rawCall.update.aboutContent).not.toContain("onclick=");
    });
  });
});
