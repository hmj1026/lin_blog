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
  featuredTitle: string | null;
  featuredDesc: string | null;
  categoriesTitle: string | null;
  categoriesDesc: string | null;
  latestTitle: string | null;
  latestDesc: string | null;
  communityTitle: string | null;
  communityDesc: string | null;
  showNewsletter: boolean;
  newsletterTitle: string | null;
  newsletterDesc: string | null;
  showContact: boolean;
  contactTitle: string | null;
  contactDesc: string | null;
  showFacebook: boolean;
  facebookUrl: string | null;
  showInstagram: boolean;
  instagramUrl: string | null;
  showThreads: boolean;
  threadsUrl: string | null;
  showLine: boolean;
  lineUrl: string | null;
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
    featuredTitle: data.featuredTitle,
    featuredDesc: data.featuredDesc,
    categoriesTitle: data.categoriesTitle,
    categoriesDesc: data.categoriesDesc,
    latestTitle: data.latestTitle,
    latestDesc: data.latestDesc,
    communityTitle: data.communityTitle,
    communityDesc: data.communityDesc,
    showNewsletter: data.showNewsletter,
    newsletterTitle: data.newsletterTitle,
    newsletterDesc: data.newsletterDesc,
    showContact: data.showContact,
    contactTitle: data.contactTitle,
    contactDesc: data.contactDesc,
    showFacebook: data.showFacebook,
    facebookUrl: data.facebookUrl,
    showInstagram: data.showInstagram,
    instagramUrl: data.instagramUrl,
    showThreads: data.showThreads,
    threadsUrl: data.threadsUrl,
    showLine: data.showLine,
    lineUrl: data.lineUrl,
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
        featuredTitle: params.create.featuredTitle,
        featuredDesc: params.create.featuredDesc,
        categoriesTitle: params.create.categoriesTitle,
        categoriesDesc: params.create.categoriesDesc,
        latestTitle: params.create.latestTitle,
        latestDesc: params.create.latestDesc,
        communityTitle: params.create.communityTitle,
        communityDesc: params.create.communityDesc,
        showNewsletter: params.create.showNewsletter ?? false,
        newsletterTitle: params.create.newsletterTitle,
        newsletterDesc: params.create.newsletterDesc,
        showContact: params.create.showContact ?? false,
        contactTitle: params.create.contactTitle,
        contactDesc: params.create.contactDesc,
        showFacebook: params.create.showFacebook ?? false,
        facebookUrl: params.create.facebookUrl,
        showInstagram: params.create.showInstagram ?? false,
        instagramUrl: params.create.instagramUrl,
        showThreads: params.create.showThreads ?? false,
        threadsUrl: params.create.threadsUrl,
        showLine: params.create.showLine ?? false,
        lineUrl: params.create.lineUrl,
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
        featuredTitle: params.update.featuredTitle,
        featuredDesc: params.update.featuredDesc,
        categoriesTitle: params.update.categoriesTitle,
        categoriesDesc: params.update.categoriesDesc,
        latestTitle: params.update.latestTitle,
        latestDesc: params.update.latestDesc,
        communityTitle: params.update.communityTitle,
        communityDesc: params.update.communityDesc,
        showNewsletter: params.update.showNewsletter,
        newsletterTitle: params.update.newsletterTitle,
        newsletterDesc: params.update.newsletterDesc,
        showContact: params.update.showContact,
        contactTitle: params.update.contactTitle,
        contactDesc: params.update.contactDesc,
        showFacebook: params.update.showFacebook,
        facebookUrl: params.update.facebookUrl,
        showInstagram: params.update.showInstagram,
        instagramUrl: params.update.instagramUrl,
        showThreads: params.update.showThreads,
        threadsUrl: params.update.threadsUrl,
        showLine: params.update.showLine,
        lineUrl: params.update.lineUrl,
      },
    });
    return toRecord(result);
  },
};
