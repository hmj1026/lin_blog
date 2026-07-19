import bcrypt from "bcryptjs";
import { adminUserCreateSchema, adminUserUpdateSchema } from "@/lib/validations/admin-user.schema";
import { roleUpsertSchema } from "@/lib/validations/role.schema";
import type { SecurityAdminRepository } from "./ports";
import {
  roleHasPermission as roleHasPermissionRule,
  roleHasAnyPermission as roleHasAnyPermissionRule,
} from "../domain/rules";
import { permissionDependencyViolations } from "../domain/permission-dependencies";
import { badRequest, conflict } from "@/lib/errors";

const ADMIN_ACCESS_PERMISSION = "admin:access";

/**
 * 伺服器端強制驗證權限相依性；集合缺少相依權限時擲出 400 錯誤，
 * 讓直接呼叫 API 也無法繞過前端的相依性阻擋。
 */
function assertPermissionDependencies(permissionKeys: string[]): void {
  const violations = permissionDependencyViolations(permissionKeys);
  if (violations.length > 0) {
    const detail = violations.map((v) => `${v.permissionKey} 需要先啟用 ${v.requires}`).join("；");
    throw badRequest(`權限相依性不完整：${detail}`);
  }
}

export type SecurityAdminUseCases = ReturnType<typeof createSecurityAdminUseCases>;

/**
 * 建立資安管理模組的 Use Cases
 * 包含角色權限管理與後台使用者管理
 * 
 * @param deps - 依賴的 Repositories
 */
export function createSecurityAdminUseCases(deps: { repo: SecurityAdminRepository }) {
  return {
    /**
     * 檢查角色是否擁有特定權限
     */
    roleHasPermission: async (roleId: string, permissionKey: string) =>
      roleHasPermissionRule(await deps.repo.getRoleAccessState(roleId), permissionKey),
    /**
     * 檢查角色是否擁有任一權限
     */
    roleHasAnyPermission: async (roleId: string, permissionKeys: string[]) =>
      roleHasAnyPermissionRule(await deps.repo.getRoleAccessState(roleId), permissionKeys),
    /** 列出角色的所有權限 key */
    listRolePermissions: (roleId: string) => deps.repo.listRolePermissionKeys(roleId),

    /**
     * 取得所有角色與權限列表 (用於權限管理介面)
     */
    listRolesAndPermissions: async () => {
      const [roles, permissions] = await Promise.all([deps.repo.listRolesWithPermissions(), deps.repo.listPermissions()]);
      return { roles, permissions };
    },

    /**
     * 建立新角色
     */
    createRole: (payload: unknown) => {
      const data = roleUpsertSchema.parse(payload);
      assertPermissionDependencies(data.permissionKeys);
      return deps.repo.createRole({ key: data.key, name: data.name, permissionKeys: data.permissionKeys });
    },

    /**
     * 更新角色
     */
    updateRole: async (id: string, payload: unknown) => {
      const data = roleUpsertSchema.parse(payload);
      assertPermissionDependencies(data.permissionKeys);
      const current = await deps.repo.getRoleAccessState(id);
      const removesAdminAccess =
        roleHasPermissionRule(current, ADMIN_ACCESS_PERMISSION) &&
        !data.permissionKeys.includes(ADMIN_ACCESS_PERMISSION);
      if (removesAdminAccess) {
        const [roleUserCount, administratorCount] = await Promise.all([
          deps.repo.countActiveUsersForRole(id),
          deps.repo.countActiveUsersWithPermission(ADMIN_ACCESS_PERMISSION),
        ]);
        if (administratorCount <= roleUserCount) {
          throw conflict("至少需要保留一位啟用中的管理者");
        }
      }
      // 前置檢查給出友善的即時錯誤；enforceAdminFloor 讓 repo 於交易內原子重驗，
      // 關閉兩個請求同時通過前置檢查、最終移除所有管理者的競態窗口。
      return deps.repo.updateRole({ id, key: data.key, name: data.name, permissionKeys: data.permissionKeys, enforceAdminFloor: removesAdminAccess });
    },

    /** 軟刪除角色 */
    softDeleteRole: async (id: string) => {
      const assignedUserCount = await deps.repo.countActiveUsersForRole(id);
      if (assignedUserCount > 0) {
        throw conflict(`此角色仍有 ${assignedUserCount} 位啟用中的使用者，請先重新指派`);
      }
      return deps.repo.softDeleteRole(id);
    },
    /** 取得所有活躍角色（未刪除） */
    listActiveRoles: () => deps.repo.listActiveRoles(),

    /**
     * 取得後台使用者列表
     */
    listUsers: (params?: { includeDeleted?: boolean }) => deps.repo.listUsersWithRoles({ includeDeleted: params?.includeDeleted ?? false }),

    /**
     * 建立後台使用者
     */
    createUser: async (payload: unknown) => {
      const data = adminUserCreateSchema.parse(payload);
      const passwordHash = await bcrypt.hash(data.password, 10);
      return deps.repo.createUser({ email: data.email, passwordHash, name: data.name, roleId: data.roleId });
    },

    /**
     * 更新後台使用者
     */
    updateUser: async (id: string, payload: unknown) => {
      const data = adminUserUpdateSchema.parse(payload);
      const [currentlyAdmin, targetRole] = await Promise.all([
        deps.repo.userHasPermission(id, ADMIN_ACCESS_PERMISSION),
        deps.repo.getRoleAccessState(data.roleId),
      ]);
      const removesAdminAccess = currentlyAdmin && !roleHasPermissionRule(targetRole, ADMIN_ACCESS_PERMISSION);
      if (removesAdminAccess) {
        const administratorCount = await deps.repo.countActiveUsersWithPermission(ADMIN_ACCESS_PERMISSION);
        if (administratorCount <= 1) {
          throw conflict("至少需要保留一位啟用中的管理者");
        }
      }
      const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;
      // enforceAdminFloor 讓 repo 於交易內原子重驗，避免並行降權移除最後一位管理者。
      return deps.repo.updateUser({ id, email: data.email, name: data.name, roleId: data.roleId, passwordHash, enforceAdminFloor: removesAdminAccess });
    },

    /** 軟刪除使用者 */
    softDeleteUser: async (id: string, context?: { actorId?: string }) => {
      if (context?.actorId === id) {
        throw conflict("無法停用目前登入的帳號");
      }
      const isAdmin = await deps.repo.userHasPermission(id, ADMIN_ACCESS_PERMISSION);
      if (isAdmin) {
        const administratorCount = await deps.repo.countActiveUsersWithPermission(ADMIN_ACCESS_PERMISSION);
        if (administratorCount <= 1) {
          throw conflict("至少需要保留一位啟用中的管理者");
        }
      }
      // enforceAdminFloor 讓 repo 於交易內原子重驗，避免並行停用移除最後一位管理者。
      return deps.repo.softDeleteUser(id, { enforceAdminFloor: isAdmin });
    },
    /** 計算活躍使用者總數 */
    countActiveUsers: () => deps.repo.countActiveUsers(),

    /** 取得全域權限版本號 */
    getPermissionsVersion: () => deps.repo.getPermissionsVersion(),
    /** 取得使用者當前的授權快照（角色與權限） */
    getUserAuthSnapshot: (userId: string) => deps.repo.getUserAuthSnapshot(userId),
  };
}
