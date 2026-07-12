-- Data migration: 冪等佈建 subscribers:view 權限（v1.4.0 升級缺口）
-- 已跑過 seed/init-admin.js 的環境重跑安全（ON CONFLICT / NOT EXISTS）

INSERT INTO "Permission" ("key", "name")
VALUES ('subscribers:view', '訂閱者名單')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionKey")
SELECT gen_random_uuid()::text, r."id", 'subscribers:view'
FROM "Role" r
WHERE r."key" = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionKey" = 'subscribers:view'
  );

-- 遞增全域 permissionsVersion，使既有 JWT 於下次請求刷新權限
UPDATE "PermissionVersion"
SET "value" = "value" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global';
