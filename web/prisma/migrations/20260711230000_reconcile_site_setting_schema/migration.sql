-- Reconcile SiteSetting columns introduced in the Prisma model after the
-- original SiteSetting migration. All additions are nullable or have a safe
-- false default so existing production rows remain valid.
ALTER TABLE "SiteSetting"
  ADD COLUMN IF NOT EXISTS "featuredTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "featuredDesc" TEXT,
  ADD COLUMN IF NOT EXISTS "categoriesTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "categoriesDesc" TEXT,
  ADD COLUMN IF NOT EXISTS "latestTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "latestDesc" TEXT,
  ADD COLUMN IF NOT EXISTS "communityTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "communityDesc" TEXT,
  ADD COLUMN IF NOT EXISTS "showFacebook" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "showInstagram" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "showThreads" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "threadsUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "showLine" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lineUrl" TEXT;
