import { z } from "zod";
import { siteSettingSchema } from "@/lib/validations/site-setting.schema";
import { DEFAULT_SITE_SETTING_KEY } from "../domain";
import type { SiteSettingRecord, SiteSettingsRepository } from "./ports";

// 安全的 cache 包裝，當 React.cache 不可用時（如測試環境）提供 fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeCache = <T extends (...args: any[]) => any>(fn: T): T => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cache } = require("react");
    if (typeof cache === "function") {
      return cache(fn);
    }
  } catch {
    // React.cache 不可用，返回原函數
  }
  return fn;
};

export type SiteSettingsUseCases = ReturnType<typeof createSiteSettingsUseCases>;

/**
 * 站點設定預設值
 */
const defaultRecord: SiteSettingRecord = {
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
  // Social Platforms
  showFacebook: false,
  facebookUrl: null,
  showInstagram: false,
  instagramUrl: null,
  showThreads: false,
  threadsUrl: null,
  showLine: false,
  lineUrl: null,
};

export function createSiteSettingsUseCases(deps: { repo: SiteSettingsRepository }) {
  /**
   * 取得預設站點設定（使用 React.cache 實現請求級去重）
   * 同一請求中多次調用只會執行一次實際查詢
   */
  const getDefault = safeCache(async (): Promise<SiteSettingRecord | null> => {
    const setting = await deps.repo.getByKey(DEFAULT_SITE_SETTING_KEY);
    if (!setting) return null;
    return setting;
  });

  return {
    getDefault,

    /**
     * 取得預設站點設定，若不存在則建立
     */
    async getOrCreateDefault(): Promise<SiteSettingRecord> {
      const existing = await deps.repo.getByKey(DEFAULT_SITE_SETTING_KEY);
      if (existing) return existing;
      const created = await deps.repo.create({ key: DEFAULT_SITE_SETTING_KEY });
      return created;
    },

    /**
     * 更新預設站點設定
     */
    async updateDefault(payload: z.infer<typeof siteSettingSchema>): Promise<SiteSettingRecord> {
      const data = siteSettingSchema.parse(payload);
      const updated = await deps.repo.upsert({
        key: DEFAULT_SITE_SETTING_KEY,
        create: { ...defaultRecord, ...data },
        update: data,
      });
      return updated;
    },
  };
}
