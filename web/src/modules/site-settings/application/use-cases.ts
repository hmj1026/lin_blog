import { z } from "zod";
import { siteSettingSchema } from "@/lib/validations/site-setting.schema";
import { DEFAULT_SITE_SETTING_KEY } from "../domain";
import type { SiteSettingRecord, SiteSettingsRepository } from "./ports";

export type SiteSettingsUseCases = ReturnType<typeof createSiteSettingsUseCases>;

export function createSiteSettingsUseCases(deps: { repo: SiteSettingsRepository }) {
  return {
    async getDefault(): Promise<SiteSettingRecord | null> {
      const setting = await deps.repo.getByKey(DEFAULT_SITE_SETTING_KEY);
      if (!setting) return null;
      return { showBlogLink: setting.showBlogLink };
    },

    async getOrCreateDefault(): Promise<SiteSettingRecord> {
      const existing = await deps.repo.getByKey(DEFAULT_SITE_SETTING_KEY);
      if (existing) return { showBlogLink: existing.showBlogLink };
      const created = await deps.repo.create({ key: DEFAULT_SITE_SETTING_KEY });
      return { showBlogLink: created.showBlogLink };
    },

    async updateDefault(payload: z.infer<typeof siteSettingSchema>): Promise<SiteSettingRecord> {
      const data = siteSettingSchema.parse(payload);
      const updated = await deps.repo.upsert({
        key: DEFAULT_SITE_SETTING_KEY,
        create: { showBlogLink: data.showBlogLink ?? true },
        update: { showBlogLink: data.showBlogLink },
      });
      return { showBlogLink: updated.showBlogLink };
    },
  };
}
