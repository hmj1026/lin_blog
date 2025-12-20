import type { AdminUserRecord, PermissionRecord, RoleRecord } from "../application/ports";

export type PermissionDto = {
  key: string;
  name: string;
  description: string | null;
};

export type RoleDto = {
  id: string;
  key: string;
  name: string;
  permissionKeys: string[];
};

export type UserAdminRowDto = {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  deletedAt: string | null;
};

export function toPermissionDto(record: PermissionRecord): PermissionDto {
  return { key: record.key, name: record.name, description: record.description };
}

export function toRoleDto(record: RoleRecord): RoleDto {
  return { id: record.id, key: record.key, name: record.name, permissionKeys: record.permissionKeys };
}

export function toUserAdminRowDto(record: AdminUserRecord): UserAdminRowDto {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    roleId: record.roleId,
    roleKey: record.role.key,
    roleName: record.role.name,
    deletedAt: record.deletedAt ? record.deletedAt.toISOString() : null,
  };
}

