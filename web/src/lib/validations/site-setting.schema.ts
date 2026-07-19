import { z } from "zod";

export const siteSettingSchema = z.object({
  // optional 讓表單可送出真正的 partial payload：僅傳送實際變動的欄位，
  // 避免分區儲存時無條件覆寫其他管理員剛改過的 showBlogLink。
  showBlogLink: z.boolean().optional(),
  // 站點基本資訊
  siteName: z.string().nullish(),
  siteTagline: z.string().nullish(),
  siteDescription: z.string().nullish(),
  contactEmail: z.string().email().nullish(),
  copyrightText: z.string().nullish(),
  // Hero 區塊
  heroBadge: z.string().nullish(),
  heroTitle: z.string().nullish(),
  heroSubtitle: z.string().nullish(),
  heroImage: z.string().nullish(),
  // 統計數據
  statsArticles: z.string().nullish(),
  statsSubscribers: z.string().nullish(),
  statsRating: z.string().nullish(),
  // Featured 區塊
  featuredTitle: z.string().nullish(),
  featuredDesc: z.string().nullish(),
  // Categories 區塊
  categoriesTitle: z.string().nullish(),
  categoriesDesc: z.string().nullish(),
  // Latest 區塊
  latestTitle: z.string().nullish(),
  latestDesc: z.string().nullish(),
  // Community 區塊
  communityTitle: z.string().nullish(),
  communityDesc: z.string().nullish(),
  // Newsletter
  showNewsletter: z.boolean().optional(),
  newsletterTitle: z.string().nullish(),
  newsletterDesc: z.string().nullish(),
  // Contact
  showContact: z.boolean().optional(),
  contactTitle: z.string().nullish(),
  contactDesc: z.string().nullish(),
  // Social Platforms
  showFacebook: z.boolean().optional(),
  facebookUrl: z.string().url().nullish().or(z.literal("")),
  showInstagram: z.boolean().optional(),
  instagramUrl: z.string().url().nullish().or(z.literal("")),
  showThreads: z.boolean().optional(),
  threadsUrl: z.string().url().nullish().or(z.literal("")),
  showLine: z.boolean().optional(),
  lineUrl: z.string().url().nullish().or(z.literal("")),
  showAbout: z.boolean().optional(),
});

export type SiteSettingInput = z.infer<typeof siteSettingSchema>;

export const aboutContentSchema = z.object({
  aboutTitle: z.string().nullish(),
  aboutContent: z.string().nullish(),
  aboutAllowRawHtml: z.boolean(),
  aboutShowRawHtmlToc: z.boolean(),
});

export type AboutContentInput = z.infer<typeof aboutContentSchema>;
