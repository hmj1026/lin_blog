import type { RoleAccessState } from "../domain/rules";

export type PermissionRecord = {
  key: string;
  name: string;
  description: string | null;
};

export type RoleRecord = {
  id: string;
  key: string;
  name: string;
  permissionKeys: string[];
  activeUserCount: number;
};

export type RoleSummary = {
  id: string;
  key: string;
  name: string;
};

export type UserRoleRecord = {
  id: string;
  key: string;
  name: string;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  role: UserRoleRecord;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface SecurityAdminRepository {
  getRoleAccessState(roleId: string): Promise<RoleAccessState | null>;
  listRolePermissionKeys(roleId: string): Promise<string[]>;

  listRolesWithPermissions(): Promise<RoleRecord[]>;
  listPermissions(): Promise<PermissionRecord[]>;
  createRole(params: { key: string; name: string; permissionKeys: string[] }): Promise<RoleRecord>;
  // enforceAdminFloor：於同一交易內以可序列化隔離等級確保操作後仍保留至少一位管理者，
  // 關閉「並行降權/停用移除最後管理者」的競態窗口（use-case 判斷是否需要，repo 原子強制）。
  updateRole(params: { id: string; key: string; name: string; permissionKeys: string[]; enforceAdminFloor?: boolean }): Promise<RoleRecord>;
  softDeleteRole(id: string): Promise<{ id: string }>;
  countActiveUsersForRole(roleId: string): Promise<number>;
  listActiveRoles(): Promise<RoleSummary[]>;

  listUsersWithRoles(params: { includeDeleted: boolean }): Promise<AdminUserRecord[]>;
  createUser(params: { email: string; passwordHash: string; name?: string | null; roleId: string }): Promise<AdminUserRecord>;
  updateUser(params: {
    id: string;
    email: string;
    name?: string | null;
    roleId: string;
    passwordHash?: string;
    enforceAdminFloor?: boolean;
  }): Promise<AdminUserRecord>;
  softDeleteUser(id: string, options?: { enforceAdminFloor?: boolean }): Promise<AdminUserRecord>;
  countActiveUsers(): Promise<number>;
  userHasPermission(userId: string, permissionKey: string): Promise<boolean>;
  countActiveUsersWithPermission(permissionKey: string): Promise<number>;

  getPermissionsVersion(): Promise<number>;
  getUserAuthSnapshot(userId: string): Promise<{ email: string; name: string | null; roleId: string; roleKey: string; roleName: string; permissionKeys: string[] } | null>;
}
