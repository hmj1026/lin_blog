/**
 * 角色存取控制的純規則函式。
 * infrastructure 只回傳原始資料，語意判斷（軟刪除角色一律視為無權限）集中於此，
 * 可不依賴 Prisma 獨立單元測試。
 */

/** repository 回傳的原始角色存取狀態（未做任何有效性判斷） */
export type RoleAccessState = {
  deletedAt: Date | null;
  permissionKeys: string[];
};

/** 角色是否有效（存在且未被軟刪除） */
export function isRoleActive(role: RoleAccessState | null): role is RoleAccessState {
  return role !== null && role.deletedAt === null;
}

/** 角色是否擁有特定權限（軟刪除角色一律視為無權限） */
export function roleHasPermission(role: RoleAccessState | null, permissionKey: string): boolean {
  return isRoleActive(role) && role.permissionKeys.includes(permissionKey);
}

/** 角色是否擁有任一權限（軟刪除角色一律視為無權限） */
export function roleHasAnyPermission(role: RoleAccessState | null, permissionKeys: string[]): boolean {
  return isRoleActive(role) && permissionKeys.some((key) => role.permissionKeys.includes(key));
}
