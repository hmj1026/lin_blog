-- Reconcile SiteSetting columns introduced in the Prisma model after the
-- original SiteSetting migration. All additions are nullable or have a safe
-- false default so existing production rows remain valid.
ALTER TABLE "SiteSetting"
  ADD COLUMN "featuredTitle" TEXT,
  ADD COLUMN "featuredDesc" TEXT,
  ADD COLUMN "categoriesTitle" TEXT,
  ADD COLUMN "categoriesDesc" TEXT,
  ADD COLUMN "latestTitle" TEXT,
  ADD COLUMN "latestDesc" TEXT,
  ADD COLUMN "communityTitle" TEXT,
  ADD COLUMN "communityDesc" TEXT,
  ADD COLUMN "showFacebook" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "facebookUrl" TEXT,
  ADD COLUMN "showInstagram" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "showThreads" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "threadsUrl" TEXT,
  ADD COLUMN "showLine" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lineUrl" TEXT;
