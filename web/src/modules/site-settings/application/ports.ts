/**
 * 站點設定完整資料結構
 */
export type SiteSettingRecord = {
  showBlogLink: boolean;
  // 站點基本資訊
  siteName: string | null;
  siteTagline: string | null;
  siteDescription: string | null;
  contactEmail: string | null;
  copyrightText: string | null;
  // Hero 區塊
  heroBadge: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImage: string | null;
  // 統計數據
  statsArticles: string | null;
  statsSubscribers: string | null;
  statsRating: string | null;
  // Featured 區塊
  featuredTitle: string | null;
  featuredDesc: string | null;
  // Categories 區塊
  categoriesTitle: string | null;
  categoriesDesc: string | null;
  // Latest 區塊
  latestTitle: string | null;
  latestDesc: string | null;
  // Community 區塊
  communityTitle: string | null;
  communityDesc: string | null;
  // Newsletter
  showNewsletter: boolean;
  newsletterTitle: string | null;
  newsletterDesc: string | null;
  // Contact
  showContact: boolean;
  contactTitle: string | null;
  contactDesc: string | null;
  // Social Platforms
  showFacebook: boolean;
  facebookUrl: string | null;
  showInstagram: boolean;
  instagramUrl: string | null;
  showThreads: boolean;
  threadsUrl: string | null;
  showLine: boolean;
  lineUrl: string | null;
};

/**
 * 站點設定 Repository 介面
 */
export interface SiteSettingsRepository {
  getByKey(key: string): Promise<SiteSettingRecord | null>;
  create(params: { key: string }): Promise<SiteSettingRecord>;
  upsert(params: {
    key: string;
    create: Partial<SiteSettingRecord>;
    update: Partial<SiteSettingRecord>;
  }): Promise<SiteSettingRecord>;
}
