-- AlterTable: add About Me page fields to SiteSetting (backward compatible; all new columns have defaults or are nullable)
ALTER TABLE "SiteSetting" ADD COLUMN     "aboutAllowRawHtml" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aboutContent" TEXT,
ADD COLUMN     "aboutShowRawHtmlToc" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aboutTitle" TEXT,
ADD COLUMN     "showAbout" BOOLEAN NOT NULL DEFAULT false;
