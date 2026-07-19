/**
 * security-admin 模組的 client-safe 公開介面：僅限純 domain 邏輯與型別。
 *
 * 「use client」元件需要與伺服器共用同一份規則（SSOT）時，一律從本 barrel 匯入；
 * 本檔案 MUST NOT 匯入 server-only、Prisma 或模組組合根（index.ts）。
 * 伺服器端請改用 `@/modules/security-admin`。
 */
export {
  PERMISSION_DEPENDENCIES,
  permissionDependencyViolations,
} from "./domain/permission-dependencies";
export type { PermissionDependencyViolation } from "./domain/permission-dependencies";
