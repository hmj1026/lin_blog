-- 建立 365 天保存的後台高風險操作稽核事件。
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");
CREATE INDEX "AuditEvent_resourceType_resourceId_createdAt_idx" ON "AuditEvent"("resourceType", "resourceId", "createdAt");
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- 冪等佈建專用 audit:view 權限；EDITOR 白名單不會取得此權限。
INSERT INTO "Permission" ("key", "name")
VALUES ('audit:view', '活動紀錄')
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name";

INSERT INTO "RolePermission" ("id", "roleId", "permissionKey")
SELECT gen_random_uuid()::text, r."id", 'audit:view'
FROM "Role" r
WHERE r."key" = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionKey" = 'audit:view'
  );

INSERT INTO "PermissionVersion" ("id", "value", "updatedAt")
VALUES ('global', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
SET "value" = "PermissionVersion"."value" + 1, "updatedAt" = CURRENT_TIMESTAMP;
