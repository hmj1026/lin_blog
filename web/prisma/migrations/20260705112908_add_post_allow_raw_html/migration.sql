-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "allowRawHtml" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PostVersion" ADD COLUMN     "allowRawHtml" BOOLEAN NOT NULL DEFAULT false;
