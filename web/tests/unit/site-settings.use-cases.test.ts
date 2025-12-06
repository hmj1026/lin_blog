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
  });
});
