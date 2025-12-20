import { createSiteSettingsUseCases } from "./application/use-cases";
import { siteSettingsRepositoryPrisma } from "./infrastructure/prisma/site-settings.repository.prisma";

export type { SiteSettingRecord } from "./application/ports";

export const siteSettingsUseCases = createSiteSettingsUseCases({ repo: siteSettingsRepositoryPrisma });
