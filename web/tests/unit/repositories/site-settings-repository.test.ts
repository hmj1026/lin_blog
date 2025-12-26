import { describe, it, expect, vi, beforeEach } from "vitest";
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
  });
});
