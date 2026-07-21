/**
 * 權限相依定義的純規則（無 Prisma/React/Next 依賴）。
 *
 * 某些權限必須搭配其他權限才有意義或才安全，例如「文章統計（IP/UA）」屬敏感資料，
 * 必須先具備後台存取與一般文章統計權限。此檔案是 UI（角色管理介面）與 Use Case
 * （伺服器端寫入）共用的單一事實來源（SSOT），避免僅在前端阻擋、後端 API 被直接繞過。
 */

import { ADMIN_ACCESS_PERMISSION } from "./permissions";

/** 權限鍵值 → 其必須先具備的相依權限鍵值清單。 */
export const PERMISSION_DEPENDENCIES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "analytics:view_sensitive": [ADMIN_ACCESS_PERMISSION, "analytics:view"],
});

/** 單一未滿足的相依關係：`permissionKey` 需要但缺少 `requires`。 */
export type PermissionDependencyViolation = { permissionKey: string; requires: string };

/**
 * 檢查權限集合中，是否有已授予的權限缺少其宣告的相依權限。
 *
 * 僅檢查 {@link PERMISSION_DEPENDENCIES} 明確宣告者；未宣告相依的權限一律視為合法。
 *
 * @param permissionKeys - 欲授予角色的完整權限鍵值集合
 * @returns 缺少的相依關係清單；集合合法時為空陣列
 */
export function permissionDependencyViolations(
  permissionKeys: readonly string[]
): PermissionDependencyViolation[] {
  const granted = new Set(permissionKeys);
  const violations: PermissionDependencyViolation[] = [];
  for (const permissionKey of permissionKeys) {
    for (const requires of PERMISSION_DEPENDENCIES[permissionKey] ?? []) {
      if (!granted.has(requires)) violations.push({ permissionKey, requires });
    }
  }
  return violations;
}
