export type SiteSettingRecord = {
  showBlogLink: boolean;
};

export interface SiteSettingsRepository {
  getByKey(key: string): Promise<{ key: string; showBlogLink: boolean } | null>;
  create(params: { key: string }): Promise<{ key: string; showBlogLink: boolean }>;
  upsert(params: {
    key: string;
    create: { showBlogLink: boolean };
    update: { showBlogLink: boolean };
  }): Promise<{ key: string; showBlogLink: boolean }>;
}
