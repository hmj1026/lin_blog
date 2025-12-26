import bcrypt from "bcryptjs";
import { adminUserCreateSchema, adminUserUpdateSchema } from "@/lib/validations/admin-user.schema";
import { roleUpsertSchema } from "@/lib/validations/role.schema";
import type { SecurityAdminRepository } from "./ports";

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
    roleHasPermission: (roleId: string, permissionKey: string) => deps.repo.hasRolePermission({ roleId, permissionKey }),
    /**
     * 檢查角色是否擁有任一權限
     */
    roleHasAnyPermission: (roleId: string, permissionKeys: string[]) => deps.repo.hasRoleAnyPermission({ roleId, permissionKeys }),
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
      return deps.repo.createRole({ key: data.key, name: data.name, permissionKeys: data.permissionKeys });
    },

    /**
     * 更新角色
     */
    updateRole: (id: string, payload: unknown) => {
      const data = roleUpsertSchema.parse(payload);
      return deps.repo.updateRole({ id, key: data.key, name: data.name, permissionKeys: data.permissionKeys });
    },

    /** 軟刪除角色 */
    softDeleteRole: (id: string) => deps.repo.softDeleteRole(id),
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
      const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;
      return deps.repo.updateUser({ id, email: data.email, name: data.name, roleId: data.roleId, passwordHash });
    },

    /** 軟刪除使用者 */
    softDeleteUser: (id: string) => deps.repo.softDeleteUser(id),
    /** 計算活躍使用者總數 */
    countActiveUsers: () => deps.repo.countActiveUsers(),
  };
}

