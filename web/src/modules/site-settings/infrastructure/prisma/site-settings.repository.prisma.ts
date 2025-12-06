import { prisma } from "@/lib/db";
import type { SiteSettingsRepository, SiteSettingRecord } from "../../application/ports";

/**
 * 將 Prisma 結果轉換為 SiteSettingRecord
 */
function toRecord(data: {
  showBlogLink: boolean;
  siteName: string | null;
  siteTagline: string | null;
  siteDescription: string | null;
  contactEmail: string | null;
  copyrightText: string | null;
  heroBadge: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImage: string | null;
  statsArticles: string | null;
  statsSubscribers: string | null;
  statsRating: string | null;
  showNewsletter: boolean;
  newsletterTitle: string | null;
  newsletterDesc: string | null;
  showContact: boolean;
  contactTitle: string | null;
  contactDesc: string | null;
}): SiteSettingRecord {
  return {
    showBlogLink: data.showBlogLink,
    siteName: data.siteName,
    siteTagline: data.siteTagline,
    siteDescription: data.siteDescription,
    contactEmail: data.contactEmail,
    copyrightText: data.copyrightText,
    heroBadge: data.heroBadge,
    heroTitle: data.heroTitle,
    heroSubtitle: data.heroSubtitle,
    heroImage: data.heroImage,
    statsArticles: data.statsArticles,
    statsSubscribers: data.statsSubscribers,
    statsRating: data.statsRating,
    showNewsletter: data.showNewsletter,
    newsletterTitle: data.newsletterTitle,
    newsletterDesc: data.newsletterDesc,
    showContact: data.showContact,
    contactTitle: data.contactTitle,
    contactDesc: data.contactDesc,
  };
}

export const siteSettingsRepositoryPrisma: SiteSettingsRepository = {
  async getByKey(key) {
    const result = await prisma.siteSetting.findUnique({ where: { key } });
    if (!result) return null;
    return toRecord(result);
  },

  async create(params) {
    const result = await prisma.siteSetting.create({ data: { key: params.key } });
    return toRecord(result);
  },

  async upsert(params) {
    const result = await prisma.siteSetting.upsert({
      where: { key: params.key },
      create: {
        key: params.key,
        showBlogLink: params.create.showBlogLink ?? true,
        siteName: params.create.siteName,
        siteTagline: params.create.siteTagline,
        siteDescription: params.create.siteDescription,
        contactEmail: params.create.contactEmail,
        copyrightText: params.create.copyrightText,
        heroBadge: params.create.heroBadge,
        heroTitle: params.create.heroTitle,
        heroSubtitle: params.create.heroSubtitle,
        heroImage: params.create.heroImage,
        statsArticles: params.create.statsArticles,
        statsSubscribers: params.create.statsSubscribers,
        statsRating: params.create.statsRating,
        showNewsletter: params.create.showNewsletter ?? false,
        newsletterTitle: params.create.newsletterTitle,
        newsletterDesc: params.create.newsletterDesc,
        showContact: params.create.showContact ?? false,
        contactTitle: params.create.contactTitle,
        contactDesc: params.create.contactDesc,
      },
      update: {
        showBlogLink: params.update.showBlogLink,
        siteName: params.update.siteName,
        siteTagline: params.update.siteTagline,
        siteDescription: params.update.siteDescription,
        contactEmail: params.update.contactEmail,
        copyrightText: params.update.copyrightText,
        heroBadge: params.update.heroBadge,
        heroTitle: params.update.heroTitle,
        heroSubtitle: params.update.heroSubtitle,
        heroImage: params.update.heroImage,
        statsArticles: params.update.statsArticles,
        statsSubscribers: params.update.statsSubscribers,
        statsRating: params.update.statsRating,
        showNewsletter: params.update.showNewsletter,
        newsletterTitle: params.update.newsletterTitle,
        newsletterDesc: params.update.newsletterDesc,
        showContact: params.update.showContact,
        contactTitle: params.update.contactTitle,
        contactDesc: params.update.contactDesc,
      },
    });
    return toRecord(result);
  },
};
