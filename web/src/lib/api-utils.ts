import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "./auth";
import { ApiException } from "./errors";
import { ApiResponse } from "@/types/api";
import { logger } from "./logger";

/**
 * 後台存取門檻：所有後台 API 一律要求此權限，作為與 (admin) layout 對齊的共用門檻。
 * 避免僅授予單一領域權限（如 posts:write / uploads:write）卻缺後台存取權的角色，
 * 繞過 UI 守門直接呼叫 API。
 */
const ADMIN_ACCESS_PERMISSION = "admin:access";

/**
 * 建立成功的 JSON 回應
 *
 * @param data - 回應的資料內容
 * @param init - 回應的初始化選項 (status, headers 等)
 * @returns Next.js 的 JSON 回應物件
 */
export function jsonOk<T>(data: T, init?: ResponseInit) {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, init);
}

/**
 * 建立錯誤的 JSON 回應
 *
 * @param message - 錯誤訊息
 * @param status - HTTP 狀態碼 (預設 400)
 * @returns Next.js 的 JSON 回應物件
 */
export function jsonError(message: string, status = 400) {
  const body: ApiResponse<null> = { success: false, message };
  return NextResponse.json(body, { status });
}

/**
 * 統一處理 API 錯誤
 *
 * @param error - 捕獲到的錯誤物件
 * @returns 格式化後的 JSON 錯誤回應
 */
export function handleApiError(error: unknown) {
  if (error instanceof ApiException) {
    logger.warn("API Exception", { message: error.message, status: error.status });
    return jsonError(error.message, error.status);
  }
  if (error instanceof ZodError) {
    const message = error.errors.map((e) => e.message).join("; ") || "輸入驗證失敗";
    logger.warn("API Validation Error", { issues: error.errors });
    return jsonError(message, 400);
  }
  if (error instanceof Error) {
    // 非受控例外：完整細節僅記錄於伺服器端，client 只收到泛化訊息
    logger.error("API Error", { message: error.message, stack: error.stack });
    return jsonError("系統發生錯誤，請稍後再試", 500);
  }
  logger.error("Unknown API Error", { error });
  return jsonError("系統發生錯誤，請稍後再試", 500);
}

/**
 * 驗證請求是否已登入
 *
 * @returns 若未登入回傳 401 錯誤回應，否則回傳 null
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return jsonError("未授權", 401);
  }
  return null;
}

/**
 * 驗證請求是否擁有特定權限
 *
 * @param permissionKey - 權限鍵值
 * @returns 若無權限回傳 401/403 錯誤回應，否則回傳 null
 */
export async function requirePermission(permissionKey: string) {
  const session = await getSession();
  if (!session?.user) return jsonError("未授權", 401);
  const roleId = session.user.roleId;
  if (!roleId) return jsonError("禁止存取", 403);

  const permissions = session.user.permissions ?? [];
  // 先驗共用後台存取門檻，再驗目標權限，兩者缺一即拒絕。
  if (!permissions.includes(ADMIN_ACCESS_PERMISSION)) return jsonError("禁止存取", 403);
  if (!permissions.includes(permissionKey)) return jsonError("禁止存取", 403);
  return null;
}

/**
 * 驗證請求是否擁有任一權限
 *
 * @param permissionKeys - 權限鍵值陣列
 * @returns 若無權限回傳 401/403 錯誤回應，否則回傳 null
 */
export async function requireAnyPermission(permissionKeys: string[]) {
  const session = await getSession();
  if (!session?.user) return jsonError("未授權", 401);
  const roleId = session.user.roleId;
  if (!roleId) return jsonError("禁止存取", 403);

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(ADMIN_ACCESS_PERMISSION)) return jsonError("禁止存取", 403);
  if (!permissionKeys.some((k) => permissions.includes(k))) return jsonError("禁止存取", 403);
  return null;
}
