-- CreateTable
CREATE TABLE "PermissionVersion" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionVersion_pkey" PRIMARY KEY ("id")
);

-- Seed the single global counter row
INSERT INTO "PermissionVersion" ("id", "value", "updatedAt") VALUES ('global', 0, CURRENT_TIMESTAMP);
