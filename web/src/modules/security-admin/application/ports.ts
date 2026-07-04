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
  updateRole(params: { id: string; key: string; name: string; permissionKeys: string[] }): Promise<RoleRecord>;
  softDeleteRole(id: string): Promise<{ id: string }>;
  listActiveRoles(): Promise<RoleSummary[]>;

  listUsersWithRoles(params: { includeDeleted: boolean }): Promise<AdminUserRecord[]>;
  createUser(params: { email: string; passwordHash: string; name?: string | null; roleId: string }): Promise<AdminUserRecord>;
  updateUser(params: {
    id: string;
    email: string;
    name?: string | null;
    roleId: string;
    passwordHash?: string;
  }): Promise<AdminUserRecord>;
  softDeleteUser(id: string): Promise<AdminUserRecord>;
  countActiveUsers(): Promise<number>;

  getPermissionsVersion(): Promise<number>;
  getUserAuthSnapshot(userId: string): Promise<{ roleId: string; roleKey: string; roleName: string; permissionKeys: string[] } | null>;
}

