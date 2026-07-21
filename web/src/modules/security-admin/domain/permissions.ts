/**
 * 後台存取門檻權限鍵值的單一事實來源（SSOT）。
 * 所有後台 API 一律要求此權限，避免僅授予單一領域權限（如 posts:write）
 * 卻缺後台存取權的角色繞過 UI 守門直接呼叫 API。
 */
export const ADMIN_ACCESS_PERMISSION = "admin:access";
