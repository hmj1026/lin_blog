import { securityAdminUseCases } from "@/modules/security-admin";
import type { AppSession } from "./auth";

/** 根據已載入的 session 快取檢查是否擁有特定權限，避免 RSC 中重覆查詢資料庫 */
export function sessionHasPermission(session: AppSession, key: string): boolean {
  return !!session?.user?.permissions?.includes(key);
}

export async function roleHasPermission(roleId: string, permissionKey: string) {
  return securityAdminUseCases.roleHasPermission(roleId, permissionKey);
}

export async function roleHasAnyPermission(roleId: string, permissionKeys: string[]) {
  return securityAdminUseCases.roleHasAnyPermission(roleId, permissionKeys);
}

export async function listRolePermissions(roleId: string) {
  return securityAdminUseCases.listRolePermissions(roleId);
}
