import { prisma } from "@/lib/db";
import type { SiteSettingsRepository } from "../../application/ports";

export const siteSettingsRepositoryPrisma: SiteSettingsRepository = {
  getByKey: (key) => prisma.siteSetting.findUnique({ where: { key } }),
  create: (params) => prisma.siteSetting.create({ data: { key: params.key } }),
  upsert: (params) =>
    prisma.siteSetting.upsert({
      where: { key: params.key },
      create: { key: params.key, showBlogLink: params.create.showBlogLink },
      update: { showBlogLink: params.update.showBlogLink },
    }),
};
