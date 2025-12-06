import { z } from "zod";

export const siteSettingSchema = z.object({
  showBlogLink: z.boolean(),
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
  // Newsletter
  showNewsletter: z.boolean().optional(),
  newsletterTitle: z.string().nullish(),
  newsletterDesc: z.string().nullish(),
  // Contact
  showContact: z.boolean().optional(),
  contactTitle: z.string().nullish(),
  contactDesc: z.string().nullish(),
});

export type SiteSettingInput = z.infer<typeof siteSettingSchema>;
