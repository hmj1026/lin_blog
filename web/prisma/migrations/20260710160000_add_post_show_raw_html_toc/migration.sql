-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "showRawHtmlToc" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PostVersion" ADD COLUMN     "showRawHtmlToc" BOOLEAN NOT NULL DEFAULT false;
