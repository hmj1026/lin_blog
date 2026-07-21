-- Data migration: requirePermission/requireAnyPermission 新增全域 admin:access 前置檢查後，
-- 回補既有角色的 admin:access 權限，避免僅授予單一領域權限（如 subscribers:view）卻未勾選
-- 「後台存取」的既有角色，在此次部署後被鎖死既有 API 呼叫。
-- 已跑過 seed/init-admin.js 的環境重跑安全（NOT EXISTS）

INSERT INTO "Permission" ("key", "name")
VALUES ('admin:access', '後台存取')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionKey")
SELECT gen_random_uuid()::text, r."id", 'admin:access'
FROM "Role" r
WHERE EXISTS (
    SELECT 1 FROM "RolePermission" rp2 WHERE rp2."roleId" = r."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id" AND rp."permissionKey" = 'admin:access'
  );

-- 遞增全域 permissionsVersion，使既有 JWT 於下次請求刷新權限
UPDATE "PermissionVersion"
SET "value" = "value" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global';
