import { securityAdminUseCases } from "@/modules/security-admin";

export async function roleHasPermission(roleId: string, permissionKey: string) {
  return securityAdminUseCases.roleHasPermission(roleId, permissionKey);
}

export async function roleHasAnyPermission(roleId: string, permissionKeys: string[]) {
  return securityAdminUseCases.roleHasAnyPermission(roleId, permissionKeys);
}

export async function listRolePermissions(roleId: string) {
  return securityAdminUseCases.listRolePermissions(roleId);
}
