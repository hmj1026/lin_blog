import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => {
  const prisma: any = {
    siteSetting: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    upload: {
      findMany: vi.fn(async () => []),
    },
    $executeRaw: vi.fn(),
  };
  // 以 mocked prisma 自身作為 transaction client（tx），讓 upsert 內的鎖與寫入落在同一組 mock 上。
  prisma.$transaction = vi.fn(async (cb: (tx: any) => Promise<unknown>) => cb(prisma));
  return { prisma };
});

// Import after mock
import { siteSettingsRepositoryPrisma } from "@/modules/site-settings/infrastructure/prisma/site-settings.repository.prisma";

describe("siteSettingsRepositoryPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSettings = {
    key: "default",
    showBlogLink: true,
    siteName: "Test Site",
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
  };

  describe("getByKey", () => {
    it("returns settings when found", async () => {
      (prisma.siteSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      const result = await siteSettingsRepositoryPrisma.getByKey("default");

      expect(result).not.toBeNull();
      expect(result?.siteName).toBe("Test Site");
      expect(prisma.siteSetting.findUnique).toHaveBeenCalledWith({
        where: { key: "default" },
      });
    });

    it("returns null when not found", async () => {
      (prisma.siteSetting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await siteSettingsRepositoryPrisma.getByKey("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates new settings record", async () => {
      (prisma.siteSetting.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      const result = await siteSettingsRepositoryPrisma.create({ key: "new-key" });

      expect(result).not.toBeNull();
      expect(prisma.siteSetting.create).toHaveBeenCalledWith({
        data: { key: "new-key" },
      });
    });
  });

  describe("upsert", () => {
    it("upserts settings record", async () => {
      const updateData = {
        key: "default",
        create: { siteName: "New Name" },
        update: { siteName: "Updated Name" },
      };

      const updatedSettings = { ...mockSettings, siteName: "Updated Name" };
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(updatedSettings);

      const result = await siteSettingsRepositoryPrisma.upsert(updateData);

      expect(result.siteName).toBe("Updated Name");
      expect(prisma.siteSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "default" },
          update: expect.objectContaining({ siteName: "Updated Name" }),
          create: expect.objectContaining({ siteName: "New Name" }),
        })
      );
    });

    it("於交易內先取得媒體引用共享 advisory lock 再寫入設定", async () => {
      // Hero/About 內容可能引用媒體；與媒體刪除的排他鎖互斥，避免寫入指向已軟刪除媒體。
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      await siteSettingsRepositoryPrisma.upsert({ key: "default", create: {}, update: { heroImage: "/api/files/up-1" } });

      const raw = prisma.$executeRaw as ReturnType<typeof vi.fn>;
      const sql = raw.mock.calls.map((call: unknown[]) => (call[0] as readonly string[]).join("?")).join("\n");
      expect(sql).toContain("pg_advisory_xact_lock_shared(");
      expect(raw.mock.invocationCallOrder[0]).toBeLessThan(
        (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
      );
    });

    it("拒絕寫入引用已軟刪除媒體的設定（取鎖後重驗）", async () => {
      (prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: "up-1" }]);

      await expect(
        siteSettingsRepositoryPrisma.upsert({ key: "default", create: {}, update: { heroImage: "/api/files/up-1" } })
      ).rejects.toThrow(/媒體已被刪除/);
      expect(prisma.siteSetting.upsert).not.toHaveBeenCalled();
    });
  });
});
